#!/usr/bin/env node
/**
 * HackerNews Mentions Collector for kell.cx
 * Uses Algolia HN Search API (no auth required)
 * 
 * Usage: node collect-hn-mentions.js [--output path]
 */

const https = require('https');
const fs = require('fs');

// Terms to track
const SEARCH_TERMS = [
  { term: 'Cursor editor', tool: 'Cursor' },
  { term: 'Claude Code', tool: 'Claude Code' },
  { term: 'GitHub Copilot', tool: 'Copilot' },
  { term: 'Cline AI', tool: 'Cline' },
  { term: 'aider coding', tool: 'Aider' },
  { term: 'Windsurf editor', tool: 'Windsurf' },
  { term: 'Codeium', tool: 'Codeium' },
  { term: 'Continue dev', tool: 'Continue' },
  { term: 'Tabnine', tool: 'Tabnine' },
  { term: 'OpenHands AI', tool: 'OpenHands' },
  { term: 'GPT Pilot', tool: 'GPT Pilot' },
];

function searchHN(query, tags = 'story') {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      query,
      tags,
      hitsPerPage: '10',
      numericFilters: `created_at_i>${Math.floor(Date.now()/1000) - 30*24*60*60}`, // Last 30 days
    });
    
    const options = {
      hostname: 'hn.algolia.com',
      path: `/api/v1/search?${params}`,
      headers: {
        'Accept': 'application/json',
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HN API returned ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function getHotness(points, comments) {
  const score = points + (comments * 2);
  if (score >= 500) return { level: 'viral', emoji: '🔥' };
  if (score >= 100) return { level: 'hot', emoji: '📈' };
  if (score >= 30) return { level: 'warm', emoji: '💬' };
  return { level: 'normal', emoji: '📰' };
}

async function collectMentions() {
  const results = [];
  const toolStats = {};
  
  console.error(`Searching HN for ${SEARCH_TERMS.length} terms...`);
  
  for (const { term, tool } of SEARCH_TERMS) {
    try {
      const data = await searchHN(term);
      
      if (!toolStats[tool]) {
        toolStats[tool] = { mentions: 0, totalPoints: 0, totalComments: 0, stories: [] };
      }
      
      for (const hit of data.hits) {
        const hotness = getHotness(hit.points || 0, hit.num_comments || 0);
        const story = {
          tool,
          title: hit.title,
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          hnUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
          points: hit.points || 0,
          comments: hit.num_comments || 0,
          author: hit.author,
          createdAt: hit.created_at,
          hotness: hotness.level,
          emoji: hotness.emoji,
        };
        
        // Avoid duplicates
        if (!results.find(r => r.hnUrl === story.hnUrl)) {
          results.push(story);
          toolStats[tool].mentions++;
          toolStats[tool].totalPoints += story.points;
          toolStats[tool].totalComments += story.comments;
          toolStats[tool].stories.push(story);
        }
      }
      
      console.error(`  ✓ ${tool}: ${data.hits.length} stories found`);
      
      // Be nice to the API
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`  ✗ ${term}: ${err.message}`);
    }
  }
  
  // Sort by points
  results.sort((a, b) => b.points - a.points);
  
  // Convert toolStats to array and sort
  const toolRankings = Object.entries(toolStats)
    .map(([tool, stats]) => ({
      tool,
      ...stats,
      avgPoints: stats.mentions > 0 ? Math.round(stats.totalPoints / stats.mentions) : 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
  
  return {
    generatedAt: new Date().toISOString(),
    period: 'Last 30 days',
    totalMentions: results.length,
    stories: results.slice(0, 50), // Top 50 stories
    toolRankings,
    summary: {
      mostDiscussed: toolRankings[0]?.tool || null,
      totalPoints: results.reduce((sum, r) => sum + r.points, 0),
      totalComments: results.reduce((sum, r) => sum + r.comments, 0),
      viralStories: results.filter(r => r.hotness === 'viral').length,
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : null;
  
  try {
    const data = await collectMentions();
    const json = JSON.stringify(data, null, 2);
    
    if (outputPath) {
      fs.writeFileSync(outputPath, json);
      console.error(`\nWritten to ${outputPath}`);
    } else {
      console.log(json);
    }
    
    console.error(`\n✓ Found ${data.totalMentions} mentions, ${formatNumber(data.summary.totalPoints)} total points`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
