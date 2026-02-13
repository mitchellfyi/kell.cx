#!/usr/bin/env node
/**
 * GitHub Stats Collector for kell.cx
 * Fetches live stats for AI coding tools and outputs JSON
 * 
 * Usage: node collect-github-stats.js [--output path]
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// AI coding tools to track (owner/repo)
const REPOS = [
  { repo: 'anthropics/claude-code', name: 'Claude Code', desc: "Anthropic's agentic coding tool for terminal" },
  { repo: 'cline/cline', name: 'Cline', desc: 'Autonomous coding agent for VS Code' },
  { repo: 'Aider-AI/aider', name: 'Aider', desc: 'AI pair programming in your terminal' },
  { repo: 'TabbyML/tabby', name: 'Tabby', desc: 'Self-hosted AI coding assistant' },
  { repo: 'continuedev/continue', name: 'Continue', desc: 'Open-source autopilot for VS Code & JetBrains' },
  { repo: 'block/goose', name: 'Goose', desc: 'Developer agent by Block' },
  { repo: 'voideditor/void', name: 'Void', desc: 'Open source Cursor alternative' },
  { repo: 'cursor-ai/cursor', name: 'Cursor', desc: 'AI-first code editor', optional: true },
  { repo: 'codestoryai/aide', name: 'Aide', desc: 'Open source AI-native IDE' },
  { repo: 'plandex-ai/plandex', name: 'Plandex', desc: 'AI coding engine for complex tasks' },
  { repo: 'pythagora-io/gpt-pilot', name: 'GPT Pilot', desc: 'AI developer that writes code' },
  { repo: 'OpenHands/OpenHands', name: 'OpenHands', desc: 'Open platform for AI software developers' },
  { repo: 'mckaywrigley/chatbot-ui', name: 'Chatbot UI', desc: 'Open source ChatGPT clone' },
  { repo: 'lobehub/lobe-chat', name: 'LobeChat', desc: 'Open source AI chat framework' },
];

function fetchRepo(owner, repo) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}`,
      headers: {
        'User-Agent': 'kell-cx-stats-collector',
        'Accept': 'application/vnd.github.v3+json',
      }
    };

    // Add auth if available
    if (process.env.GITHUB_TOKEN) {
      options.headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else if (res.statusCode === 404) {
          resolve(null); // Repo doesn't exist
        } else {
          reject(new Error(`GitHub API returned ${res.statusCode}: ${data}`));
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

function getActivityLevel(pushedAt) {
  const now = new Date();
  const pushed = new Date(pushedAt);
  const hoursAgo = (now - pushed) / (1000 * 60 * 60);
  
  if (hoursAgo < 24) return { level: 'hot', text: 'Today' };
  if (hoursAgo < 24 * 7) return { level: 'warm', text: `${Math.floor(hoursAgo / 24)}d ago` };
  if (hoursAgo < 24 * 30) {
    const weeksAgo = Math.floor(hoursAgo / (24 * 7));
    return { level: 'cool', text: `${weeksAgo}w ago` };
  }
  
  // Format as month name
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return { level: 'cool', text: `${months[pushed.getMonth()]} ${pushed.getDate()}` };
}

async function collectStats() {
  const results = [];
  const errors = [];
  
  console.error(`Fetching stats for ${REPOS.length} repositories...`);
  
  for (const { repo, name, desc, optional } of REPOS) {
    const [owner, repoName] = repo.split('/');
    try {
      const data = await fetchRepo(owner, repoName);
      if (data) {
        const activity = getActivityLevel(data.pushed_at);
        results.push({
          name,
          repo,
          description: desc,
          stars: data.stargazers_count,
          starsFormatted: formatNumber(data.stargazers_count),
          forks: data.forks_count,
          forksFormatted: formatNumber(data.forks_count),
          watchers: data.subscribers_count,
          openIssues: data.open_issues_count,
          pushedAt: data.pushed_at,
          createdAt: data.created_at,
          activity: activity.level,
          activityText: activity.text,
          language: data.language,
          license: data.license?.spdx_id || null,
          url: data.html_url,
        });
        console.error(`  ✓ ${name}: ${formatNumber(data.stargazers_count)} stars`);
      } else if (!optional) {
        errors.push(`${repo}: not found`);
        console.error(`  ✗ ${name}: not found`);
      }
      
      // Rate limit: 60 req/hr unauthenticated, be nice
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      if (!optional) {
        errors.push(`${repo}: ${err.message}`);
        console.error(`  ✗ ${name}: ${err.message}`);
      }
    }
  }
  
  // Sort by stars descending
  results.sort((a, b) => b.stars - a.stars);
  
  // Find leader
  if (results.length > 0) {
    results[0].isLeader = true;
  }
  
  return {
    generatedAt: new Date().toISOString(),
    repoCount: results.length,
    tools: results,
    errors: errors.length > 0 ? errors : undefined,
    summary: {
      totalStars: results.reduce((sum, r) => sum + r.stars, 0),
      totalForks: results.reduce((sum, r) => sum + r.forks, 0),
      activeToday: results.filter(r => r.activity === 'hot').length,
    }
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
    
    console.error(`\n✓ Collected ${stats.repoCount} repos, ${formatNumber(stats.summary.totalStars)} total stars`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
