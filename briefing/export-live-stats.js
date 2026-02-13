#!/usr/bin/env node
/**
 * Export live stats for the landing page
 * Shows real numbers from our monitoring to demonstrate product value
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const OUTPUT_FILE = path.join(__dirname, '..', 'kell-cx', 'site', 'data', 'live-stats.json');

function loadJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  } catch (e) {
    return null;
  }
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toString();
}

async function main() {
  const stats = {
    generatedAt: new Date().toISOString(),
    highlights: [],
    vsCodeLeaders: [],
    hiringLeaders: [],
    topRated: []
  };

  // VS Code marketplace data
  const vscode = loadJSON('vscode-marketplace.json');
  if (vscode) {
    const extensions = Object.entries(vscode)
      .map(([id, data]) => ({
        id,
        name: id.split('.')[1] || id,
        installs: data.installs,
        rating: parseFloat(data.averageRating) || 0
      }))
      .sort((a, b) => b.installs - a.installs);

    stats.vsCodeLeaders = extensions.slice(0, 5).map(e => ({
      name: e.name === 'copilot' ? 'GitHub Copilot' : 
            e.name === 'copilot-chat' ? 'Copilot Chat' :
            e.name === 'codeium' ? 'Codeium' :
            e.name === 'tabnine-vscode' ? 'Tabnine' :
            e.name === 'amazon-q-vscode' ? 'Amazon Q' :
            e.name === 'cody-ai' ? 'Cody' :
            e.name === 'continue' ? 'Continue' :
            e.name === 'supermaven' ? 'Supermaven' : e.name,
      installs: formatNumber(e.installs),
      installsRaw: e.installs,
      rating: e.rating.toFixed(2)
    }));

    // Find top rated
    const topRated = [...extensions].sort((a, b) => b.rating - a.rating).slice(0, 3);
    stats.topRated = topRated.map(e => ({
      name: e.name === 'codeium' ? 'Codeium' :
            e.name === 'copilot' ? 'GitHub Copilot' :
            e.name === 'amazon-q-vscode' ? 'Amazon Q' : e.name,
      rating: e.rating.toFixed(2)
    }));

    stats.highlights.push({
      type: 'installs',
      text: `${formatNumber(extensions[0].installs)} VS Code installs`,
      subject: 'GitHub Copilot',
      icon: '📊'
    });
  }

  // Jobs data
  const jobs = loadJSON('jobs-2026-02-11.json') || {};
  const hiringCompanies = Object.entries(jobs)
    .filter(([_, data]) => data.estimatedCount > 0)
    .map(([key, data]) => ({
      key,
      name: data.company,
      count: data.estimatedCount,
      signals: data.signals || []
    }))
    .sort((a, b) => b.count - a.count);

  stats.hiringLeaders = hiringCompanies.slice(0, 5).map(c => ({
    name: c.name,
    openRoles: c.count,
    signal: c.signals[0] || `${c.count}+ open roles`
  }));

  if (hiringCompanies.length > 0) {
    const top = hiringCompanies[0];
    stats.highlights.push({
      type: 'hiring',
      text: `${top.count}+ open roles`,
      subject: top.name,
      icon: '💼'
    });
  }

  // Momentum scores
  const momentum = loadJSON('momentum-history.json');
  if (momentum && momentum.length > 0) {
    const latest = momentum[momentum.length - 1].scores;
    const leaders = Object.entries(latest)
      .filter(([_, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (leaders.length > 0) {
      const nameMap = {
        copilot: 'GitHub Copilot',
        cursor: 'Cursor',
        tabnine: 'Tabnine',
        windsurf: 'Windsurf',
        continue: 'Continue',
        cody: 'Cody'
      };
      stats.highlights.push({
        type: 'momentum',
        text: `Momentum score: ${leaders[0][1]}`,
        subject: nameMap[leaders[0][0]] || leaders[0][0],
        icon: '🚀'
      });
    }
  }

  // Discord data
  const discordDir = path.join(DATA_DIR, 'discord');
  if (fs.existsSync(discordDir)) {
    try {
      const discordFiles = fs.readdirSync(discordDir).filter(f => f.endsWith('.json'));
      let totalMembers = 0;
      let largestCommunity = { name: '', members: 0 };
      
      for (const file of discordFiles) {
        const data = loadJSON(`discord/${file}`);
        if (data && data.memberCount) {
          totalMembers += data.memberCount;
          if (data.memberCount > largestCommunity.members) {
            largestCommunity = { 
              name: data.name || file.replace('.json', ''), 
              members: data.memberCount 
            };
          }
        }
      }
      
      if (largestCommunity.members > 0) {
        stats.highlights.push({
          type: 'community',
          text: `${formatNumber(largestCommunity.members)} Discord members`,
          subject: largestCommunity.name,
          icon: '💬'
        });
      }
    } catch (e) {}
  }

  // Summary stats
  stats.summary = {
    competitorsTracked: 15,
    dataSourcesMonitored: 12,
    lastUpdated: new Date().toISOString()
  };

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(stats, null, 2));
  console.log('✅ Exported live stats to', OUTPUT_FILE);
  console.log('   Highlights:', stats.highlights.length);
  console.log('   VS Code leaders:', stats.vsCodeLeaders.length);
  console.log('   Hiring leaders:', stats.hiringLeaders.length);
}

main().catch(console.error);
