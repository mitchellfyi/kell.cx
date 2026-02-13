#!/usr/bin/env node
/**
 * Reddit Stats Collector for kell.cx
 * Fetches community stats for AI coding tool subreddits
 * 
 * Usage: node collect-reddit-stats.js [--output path]
 */

const https = require('https');
const fs = require('fs');

// Subreddits to track (relevant to AI coding tools)
const SUBREDDITS = [
  { name: 'LocalLLaMA', desc: 'Local LLM development & tooling', category: 'llm' },
  { name: 'ChatGPT', desc: 'General ChatGPT discussion', category: 'general' },
  { name: 'ChatGPTCoding', desc: 'ChatGPT for programming', category: 'coding' },
  { name: 'cursor', desc: 'Cursor AI editor', category: 'tool' },
  { name: 'ClaudeAI', desc: 'Anthropic Claude discussion', category: 'llm' },
  { name: 'Codeium', desc: 'Codeium AI assistant', category: 'tool' },
  { name: 'CopilotAI', desc: 'GitHub Copilot', category: 'tool' },
  { name: 'aider_ai', desc: 'Aider pair programming', category: 'tool' },
  { name: 'OpenAI', desc: 'OpenAI general', category: 'llm' },
  { name: 'singularity', desc: 'AI advancement discussion', category: 'general' },
  { name: 'MachineLearning', desc: 'ML research & engineering', category: 'research' },
  { name: 'artificial', desc: 'AI news and discussion', category: 'general' },
  { name: 'ProgrammerHumor', desc: 'Dev culture (AI meme tracking)', category: 'culture' },
];

function fetchSubreddit(name) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.reddit.com',
      path: `/r/${name}/about.json`,
      headers: {
        'User-Agent': 'kell-cx-stats:v1.0 (by /u/kell_cx)',
        'Accept': 'application/json',
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.data);
          } catch (e) {
            reject(new Error(`Failed to parse JSON for r/${name}`));
          }
        } else if (res.statusCode === 404) {
          resolve(null);
        } else if (res.statusCode === 429) {
          reject(new Error('Rate limited'));
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function getGrowthTier(subscribers) {
  if (subscribers >= 1000000) return { tier: 'massive', emoji: '🔥' };
  if (subscribers >= 100000) return { tier: 'large', emoji: '📈' };
  if (subscribers >= 10000) return { tier: 'medium', emoji: '📊' };
  if (subscribers >= 1000) return { tier: 'small', emoji: '🌱' };
  return { tier: 'emerging', emoji: '✨' };
}

async function collectStats() {
  const results = [];
  const errors = [];
  
  console.error(`Fetching stats for ${SUBREDDITS.length} subreddits...`);
  
  for (const { name, desc, category } of SUBREDDITS) {
    try {
      const data = await fetchSubreddit(name);
      if (data) {
        const growth = getGrowthTier(data.subscribers);
        results.push({
          name: data.display_name,
          title: data.title,
          description: desc,
          category,
          subscribers: data.subscribers,
          subscribersFormatted: formatNumber(data.subscribers),
          activeUsers: data.accounts_active || 0,
          activeFormatted: formatNumber(data.accounts_active || 0),
          createdAt: new Date(data.created_utc * 1000).toISOString(),
          isNSFW: data.over18,
          tier: growth.tier,
          emoji: growth.emoji,
          url: `https://reddit.com/r/${data.display_name}`,
        });
        console.error(`  ✓ r/${name}: ${formatNumber(data.subscribers)} members, ${formatNumber(data.accounts_active || 0)} active`);
      } else {
        errors.push(`r/${name}: not found`);
        console.error(`  ✗ r/${name}: not found`);
      }
      
      // Reddit rate limits are strict - be nice
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      errors.push(`r/${name}: ${err.message}`);
      console.error(`  ✗ r/${name}: ${err.message}`);
      
      if (err.message === 'Rate limited') {
        console.error('  Waiting 60s for rate limit...');
        await new Promise(r => setTimeout(r, 60000));
      }
    }
  }
  
  // Sort by subscribers descending
  results.sort((a, b) => b.subscribers - a.subscribers);
  
  // Calculate category totals
  const byCategory = {};
  for (const r of results) {
    if (!byCategory[r.category]) {
      byCategory[r.category] = { count: 0, totalSubscribers: 0, totalActive: 0 };
    }
    byCategory[r.category].count++;
    byCategory[r.category].totalSubscribers += r.subscribers;
    byCategory[r.category].totalActive += r.activeUsers;
  }
  
  return {
    generatedAt: new Date().toISOString(),
    subredditCount: results.length,
    subreddits: results,
    byCategory,
    summary: {
      totalSubscribers: results.reduce((sum, r) => sum + r.subscribers, 0),
      totalActive: results.reduce((sum, r) => sum + r.activeUsers, 0),
      largestCommunity: results[0]?.name || null,
      toolSpecific: results.filter(r => r.category === 'tool'),
    },
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : null;
  
  try {
    const stats = await collectStats();
    const json = JSON.stringify(stats, null, 2);
    
    if (outputPath) {
      fs.writeFileSync(outputPath, json);
      console.error(`\nWritten to ${outputPath}`);
    } else {
      console.log(json);
    }
    
    console.error(`\n✓ Collected ${stats.subredditCount} subreddits, ${formatNumber(stats.summary.totalSubscribers)} total subscribers`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
