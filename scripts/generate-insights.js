#!/usr/bin/env node
/**
 * Generate AI-powered insights from collected data
 * Uses Claude Code CLI (if available) or falls back to rule-based insights
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'insights.json');

function loadJson(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function callClaudeCode(prompt) {
  try {
    // Use Claude Code CLI with piped input
    const result = execSync(`echo ${JSON.stringify(prompt)} | claude -p --output-format json`, {
      encoding: 'utf8',
      timeout: 60000,
      env: {
        ...process.env,
        CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN,
      }
    });
    
    // Parse the response
    const parsed = JSON.parse(result);
    return parsed.result || parsed.content || result;
  } catch (e) {
    console.error('Claude Code CLI not available or failed:', e.message);
    return null;
  }
}

function generateFallbackInsights(data) {
  const insights = {
    vscode: [],
    releases: [],
    news: [],
    market: [],
  };

  // VS Code insights
  if (data.vscode && data.vscode.extensions) {
    const exts = data.vscode.extensions;
    const top = exts[0];
    const total = data.vscode.totalInstalls;
    insights.vscode.push(`${top?.name || 'GitHub Copilot'} leads with ${formatNumber(top?.installs || 0)} installs`);
    insights.vscode.push(`Total installs across ${exts.length} extensions: ${formatNumber(total)}`);
    
    // Find fastest growing
    const byTrending = [...exts].sort((a, b) => (b.trendingMonthly || 0) - (a.trendingMonthly || 0));
    if (byTrending[0]?.trendingMonthly > 5) {
      insights.vscode.push(`Fastest growing: ${byTrending[0].name} (+${byTrending[0].trendingMonthly.toFixed(1)}% this month)`);
    }
  }

  // Release insights  
  if (data.releases && data.releases.recentReleases) {
    const thisWeek = data.releases.recentReleases.filter(r => 
      new Date(r.publishedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    insights.releases.push(`${thisWeek.length} releases across tracked tools this week`);
    if (thisWeek[0]) {
      insights.releases.push(`Most recent: ${thisWeek[0].company} ${thisWeek[0].tag}`);
    }
    
    // Count by company
    const byCo = {};
    thisWeek.forEach(r => byCo[r.company] = (byCo[r.company] || 0) + 1);
    const mostActive = Object.entries(byCo).sort((a, b) => b[1] - a[1])[0];
    if (mostActive && mostActive[1] > 1) {
      insights.releases.push(`Most active: ${mostActive[0]} (${mostActive[1]} releases)`);
    }
  }

  // HN/News insights
  if (data.hn && data.hn.stories) {
    const stories = data.hn.stories;
    const totalPoints = stories.reduce((sum, s) => sum + s.points, 0);
    const topStory = stories.sort((a, b) => b.points - a.points)[0];
    
    insights.news.push(`${stories.length} AI-related stories on HN (${formatNumber(totalPoints)} total points)`);
    if (topStory) {
      insights.news.push(`Top discussion: "${truncate(topStory.title, 50)}" (${topStory.points} pts, ${topStory.comments} comments)`);
    }
    
    // Hot topics
    const hotTopics = stories.filter(s => s.points > 100);
    if (hotTopics.length > 0) {
      insights.news.push(`${hotTopics.length} stories with 100+ points today`);
    }
  }

  // Market insights
  insights.market.push('AI coding tools market continues rapid growth');
  if (data.trending?.recentPopular?.length > 0) {
    insights.market.push(`${data.trending.recentPopular.length} new AI repos gaining traction this week`);
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

  // Try Claude Code CLI first
  let insights = null;
  
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    console.error('Attempting Claude Code CLI...');
    
    const prompt = `You are an AI analyst for kell.cx, a competitive intelligence service for AI coding tools.

Analyze this data and generate 3-5 bullet point insights for each category. Be specific with numbers. Identify trends and surprises.

VS Code Extensions (${data.vscode?.extensions?.length || 0} tracked):
${data.vscode?.extensions?.slice(0, 8).map(e => `- ${e.name}: ${formatNumber(e.installs)} installs`).join('\n') || 'No data'}

Recent Releases:
${data.releases?.recentReleases?.slice(0, 8).map(r => `- ${r.company} ${r.tag}`).join('\n') || 'No data'}

Top HN Stories:
${data.hn?.stories?.slice(0, 5).map(s => `- "${s.title}" (${s.points} pts)`).join('\n') || 'No data'}

Respond with ONLY valid JSON (no markdown):
{"summary":"one sentence","vscode":["insight1","insight2"],"releases":["insight1"],"news":["insight1"],"market":["insight1"]}`;

    const response = callClaudeCode(prompt);
    if (response) {
      try {
        const jsonMatch = (typeof response === 'string' ? response : JSON.stringify(response)).match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          insights = JSON.parse(jsonMatch[0]);
          insights.source = 'claude-code';
          console.error('✓ Generated insights via Claude Code');
        }
      } catch (e) {
        console.error('Failed to parse Claude response');
      }
    }
  }

  // Fallback to rule-based insights
  if (!insights) {
    console.error('Using rule-based insights (no Claude Code)');
    insights = {
      date: new Date().toISOString().split('T')[0],
      summary: 'AI coding tools market shows continued momentum across all metrics',
      source: 'rule-based',
      ...generateFallbackInsights(data),
    };
  }

  insights.generatedAt = new Date().toISOString();
  insights.date = new Date().toISOString().split('T')[0];

  // Save insights
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(insights, null, 2));
  console.error('\n✓ Saved insights to', OUTPUT_FILE);
  
  // Print summary
  console.error('\nSummary:', insights.summary);
  if (insights.vscode?.length) console.error('VS Code:', insights.vscode[0]);
  if (insights.releases?.length) console.error('Releases:', insights.releases[0]);
  if (insights.news?.length) console.error('News:', insights.news[0]);
  
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
