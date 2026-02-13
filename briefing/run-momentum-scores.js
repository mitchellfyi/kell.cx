#!/usr/bin/env node
/**
 * Standalone Momentum Score Runner
 * Loads data directly from files and generates momentum report
 * Can run independently of the main briefing pipeline
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

// Ensure history dir exists
if (!fs.existsSync(HISTORY_DIR)) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

const COMPETITORS = [
  { slug: 'cursor', name: 'Cursor', aliases: ['cursor.sh', 'cursor.com', 'cursor ai'] },
  { slug: 'cognition', name: 'Devin', aliases: ['devin ai', 'cognition.ai', 'cognition labs'] },
  { slug: 'replit', name: 'Replit', aliases: ['replit.com'] },
  { slug: 'windsurf', name: 'Windsurf', aliases: ['codeium', 'codeium.com'] },
  { slug: 'copilot', name: 'GitHub Copilot', aliases: ['copilot', 'github copilot'] },
  { slug: 'tabnine', name: 'Tabnine', aliases: ['tabnine.com'] },
  { slug: 'amazonq', name: 'Amazon Q', aliases: ['amazon q developer', 'codewhisperer'] },
  { slug: 'cody', name: 'Sourcegraph Cody', aliases: ['cody', 'sourcegraph'] },
  { slug: 'continue', name: 'Continue', aliases: ['continue.dev'] },
  { slug: 'supermaven', name: 'Supermaven', aliases: ['supermaven.com'] },
  { slug: 'augment', name: 'Augment Code', aliases: ['augmentcode', 'augment code'] },
  { slug: 'lovable', name: 'Lovable', aliases: ['lovable.dev', 'gpt engineer'] },
  { slug: 'poolside', name: 'Poolside', aliases: ['poolside.ai'] },
  { slug: 'bolt', name: 'Bolt', aliases: ['bolt.new', 'stackblitz bolt'] },
  { slug: 'v0', name: 'v0', aliases: ['v0.dev', 'vercel v0'] }
];

function loadJSON(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function matchCompetitor(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const c of COMPETITORS) {
    if (lower.includes(c.slug) || lower.includes(c.name.toLowerCase())) return c.slug;
    for (const alias of c.aliases || []) {
      if (lower.includes(alias.toLowerCase())) return c.slug;
    }
  }
  return null;
}

function loadAllData() {
  console.log('📊 Loading data from files...\n');
  
  const data = {
    funding: [],
    jobs: {},
    vscode: {},
    chrome: {},
    packages: {},
    news: [],
    social: {},
    discord: {},
    youtube: {}
  };
  
  // Load funding data
  const fundingPath = path.join(DATA_DIR, 'funding.json');
  if (fs.existsSync(fundingPath)) {
    const f = loadJSON(fundingPath);
    data.funding = f?.funding || [];
    console.log(`  💰 Funding: ${data.funding.length} articles`);
  }
  
  // Load jobs data
  const jobsPath = path.join(DATA_DIR, 'jobs-history.json');
  if (fs.existsSync(jobsPath)) {
    data.jobs = loadJSON(jobsPath) || {};
    console.log(`  💼 Jobs: ${Object.keys(data.jobs).length} competitors tracked`);
  }
  
  // Load VS Code marketplace data
  const vscodePath = path.join(DATA_DIR, 'vscode-marketplace.json');
  if (fs.existsSync(vscodePath)) {
    const v = loadJSON(vscodePath);
    // Data is flat: { "GitHub.copilot": { installs, rating, ... }, ... }
    if (v && typeof v === 'object') {
      Object.entries(v).forEach(([extId, extData]) => {
        data.vscode[extId] = { ...extData, extensionId: extId };
      });
    }
    console.log(`  🔌 VS Code: ${Object.keys(data.vscode).length} extensions`);
  }
  
  // Load Chrome Web Store data
  const chromePath = path.join(DATA_DIR, 'chrome-webstore-cache.json');
  if (fs.existsSync(chromePath)) {
    data.chrome = loadJSON(chromePath) || {};
    console.log(`  🌐 Chrome: ${Object.keys(data.chrome).length} extensions`);
  }
  
  // Load npm/pypi package data
  const packagesPath = path.join(DATA_DIR, 'packages.json');
  if (fs.existsSync(packagesPath)) {
    const pkgs = loadJSON(packagesPath) || {};
    // Structure: { npm: [...], pypi: [...] }
    data.packages = { npm: pkgs.npm || [], pypi: pkgs.pypi || [] };
    console.log(`  📦 Packages: npm=${data.packages.npm.length}, pypi=${data.packages.pypi.length}`);
  }
  
  // Load news data
  const newsPath = path.join(DATA_DIR, 'news.json');
  if (fs.existsSync(newsPath)) {
    const n = loadJSON(newsPath);
    data.news = n?.allRelevantArticles || [];
    console.log(`  📰 News: ${data.news.length} articles`);
  }
  
  // Load Discord data
  const discordPath = path.join(DATA_DIR, 'discord.json');
  if (fs.existsSync(discordPath)) {
    const d = loadJSON(discordPath);
    data.discord = d?.servers || {};
    console.log(`  💬 Discord: ${Object.keys(data.discord).length} servers`);
  }
  
  // Load YouTube data
  const youtubePath = path.join(DATA_DIR, 'youtube-state.json');
  if (fs.existsSync(youtubePath)) {
    data.youtube = loadJSON(youtubePath) || {};
    console.log(`  🎬 YouTube: ${Object.keys(data.youtube).length} channels`);
  }
  
  console.log('');
  return data;
}

function calculateScores(data) {
  const scores = {};
  const signals = {};
  
  // Initialize
  COMPETITORS.forEach(c => {
    scores[c.slug] = 0;
    signals[c.slug] = [];
  });
  
  // 1. Funding news (major signal)
  data.funding.forEach(item => {
    const slug = matchCompetitor(item.competitor || item.title);
    if (slug) {
      const isMajor = /\$\d+[MB]|\braises\b|acquisition|acquired/i.test(item.title);
      const points = isMajor ? 50 : 20;
      scores[slug] += points;
      signals[slug].push(`💰 Funding news (+${points})`);
    }
  });
  
  // 2. Hiring (from jobs data)
  Object.entries(data.jobs).forEach(([slug, jobData]) => {
    if (jobData?.current && scores[slug] !== undefined) {
      const count = jobData.current.count || 0;
      if (count > 50) {
        scores[slug] += 20;
        signals[slug].push(`💼 Heavy hiring: ${count} roles (+20)`);
      } else if (count > 20) {
        scores[slug] += 10;
        signals[slug].push(`💼 Active hiring: ${count} roles (+10)`);
      } else if (count > 5) {
        scores[slug] += 5;
        signals[slug].push(`💼 Hiring: ${count} roles (+5)`);
      }
    }
  });
  
  // 3. VS Code Marketplace installs (top performers get points)
  const vscodeWithInstalls = Object.entries(data.vscode)
    .filter(([_, v]) => v.installs)
    .sort((a, b) => (b[1].installs || 0) - (a[1].installs || 0));
  
  vscodeWithInstalls.forEach(([name, ext], index) => {
    const slug = matchCompetitor(name);
    if (slug && index < 5) {
      const points = 15 - (index * 2);
      scores[slug] += points;
      signals[slug].push(`🔌 VS Code #${index + 1}: ${(ext.installs || 0).toLocaleString()} installs (+${points})`);
    }
  });
  
  // 4. News mentions
  data.news.forEach(article => {
    const slug = matchCompetitor(article.title);
    if (slug) {
      scores[slug] += 5;
      signals[slug].push(`📰 News mention (+5)`);
    }
  });
  
  // 5. Discord community size
  Object.entries(data.discord).forEach(([slug, server]) => {
    if (scores[slug] !== undefined && server?.memberCount) {
      if (server.memberCount > 50000) {
        scores[slug] += 15;
        signals[slug].push(`💬 Large Discord: ${server.memberCount.toLocaleString()} members (+15)`);
      } else if (server.memberCount > 10000) {
        scores[slug] += 10;
        signals[slug].push(`💬 Active Discord: ${server.memberCount.toLocaleString()} members (+10)`);
      } else if (server.memberCount > 1000) {
        scores[slug] += 5;
        signals[slug].push(`💬 Discord: ${server.memberCount.toLocaleString()} members (+5)`);
      }
    }
  });
  
  // 6. Recent changelog/releases activity (from competitor data files)
  const competitorFiles = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json') && !f.includes('history') && !f.includes('cache'));
  
  competitorFiles.forEach(file => {
    try {
      const d = loadJSON(path.join(DATA_DIR, file));
      if (d?.changelog?.length > 0) {
        const slug = matchCompetitor(d.name || file);
        if (slug) {
          const recentCount = d.changelog.filter(date => {
            const parsed = new Date(date);
            const daysAgo = (Date.now() - parsed) / (1000 * 60 * 60 * 24);
            return daysAgo < 30;
          }).length;
          if (recentCount >= 3) {
            scores[slug] += 15;
            signals[slug].push(`🚀 Shipping fast: ${recentCount} changelog updates (+15)`);
          } else if (recentCount >= 1) {
            scores[slug] += 8;
            signals[slug].push(`🚀 Active changelog: ${recentCount} updates (+8)`);
          }
        }
      }
    } catch (e) {}
  });
  
  // 7. npm package downloads (developer adoption signal)
  if (data.packages?.npm?.length > 0) {
    data.packages.npm
      .filter(p => p.weeklyDownloads > 1000)
      .sort((a, b) => b.weeklyDownloads - a.weeklyDownloads)
      .forEach((pkg, index) => {
        const slug = matchCompetitor(pkg.competitor || pkg.name);
        if (slug && index < 5) {
          const points = 12 - (index * 2);
          const downloads = (pkg.weeklyDownloads || 0).toLocaleString();
          scores[slug] += points;
          signals[slug].push(`📦 npm #${index + 1}: ${downloads} weekly downloads (+${points})`);
        }
      });
  }
  
  // 8. PyPI package downloads
  if (data.packages?.pypi?.length > 0) {
    data.packages.pypi
      .filter(p => p.weeklyDownloads > 1000)
      .sort((a, b) => b.weeklyDownloads - a.weeklyDownloads)
      .forEach((pkg, index) => {
        const slug = matchCompetitor(pkg.competitor || pkg.name);
        if (slug && index < 3) {
          const points = 8 - (index * 2);
          const downloads = (pkg.weeklyDownloads || 0).toLocaleString();
          scores[slug] += points;
          signals[slug].push(`🐍 PyPI: ${downloads} weekly downloads (+${points})`);
        }
      });
  }
  
  // 9. Chrome extension installs
  Object.entries(data.chrome).forEach(([extId, ext]) => {
    const slug = matchCompetitor(extId);
    if (slug && ext?.users) {
      const users = parseInt(ext.users?.replace(/[^0-9]/g, '') || '0');
      if (users > 500000) {
        scores[slug] += 10;
        signals[slug].push(`🌐 Chrome: ${ext.users} users (+10)`);
      } else if (users > 100000) {
        scores[slug] += 5;
        signals[slug].push(`🌐 Chrome: ${ext.users} users (+5)`);
      }
    }
  });
  
  return { scores, signals };
}

function generateReport(scores, signals) {
  // Sort by score descending
  const ranked = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([slug, score], index) => ({
      rank: index + 1,
      slug,
      name: COMPETITORS.find(c => c.slug === slug)?.name || slug,
      score,
      signals: signals[slug] || []
    }));
  
  // Markdown output
  let md = `## 🏆 Competitive Momentum Scores\n`;
  md += `*Who's gaining ground this week:*\n\n`;
  
  const medals = ['🥇', '🥈', '🥉'];
  
  ranked.filter(r => r.score > 0).forEach((r, i) => {
    const medal = medals[i] || `${r.rank}.`;
    md += `${medal} **${r.name}** — ${r.score} pts\n`;
    if (r.signals.length > 0) {
      r.signals.slice(0, 3).forEach(s => {
        md += `   ${s}\n`;
      });
    }
    md += '\n';
  });
  
  if (ranked.filter(r => r.score > 0).length === 0) {
    md += `*No significant momentum signals detected today.*\n`;
  }
  
  return { markdown: md, ranked };
}

function saveHistory(scores) {
  const historyPath = path.join(DATA_DIR, 'momentum-history.json');
  let history = loadJSON(historyPath) || [];
  
  history.push({
    date: new Date().toISOString(),
    scores
  });
  
  // Keep last 90 days
  history = history.slice(-90);
  
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  console.log(`📈 Saved to ${historyPath}`);
}

// Main
async function main() {
  console.log('⚡ Momentum Score Runner\n');
  
  const data = loadAllData();
  const { scores, signals } = calculateScores(data);
  
  console.log('🏆 Results:\n');
  const { markdown, ranked } = generateReport(scores, signals);
  console.log(markdown);
  
  // Save history
  saveHistory(scores);
  
  // Output JSON for piping
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ scores, signals, ranked }, null, 2));
  }
}

main().catch(console.error);
