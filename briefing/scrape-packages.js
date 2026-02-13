#!/usr/bin/env node
/**
 * Package Registry Scraper - npm & PyPI
 * Tracks developer adoption through package download stats
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// Packages to track - CLI tools, SDKs, extensions
const NPM_PACKAGES = [
  { name: '@anthropic-ai/claude-code', competitor: 'Claude Code', desc: 'Claude Code CLI' },
  { name: 'cursor', competitor: 'Cursor', desc: 'Cursor CLI' },
  { name: '@codeium/cli', competitor: 'Codeium/Windsurf', desc: 'Codeium CLI' },
  { name: 'codeium', competitor: 'Codeium/Windsurf', desc: 'Codeium npm package' },
  { name: 'continue', competitor: 'Continue.dev', desc: 'Continue extension core' },
  { name: '@continuedev/core', competitor: 'Continue.dev', desc: 'Continue core library' },
  { name: 'tabnine', competitor: 'Tabnine', desc: 'Tabnine npm package' },
  { name: '@copilot/runtime', competitor: 'GitHub Copilot', desc: 'Copilot runtime' },
  { name: 'copilot-node-server', competitor: 'GitHub Copilot', desc: 'Copilot node server' },
  { name: 'sourcegraph', competitor: 'Sourcegraph Cody', desc: 'Sourcegraph client' },
  { name: '@sourcegraph/cody-shared', competitor: 'Sourcegraph Cody', desc: 'Cody shared lib' },
  { name: '@aws-sdk/client-codewhisperer', competitor: 'Amazon Q', desc: 'CodeWhisperer SDK' },
  { name: 'supermaven-nvim', competitor: 'Supermaven', desc: 'Supermaven Neovim' },
  { name: 'aider', competitor: 'Aider', desc: 'AI pair programming' },
  { name: '@replit/ai', competitor: 'Replit', desc: 'Replit AI SDK' }
];

const PYPI_PACKAGES = [
  { name: 'anthropic', competitor: 'Anthropic', desc: 'Anthropic Python SDK' },
  { name: 'aider-chat', competitor: 'Aider', desc: 'Aider AI pair programming' },
  { name: 'codeium', competitor: 'Codeium/Windsurf', desc: 'Codeium Python' },
  { name: 'tabnine', competitor: 'Tabnine', desc: 'Tabnine Python' },
  { name: 'continue', competitor: 'Continue.dev', desc: 'Continue Python' },
  { name: 'sourcegraph', competitor: 'Sourcegraph Cody', desc: 'Sourcegraph Python' },
  { name: 'cody-ai', competitor: 'Sourcegraph Cody', desc: 'Cody AI Python' },
  { name: 'replit', competitor: 'Replit', desc: 'Replit Python SDK' },
  { name: 'amazon-codewhisperer', competitor: 'Amazon Q', desc: 'CodeWhisperer Python' },
  { name: 'cursor-python', competitor: 'Cursor', desc: 'Cursor Python utils' },
  { name: 'openai', competitor: 'OpenAI', desc: 'OpenAI SDK (baseline)' },
  { name: 'cohere', competitor: 'Cohere', desc: 'Cohere SDK' },
  { name: 'langchain', competitor: 'LangChain', desc: 'LangChain (context)' }
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 
        'User-Agent': 'Briefing/1.0 (competitive-intel)',
        'Accept': 'application/json'
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode === 404) return resolve(null);
      if (res.statusCode >= 300) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function scrapeNpm(packageName) {
  try {
    // Get package info
    const info = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);
    if (!info) return null;

    // Get download counts (last week)
    const downloads = await fetch(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageName)}`);
    
    // Get download counts (last month)
    const monthlyDownloads = await fetch(`https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(packageName)}`);

    const latestVersion = info['dist-tags']?.latest;
    const latestInfo = latestVersion ? info.versions?.[latestVersion] : null;

    return {
      name: packageName,
      registry: 'npm',
      version: latestVersion,
      weeklyDownloads: downloads?.downloads || 0,
      monthlyDownloads: monthlyDownloads?.downloads || 0,
      description: info.description || '',
      homepage: info.homepage || '',
      repository: info.repository?.url || '',
      publishedAt: latestInfo?.time || info.time?.[latestVersion] || null,
      license: latestInfo?.license || info.license || '',
      maintainers: (info.maintainers || []).map(m => m.name).join(', ')
    };
  } catch (e) {
    return { name: packageName, registry: 'npm', error: e.message };
  }
}

async function scrapePyPI(packageName) {
  try {
    const info = await fetch(`https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`);
    if (!info) return null;

    // PyPI doesn't have download stats in API, but we can get package info
    const latest = info.info;
    const releases = Object.keys(info.releases || {});
    
    return {
      name: packageName,
      registry: 'pypi',
      version: latest?.version,
      description: latest?.summary || '',
      homepage: latest?.home_page || latest?.project_url || '',
      license: latest?.license || '',
      author: latest?.author || '',
      requires_python: latest?.requires_python || '',
      releaseCount: releases.length,
      // Get latest release date
      latestReleaseDate: info.releases?.[latest?.version]?.[0]?.upload_time || null
    };
  } catch (e) {
    return { name: packageName, registry: 'pypi', error: e.message };
  }
}

async function scrapeAllPackages() {
  console.log('📦 Scraping package registries...\n');
  
  const results = {
    scrapedAt: new Date().toISOString(),
    npm: [],
    pypi: []
  };

  // Scrape npm packages
  console.log('  npm packages:');
  for (const pkg of NPM_PACKAGES) {
    const data = await scrapeNpm(pkg.name);
    if (data && !data.error) {
      results.npm.push({ ...data, competitor: pkg.competitor, desc: pkg.desc });
      console.log(`    ✓ ${pkg.name}: ${data.weeklyDownloads?.toLocaleString() || 0} weekly downloads`);
    } else if (data?.error) {
      console.log(`    ✗ ${pkg.name}: ${data.error}`);
    } else {
      console.log(`    - ${pkg.name}: not found`);
    }
    await new Promise(r => setTimeout(r, 200)); // Rate limit
  }

  // Scrape PyPI packages
  console.log('\n  PyPI packages:');
  for (const pkg of PYPI_PACKAGES) {
    const data = await scrapePyPI(pkg.name);
    if (data && !data.error) {
      results.pypi.push({ ...data, competitor: pkg.competitor, desc: pkg.desc });
      console.log(`    ✓ ${pkg.name}: v${data.version}`);
    } else if (data?.error) {
      console.log(`    ✗ ${pkg.name}: ${data.error}`);
    } else {
      console.log(`    - ${pkg.name}: not found`);
    }
    await new Promise(r => setTimeout(r, 200)); // Rate limit
  }

  // Save data
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(DATA_DIR, 'packages.json'),
    JSON.stringify(results, null, 2)
  );

  return results;
}

function generateBriefingSection(data) {
  if (!data || (!data.npm?.length && !data.pypi?.length)) {
    return '';
  }

  let md = '\n## 📦 Package Registries\n\n';
  md += '*Developer adoption signals from npm & PyPI*\n\n';

  // npm highlights - sort by weekly downloads
  const npmWithDownloads = (data.npm || [])
    .filter(p => p.weeklyDownloads > 0)
    .sort((a, b) => b.weeklyDownloads - a.weeklyDownloads);

  if (npmWithDownloads.length > 0) {
    md += '### npm (weekly downloads)\n';
    md += '| Package | Competitor | Weekly | Monthly | Version |\n';
    md += '|---------|------------|--------|---------|----------|\n';
    
    for (const pkg of npmWithDownloads.slice(0, 10)) {
      md += `| ${pkg.name} | ${pkg.competitor} | ${pkg.weeklyDownloads?.toLocaleString()} | ${pkg.monthlyDownloads?.toLocaleString()} | ${pkg.version || '-'} |\n`;
    }
    md += '\n';
  }

  // PyPI highlights
  const pypiPackages = (data.pypi || []).filter(p => p.version);
  if (pypiPackages.length > 0) {
    md += '### PyPI\n';
    md += '| Package | Competitor | Version | Releases | Python |\n';
    md += '|---------|------------|---------|----------|--------|\n';
    
    for (const pkg of pypiPackages) {
      md += `| ${pkg.name} | ${pkg.competitor} | ${pkg.version} | ${pkg.releaseCount} | ${pkg.requires_python || 'any'} |\n`;
    }
    md += '\n';
  }

  // Version update alerts
  const recentUpdates = [
    ...(data.npm || []).filter(p => p.publishedAt && isRecent(p.publishedAt)),
    ...(data.pypi || []).filter(p => p.latestReleaseDate && isRecent(p.latestReleaseDate))
  ];

  if (recentUpdates.length > 0) {
    md += '### Recent Package Updates (last 7 days)\n';
    for (const pkg of recentUpdates) {
      const date = pkg.publishedAt || pkg.latestReleaseDate;
      md += `- **${pkg.name}** (${pkg.competitor}): v${pkg.version} - ${new Date(date).toLocaleDateString()}\n`;
    }
    md += '\n';
  }

  return md;
}

function isRecent(dateStr, days = 7) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = (now - date) / (1000 * 60 * 60 * 24);
  return diff <= days;
}

// Track changes over time
function loadPackageHistory() {
  const historyFile = path.join(DATA_DIR, 'packages-history.json');
  if (fs.existsSync(historyFile)) {
    return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
  }
  return { entries: [] };
}

function savePackageHistory(data) {
  const history = loadPackageHistory();
  const entry = {
    date: new Date().toISOString().split('T')[0],
    npm: (data.npm || []).map(p => ({
      name: p.name,
      weeklyDownloads: p.weeklyDownloads,
      version: p.version
    })),
    pypi: (data.pypi || []).map(p => ({
      name: p.name,
      version: p.version
    }))
  };
  
  // Remove duplicate date entries
  history.entries = history.entries.filter(e => e.date !== entry.date);
  history.entries.push(entry);
  
  // Keep last 90 days
  history.entries = history.entries.slice(-90);
  
  fs.writeFileSync(
    path.join(DATA_DIR, 'packages-history.json'),
    JSON.stringify(history, null, 2)
  );
}

module.exports = { scrapeAllPackages, generateBriefingSection, loadPackageHistory, savePackageHistory };

if (require.main === module) {
  scrapeAllPackages()
    .then(data => {
      savePackageHistory(data);
      console.log('\n' + generateBriefingSection(data));
    })
    .catch(console.error);
}
