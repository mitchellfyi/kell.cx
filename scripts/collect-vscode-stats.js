#!/usr/bin/env node
/**
 * Fetch VS Code Marketplace extension stats for AI coding tools
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const EXTENSIONS = [
  { id: 'GitHub.copilot', name: 'GitHub Copilot', category: 'AI Coding' },
  { id: 'GitHub.copilot-chat', name: 'GitHub Copilot Chat', category: 'AI Coding' },
  { id: 'Codeium.codeium', name: 'Codeium', category: 'AI Coding' },
  { id: 'Continue.continue', name: 'Continue', category: 'AI Coding' },
  { id: 'saoudrizwan.claude-dev', name: 'Cline', category: 'AI Coding' },
  { id: 'TabNine.tabnine-vscode', name: 'Tabnine', category: 'AI Coding' },
  { id: 'AmazonWebServices.aws-toolkit-vscode', name: 'AWS Toolkit (CodeWhisperer)', category: 'AI Coding' },
  { id: 'Sourcegraph.cody-ai', name: 'Cody', category: 'AI Coding' },
  { id: 'blackboxapp.blackbox', name: 'Blackbox AI', category: 'AI Coding' },
  { id: 'Supermaven.supermaven', name: 'Supermaven', category: 'AI Coding' },
  { id: 'codestory-ghost.codestoryai', name: 'CodeStory (Aide)', category: 'AI Coding' },
  { id: 'phind.phind', name: 'Phind', category: 'AI Coding' },
  { id: 'devin.devin-ai', name: 'Devin', category: 'AI Coding' },
];

function fetchExtension(extId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      filters: [{
        criteria: [{ filterType: 7, value: extId }],
        pageNumber: 1,
        pageSize: 1,
        sortBy: 0,
        sortOrder: 0
      }],
      assetTypes: [],
      flags: 914 // Include statistics
    });

    const options = {
      hostname: 'marketplace.visualstudio.com',
      port: 443,
      path: '/_apis/public/gallery/extensionquery',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json;api-version=6.1-preview.1',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const ext = json.results?.[0]?.extensions?.[0];
          if (!ext) {
            resolve(null);
            return;
          }

          const stats = ext.statistics || [];
          const getStat = (name) => stats.find(s => s.statisticName === name)?.value || 0;

          resolve({
            id: extId,
            name: ext.displayName,
            publisher: ext.publisher?.displayName,
            version: ext.versions?.[0]?.version,
            lastUpdated: ext.versions?.[0]?.lastUpdated,
            installs: getStat('install'),
            averageRating: getStat('averagerating'),
            ratingCount: getStat('ratingcount'),
            trendingDaily: getStat('trendingdaily'),
            trendingWeekly: getStat('trendingweekly'),
            trendingMonthly: getStat('trendingmonthly'),
          });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Fetching VS Code Marketplace stats...');
  
  const results = [];
  const errors = [];

  for (const ext of EXTENSIONS) {
    try {
      const data = await fetchExtension(ext.id);
      if (data) {
        results.push({ ...data, category: ext.category });
        console.log(`  ✓ ${ext.name}: ${data.installs.toLocaleString()} installs`);
      } else {
        errors.push({ id: ext.id, error: 'Not found' });
        console.log(`  ✗ ${ext.name}: Not found`);
      }
    } catch (e) {
      errors.push({ id: ext.id, error: e.message });
      console.log(`  ✗ ${ext.name}: ${e.message}`);
    }
    // Small delay to be nice to the API
    await new Promise(r => setTimeout(r, 200));
  }

  // Sort by installs
  results.sort((a, b) => b.installs - a.installs);

  const output = {
    generatedAt: new Date().toISOString(),
    extensionCount: results.length,
    totalInstalls: results.reduce((sum, r) => sum + r.installs, 0),
    extensions: results,
    errors
  };

  const outPath = path.join(__dirname, '../site/data/vscode-stats.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nSaved to ${outPath}`);
  console.log(`Total: ${output.totalInstalls.toLocaleString()} installs across ${output.extensionCount} extensions`);
}

main().catch(console.error);
