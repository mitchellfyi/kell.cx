#!/usr/bin/env node

/**
 * VS Code Marketplace Scraper
 * Tracks download counts, ratings, and recent reviews for AI coding tool extensions
 * Provides direct competitive intelligence on developer adoption
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// VS Code extension identifiers for competitors
const EXTENSIONS = [
  { name: 'GitHub Copilot', id: 'GitHub.copilot', competitor: 'GitHub Copilot' },
  { name: 'GitHub Copilot Chat', id: 'GitHub.copilot-chat', competitor: 'GitHub Copilot' },
  { name: 'Cursor', id: 'anysphere.cursor', competitor: 'Cursor' },  // If they have one
  { name: 'Codeium', id: 'Codeium.codeium', competitor: 'Windsurf/Codeium' },
  { name: 'Tabnine', id: 'TabNine.tabnine-vscode', competitor: 'Tabnine' },
  { name: 'Amazon Q', id: 'AmazonWebServices.amazon-q-vscode', competitor: 'Amazon Q Developer' },
  { name: 'Sourcegraph Cody', id: 'sourcegraph.cody-ai', competitor: 'Sourcegraph Cody' },
  { name: 'Continue', id: 'Continue.continue', competitor: 'Continue.dev' },
  { name: 'Supermaven', id: 'supermaven.supermaven', competitor: 'Supermaven' },
  { name: 'Augment', id: 'AugmentAI.augment', competitor: 'Augment Code' },
];

// Fetch extension stats from VS Code Marketplace API
async function fetchExtensionStats(extensionId) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      assetTypes: [],
      filters: [{
        criteria: [{ filterType: 7, value: extensionId }],
        direction: 2,
        pageSize: 1,
        pageNumber: 1,
        sortBy: 0,
        sortOrder: 0,
      }],
      flags: 0x200 | 0x100 | 0x80 | 0x10 | 0x4 | 0x2 | 0x1  // Include stats, versions, etc.
    });

    const options = {
      hostname: 'marketplace.visualstudio.com',
      path: '/_apis/public/gallery/extensionquery',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;api-version=7.1-preview.1',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Parse extension response to extract key metrics
function parseExtensionData(response, extensionInfo) {
  const extensions = response?.results?.[0]?.extensions || [];
  if (extensions.length === 0) {
    return { name: extensionInfo.name, competitor: extensionInfo.competitor, found: false };
  }

  const ext = extensions[0];
  const stats = ext.statistics || [];
  
  // Extract key stats
  const getStatValue = (name) => {
    const stat = stats.find(s => s.statisticName === name);
    return stat ? stat.value : 0;
  };

  const installs = getStatValue('install');
  const downloads = getStatValue('updateCount') + installs;
  const averageRating = getStatValue('averagerating');
  const ratingCount = getStatValue('ratingcount');
  const weightedRating = getStatValue('weightedRating');

  // Get latest version info
  const versions = ext.versions || [];
  const latestVersion = versions[0];
  const lastUpdated = latestVersion?.lastUpdated;

  return {
    name: extensionInfo.name,
    competitor: extensionInfo.competitor,
    extensionId: extensionInfo.id,
    found: true,
    displayName: ext.displayName,
    publisher: ext.publisher?.displayName,
    installs,
    downloads,
    averageRating: averageRating ? averageRating.toFixed(2) : 'N/A',
    ratingCount,
    latestVersion: latestVersion?.version,
    lastUpdated: lastUpdated ? new Date(lastUpdated).toISOString().split('T')[0] : 'N/A',
  };
}

// Format number with K/M suffix
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
  return num.toString();
}

// Main scrape function
async function scrapeVSCodeMarketplace() {
  console.log('🔌 Scraping VS Code Marketplace...\n');
  
  const results = [];
  const changes = [];
  
  // Load previous data for comparison
  const dataPath = path.join(__dirname, 'data', 'vscode-marketplace.json');
  let previousData = {};
  try {
    previousData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (e) {
    // First run
  }

  for (const ext of EXTENSIONS) {
    try {
      console.log(`  Fetching ${ext.name}...`);
      const response = await fetchExtensionStats(ext.id);
      const data = parseExtensionData(response, ext);
      results.push(data);

      if (data.found) {
        console.log(`    ✓ ${formatNumber(data.installs)} installs, ${data.averageRating}★ (${data.ratingCount} ratings)`);
        
        // Compare with previous
        const prev = previousData[ext.id];
        if (prev) {
          const installDiff = data.installs - (prev.installs || 0);
          const ratingDiff = parseFloat(data.averageRating) - parseFloat(prev.averageRating || 0);
          
          if (installDiff > 10000) {
            changes.push({
              type: 'installs_surge',
              extension: data.name,
              competitor: data.competitor,
              change: `+${formatNumber(installDiff)} installs since last check`,
            });
          }
          
          if (Math.abs(ratingDiff) >= 0.1) {
            changes.push({
              type: 'rating_change',
              extension: data.name,
              competitor: data.competitor,
              change: `Rating ${ratingDiff > 0 ? 'up' : 'down'} ${Math.abs(ratingDiff).toFixed(2)} to ${data.averageRating}★`,
            });
          }
          
          // Check for version update
          if (prev.latestVersion && prev.latestVersion !== data.latestVersion) {
            changes.push({
              type: 'version_update',
              extension: data.name,
              competitor: data.competitor,
              change: `Updated from ${prev.latestVersion} to ${data.latestVersion}`,
            });
          }
        }
      } else {
        console.log(`    ✗ Extension not found`);
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.log(`    ✗ Error: ${e.message}`);
      results.push({ name: ext.name, competitor: ext.competitor, found: false, error: e.message });
    }
  }

  // Save current data
  const currentData = {};
  for (const r of results) {
    if (r.found) {
      currentData[r.extensionId] = {
        installs: r.installs,
        averageRating: r.averageRating,
        ratingCount: r.ratingCount,
        latestVersion: r.latestVersion,
        lastChecked: new Date().toISOString(),
      };
    }
  }
  
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2));

  return { results, changes };
}

// Generate markdown section for briefing
function generateBriefingSection(results, changes) {
  let md = '\n## 🔌 VS Code Marketplace\n\n';

  // Sort by installs
  const found = results.filter(r => r.found).sort((a, b) => b.installs - a.installs);
  
  if (found.length === 0) {
    md += '*No extension data available*\n';
    return md;
  }

  // Changes first
  if (changes.length > 0) {
    md += '### Changes Detected\n';
    for (const c of changes) {
      const icon = c.type === 'version_update' ? '🆕' : c.type === 'installs_surge' ? '📈' : '⭐';
      md += `- ${icon} **${c.extension}**: ${c.change}\n`;
    }
    md += '\n';
  }

  // Leaderboard
  md += '### Install Rankings\n';
  md += '| Extension | Installs | Rating | Last Updated |\n';
  md += '|-----------|----------|--------|-------------|\n';
  
  for (const ext of found) {
    md += `| ${ext.name} | ${formatNumber(ext.installs)} | ${ext.averageRating}★ (${formatNumber(ext.ratingCount)}) | ${ext.lastUpdated} |\n`;
  }

  return md;
}

// Main
async function main() {
  try {
    const { results, changes } = await scrapeVSCodeMarketplace();
    
    console.log('\n📊 Summary:');
    console.log(`  Found: ${results.filter(r => r.found).length}/${results.length} extensions`);
    console.log(`  Changes: ${changes.length}`);
    
    // Output briefing section
    const section = generateBriefingSection(results, changes);
    console.log('\n--- Briefing Section ---');
    console.log(section);
    
    // Save section for daily briefing to include
    const sectionPath = path.join(__dirname, 'data', 'vscode-section.md');
    fs.writeFileSync(sectionPath, section);
    console.log(`\nSection saved to ${sectionPath}`);

    return { results, changes, section };
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

// Export for use by daily-briefing.js
module.exports = { scrapeVSCodeMarketplace, generateBriefingSection };

if (require.main === module) {
  main();
}
