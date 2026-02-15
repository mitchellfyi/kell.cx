#!/usr/bin/env node
/**
 * Generate AI-powered insights from collected data
 * Uses Claude API to analyze trends and surface key takeaways
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'insights.json');

// Claude API config
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function loadJson(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    return null;
  }
}

async function callClaude(prompt, maxTokens = 1000) {
  if (!ANTHROPIC_API_KEY) {
    console.error('Warning: ANTHROPIC_API_KEY not set, using fallback insights');
    return null;
  }

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.content && result.content[0]) {
            resolve(result.content[0].text);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.write(data);
    req.end();
  });
}

function generateFallbackInsights(data) {
  const insights = {
    vscode: [],
    releases: [],
    news: [],
    social: [],
    trending: [],
  };

  // VS Code insights
  if (data.vscode && data.vscode.extensions) {
    const top = data.vscode.extensions[0];
    const total = data.vscode.totalInstalls;
    insights.vscode.push(`${top?.name || 'GitHub Copilot'} leads with ${formatNumber(top?.installs || 0)} installs`);
    insights.vscode.push(`Total installs across tracked extensions: ${formatNumber(total)}`);
  }

  // Release insights  
  if (data.releases && data.releases.recentReleases) {
    const thisWeek = data.releases.recentReleases.filter(r => 
      new Date(r.publishedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    insights.releases.push(`${thisWeek.length} releases in the past week`);
    if (thisWeek[0]) {
      insights.releases.push(`Latest: ${thisWeek[0].company} ${thisWeek[0].tag}`);
    }
  }

  // HN insights
  if (data.hn && data.hn.stories) {
    const totalPoints = data.hn.stories.reduce((sum, s) => sum + s.points, 0);
    const topStory = data.hn.stories[0];
    insights.news.push(`${data.hn.stories.length} AI-related stories on HN (${formatNumber(totalPoints)} total points)`);
    if (topStory) {
      insights.news.push(`Top story: "${truncate(topStory.title, 60)}" (${topStory.points} pts)`);
    }
  }

  return insights;
}

async function generateInsights() {
  console.error('Generating insights from collected data...\n');

  // Load all data sources
  const data = {
    vscode: loadJson('vscode-stats.json') || loadJson('../site/data/vscode-stats.json'),
    releases: loadJson('github-releases.json'),
    hn: loadJson('hn-ai-mentions.json'),
    news: loadJson('latest-news.json'),
    pricing: loadJson('pricing.json'),
    trending: loadJson('github-trending.json'),
    masterList: loadJson('master-list.json'),
  };

  // Build context for Claude
  const context = `
You are an AI analyst generating daily insights for kell.cx, a competitive intelligence service for AI coding tools.

Today's data:

VS Code Extensions (${data.vscode?.extensions?.length || 0} tracked):
${data.vscode?.extensions?.slice(0, 10).map(e => `- ${e.name}: ${formatNumber(e.installs)} installs, ${e.averageRating?.toFixed(1)} rating`).join('\n') || 'No data'}

Recent Releases (last 7 days):
${data.releases?.recentReleases?.slice(0, 10).map(r => `- ${r.company} ${r.tag} (${new Date(r.publishedAt).toLocaleDateString()})`).join('\n') || 'No data'}

Hacker News (top stories):
${data.hn?.stories?.slice(0, 5).map(s => `- "${s.title}" (${s.points} pts, ${s.comments} comments)`).join('\n') || 'No data'}

Generate 3-5 bullet point insights for each category. Be specific with numbers. Identify trends, surprises, and notable changes. Keep each insight to 1-2 sentences.

Format your response as JSON:
{
  "date": "YYYY-MM-DD",
  "summary": "One sentence overall market summary",
  "vscode": ["insight 1", "insight 2", ...],
  "releases": ["insight 1", "insight 2", ...],
  "news": ["insight 1", "insight 2", ...],
  "market": ["insight 1", "insight 2", ...]
}
`;

  let insights;
  
  // Try Claude API first
  const aiResponse = await callClaude(context);
  
  if (aiResponse) {
    try {
      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
        insights.source = 'claude';
      }
    } catch (e) {
      console.error('Failed to parse Claude response, using fallback');
    }
  }

  // Fallback to rule-based insights
  if (!insights) {
    insights = {
      date: new Date().toISOString().split('T')[0],
      summary: 'AI coding tools market continues rapid evolution',
      source: 'fallback',
      ...generateFallbackInsights(data),
    };
  }

  insights.generatedAt = new Date().toISOString();

  // Save insights
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(insights, null, 2));
  console.error('✓ Generated insights\n');
  
  // Print summary
  console.error('Summary:', insights.summary);
  console.error('\nVS Code:', insights.vscode?.slice(0, 2).join(' | '));
  console.error('Releases:', insights.releases?.slice(0, 2).join(' | '));
  
  console.log(JSON.stringify(insights, null, 2));
}

function formatNumber(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function truncate(s, len) {
  if (!s) return '';
  return s.length > len ? s.slice(0, len) + '...' : s;
}

generateInsights().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
