#!/usr/bin/env node
/**
 * Export Dashboard Data
 * Generates JSON files for the kell.cx live dashboard
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const SITE_DIR = path.join(__dirname, '../kell-cx/site/data');

// Ensure output dir exists
if (!fs.existsSync(SITE_DIR)) {
  fs.mkdirSync(SITE_DIR, { recursive: true });
}

function loadJSON(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function exportDashboardData() {
  const exported = {
    generatedAt: new Date().toISOString(),
    competitors: []
  };

  // Load momentum scores
  const momentumHistory = loadJSON(path.join(DATA_DIR, 'momentum-history.json')) || [];
  const latestMomentum = momentumHistory.length > 0 ? momentumHistory[momentumHistory.length - 1] : null;

  // Load LinkedIn jobs (array format)
  const linkedinJobsArray = loadJSON(path.join(DATA_DIR, 'linkedin-jobs-latest.json')) || [];
  const linkedinJobs = {};
  if (Array.isArray(linkedinJobsArray)) {
    linkedinJobsArray.forEach(j => {
      const name = j.name?.toLowerCase() || '';
      let slug = null;
      if (name.includes('cursor')) slug = 'cursor';
      else if (name.includes('cognition') || name.includes('devin')) slug = 'cognition';
      else if (name.includes('replit')) slug = 'replit';
      else if (name.includes('codeium') || name.includes('windsurf')) slug = 'windsurf';
      else if (name.includes('github') || name.includes('copilot')) slug = 'copilot';
      else if (name.includes('tabnine')) slug = 'tabnine';
      else if (name.includes('amazon') || name.includes('aws')) slug = 'amazonq';
      else if (name.includes('sourcegraph') || name.includes('cody')) slug = 'cody';
      else if (name.includes('continue')) slug = 'continue';
      else if (name.includes('supermaven')) slug = 'supermaven';
      else if (name.includes('augment')) slug = 'augment';
      else if (name.includes('lovable')) slug = 'lovable';
      else if (name.includes('poolside')) slug = 'poolside';
      else if (name.includes('bolt') || name.includes('stackblitz')) slug = 'bolt';
      else if (name.includes('vercel') || name.includes('v0')) slug = 'v0';
      
      if (slug && j.search?.linkedInMatches) {
        linkedinJobs[slug] = { count: j.search.linkedInMatches };
      }
    });
  }

  // Load VS Code marketplace data
  const vscodeData = loadJSON(path.join(DATA_DIR, 'vscode-marketplace.json')) || {};

  // Load packages data
  const packagesData = loadJSON(path.join(DATA_DIR, 'packages.json')) || {};

  // Load Discord data
  const discordData = loadJSON(path.join(DATA_DIR, 'social/discord-latest.json')) || {};

  // Build competitor profiles
  const competitors = [
    { slug: 'cursor', name: 'Cursor', category: 'IDE' },
    { slug: 'cognition', name: 'Devin', category: 'Agent' },
    { slug: 'replit', name: 'Replit', category: 'Platform' },
    { slug: 'windsurf', name: 'Windsurf/Codeium', category: 'Extension' },
    { slug: 'copilot', name: 'GitHub Copilot', category: 'Extension' },
    { slug: 'tabnine', name: 'Tabnine', category: 'Extension' },
    { slug: 'amazonq', name: 'Amazon Q', category: 'Extension' },
    { slug: 'cody', name: 'Sourcegraph Cody', category: 'Extension' },
    { slug: 'continue', name: 'Continue', category: 'Extension' },
    { slug: 'supermaven', name: 'Supermaven', category: 'Extension' },
    { slug: 'augment', name: 'Augment Code', category: 'Extension' },
    { slug: 'lovable', name: 'Lovable', category: 'Builder' },
    { slug: 'poolside', name: 'Poolside', category: 'Model' },
    { slug: 'bolt', name: 'Bolt', category: 'Builder' },
    { slug: 'v0', name: 'v0', category: 'Builder' }
  ];

  competitors.forEach(comp => {
    const profile = {
      slug: comp.slug,
      name: comp.name,
      category: comp.category,
      momentum: latestMomentum?.scores?.[comp.slug] || 0,
      signals: {}
    };

    // Add job counts
    if (linkedinJobs[comp.slug]) {
      profile.signals.jobs = linkedinJobs[comp.slug].count || 0;
    }

    // Add VS Code installs
    const vscodeKey = Object.keys(vscodeData).find(k => 
      k.toLowerCase().includes(comp.slug) || 
      (comp.slug === 'windsurf' && k.toLowerCase().includes('codeium')) ||
      (comp.slug === 'copilot' && k.toLowerCase().includes('copilot'))
    );
    if (vscodeKey && vscodeData[vscodeKey]) {
      const installs = vscodeData[vscodeKey].installs;
      profile.signals.vscodeInstalls = formatNumber(typeof installs === 'number' ? installs : parseInt(installs) || 0);
      profile.signals.vscodeRating = vscodeData[vscodeKey].averageRating || vscodeData[vscodeKey].rating;
    }

    // Add Discord members
    if (discordData[comp.slug]) {
      profile.signals.discordMembers = discordData[comp.slug].members;
    }

    // Add npm downloads
    const packageKey = Object.keys(packagesData).find(k => 
      k.toLowerCase().includes(comp.slug)
    );
    if (packageKey && packagesData[packageKey]) {
      profile.signals.npmDownloads = packagesData[packageKey].weeklyDownloads;
    }

    exported.competitors.push(profile);
  });

  // Sort by momentum score
  exported.competitors.sort((a, b) => b.momentum - a.momentum);

  // Add market summary
  const totalVSCodeInstalls = Object.values(vscodeData)
    .reduce((sum, d) => sum + (typeof d.installs === 'number' ? d.installs : parseInt(String(d.installs || 0).replace(/[^0-9]/g, '')) || 0), 0);
  
  exported.summary = {
    totalCompetitors: competitors.length,
    activeCompetitors: exported.competitors.filter(c => c.momentum > 0).length,
    totalVSCodeInstalls: formatNumber(totalVSCodeInstalls),
    topMover: exported.competitors[0]?.name || 'N/A'
  };

  // Add recent activity feed
  const newsData = loadJSON(path.join(DATA_DIR, 'news.json')) || {};
  const news = newsData.allRelevantArticles || newsData.newArticles || [];
  exported.recentActivity = news.slice(0, 10).map(n => ({
    title: n.title?.replace(/&#039;/g, "'") || 'News',
    source: n.source || 'News',
    date: n.pubDate || n.date,
    url: n.link || n.url
  }));

  // Write dashboard data
  const outputPath = path.join(SITE_DIR, 'dashboard.json');
  fs.writeFileSync(outputPath, JSON.stringify(exported, null, 2));
  console.log(`✅ Exported dashboard data to ${outputPath}`);

  // Also write momentum trend data
  const trendData = momentumHistory.slice(-7).map(entry => ({
    date: entry.date,
    scores: entry.scores
  }));
  fs.writeFileSync(
    path.join(SITE_DIR, 'momentum-trend.json'),
    JSON.stringify(trendData, null, 2)
  );
  console.log(`✅ Exported momentum trends`);

  return exported;
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Run
const data = exportDashboardData();
console.log(`\nDashboard data ready with ${data.competitors.length} competitors`);
