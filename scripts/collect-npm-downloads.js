#!/usr/bin/env node
/**
 * NPM Download Stats Collector for kell.cx
 * Tracks npm package downloads for AI coding tools
 * 
 * Usage: node collect-npm-downloads.js [--output path]
 */

const https = require('https');
const fs = require('fs');

// AI coding tool npm packages to track
const PACKAGES = [
  // AI Assistants & Editors
  { name: '@cursor/cli', displayName: 'Cursor CLI', category: 'ai-editor' },
  { name: 'aider-chat', displayName: 'Aider', category: 'ai-assistant' },
  { name: '@anthropic-ai/claude-code', displayName: 'Claude Code', category: 'ai-assistant' },
  { name: 'continue', displayName: 'Continue.dev', category: 'ai-assistant' },
  
  // AI SDKs
  { name: '@anthropic-ai/sdk', displayName: 'Anthropic SDK', category: 'sdk' },
  { name: 'openai', displayName: 'OpenAI SDK', category: 'sdk' },
  { name: '@google/generative-ai', displayName: 'Google Gemini SDK', category: 'sdk' },
  { name: 'cohere-ai', displayName: 'Cohere SDK', category: 'sdk' },
  { name: '@mistralai/mistralai', displayName: 'Mistral SDK', category: 'sdk' },
  
  // Code Analysis & AI Helpers
  { name: 'langchain', displayName: 'LangChain', category: 'framework' },
  { name: '@langchain/core', displayName: 'LangChain Core', category: 'framework' },
  { name: 'llamaindex', displayName: 'LlamaIndex', category: 'framework' },
  { name: 'ai', displayName: 'Vercel AI SDK', category: 'framework' },
  
  // AI Coding Helpers
  { name: 'copilot', displayName: 'Copilot Utils', category: 'tool' },
  { name: '@tabnine/vscode', displayName: 'Tabnine', category: 'ai-assistant' },
  { name: 'codeium', displayName: 'Codeium CLI', category: 'ai-assistant' },
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'kell-cx/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('JSON parse failed'));
          }
        } else if (res.statusCode === 404) {
          resolve(null);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

async function getPackageDownloads(pkgName) {
  // Get last week's downloads
  const weekUrl = `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(pkgName)}`;
  // Get last month's downloads
  const monthUrl = `https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(pkgName)}`;
  // Get package info
  const infoUrl = `https://registry.npmjs.org/${encodeURIComponent(pkgName)}/latest`;
  
  const [weekData, monthData, info] = await Promise.all([
    fetch(weekUrl).catch(() => null),
    fetch(monthUrl).catch(() => null),
    fetch(infoUrl).catch(() => null),
  ]);
  
  return {
    weeklyDownloads: weekData?.downloads || 0,
    monthlyDownloads: monthData?.downloads || 0,
    version: info?.version || null,
    description: info?.description || null,
    homepage: info?.homepage || null,
    repository: typeof info?.repository === 'string' 
      ? info.repository 
      : info?.repository?.url?.replace(/^git\+/, '').replace(/\.git$/, '') || null,
  };
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function getPopularityTier(downloads) {
  if (downloads >= 1000000) return { tier: 'massive', emoji: '🔥' };
  if (downloads >= 100000) return { tier: 'popular', emoji: '📈' };
  if (downloads >= 10000) return { tier: 'growing', emoji: '📊' };
  if (downloads >= 1000) return { tier: 'emerging', emoji: '🌱' };
  if (downloads >= 100) return { tier: 'new', emoji: '✨' };
  return { tier: 'minimal', emoji: '🔹' };
}

async function collectStats() {
  const results = [];
  const errors = [];
  
  console.error(`Fetching npm download stats for ${PACKAGES.length} packages...`);
  
  for (const { name, displayName, category } of PACKAGES) {
    try {
      const data = await getPackageDownloads(name);
      
      if (data.weeklyDownloads > 0 || data.monthlyDownloads > 0 || data.version) {
        const popularity = getPopularityTier(data.weeklyDownloads);
        results.push({
          package: name,
          displayName,
          category,
          weeklyDownloads: data.weeklyDownloads,
          weeklyFormatted: formatNumber(data.weeklyDownloads),
          monthlyDownloads: data.monthlyDownloads,
          monthlyFormatted: formatNumber(data.monthlyDownloads),
          version: data.version,
          description: data.description,
          homepage: data.homepage,
          repository: data.repository,
          tier: popularity.tier,
          emoji: popularity.emoji,
          npmUrl: `https://www.npmjs.com/package/${name}`,
        });
        console.error(`  ✓ ${displayName}: ${formatNumber(data.weeklyDownloads)}/week, ${formatNumber(data.monthlyDownloads)}/month`);
      } else {
        errors.push(`${name}: no data`);
        console.error(`  ✗ ${displayName}: no data available`);
      }
      
      // Small delay to be nice
      await new Promise(r => setTimeout(r, 100));
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
      console.error(`  ✗ ${displayName}: ${err.message}`);
    }
  }
  
  // Sort by weekly downloads descending
  results.sort((a, b) => b.weeklyDownloads - a.weeklyDownloads);
  
  // Calculate category totals
  const byCategory = {};
  for (const r of results) {
    if (!byCategory[r.category]) {
      byCategory[r.category] = { count: 0, totalWeekly: 0, totalMonthly: 0, packages: [] };
    }
    byCategory[r.category].count++;
    byCategory[r.category].totalWeekly += r.weeklyDownloads;
    byCategory[r.category].totalMonthly += r.monthlyDownloads;
    byCategory[r.category].packages.push(r.displayName);
  }
  
  return {
    generatedAt: new Date().toISOString(),
    packageCount: results.length,
    packages: results,
    byCategory,
    summary: {
      totalWeeklyDownloads: results.reduce((sum, r) => sum + r.weeklyDownloads, 0),
      totalMonthlyDownloads: results.reduce((sum, r) => sum + r.monthlyDownloads, 0),
      mostDownloaded: results[0]?.displayName || null,
      topByCategory: Object.entries(byCategory)
        .map(([cat, data]) => ({ category: cat, weeklyTotal: data.totalWeekly }))
        .sort((a, b) => b.weeklyTotal - a.weeklyTotal),
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
    
    console.error(`\n✓ Collected ${stats.packageCount} packages, ${formatNumber(stats.summary.totalWeeklyDownloads)} weekly downloads total`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
