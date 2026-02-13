#!/usr/bin/env node
/**
 * JetBrains Marketplace Scraper
 * Tracks AI coding tool adoption in IntelliJ ecosystem
 */

const fs = require('fs');
const path = require('path');

// Plugin IDs we want to track (from marketplace searches)
const PLUGINS = [
  { id: 17718, tool: 'GitHub Copilot', query: 'github copilot' },
  { id: 12798, tool: 'Tabnine', query: 'tabnine' },
  { id: 20540, tool: 'Codeium', query: 'codeium' },
  { id: 21206, tool: 'Amazon Q', query: 'amazon codewhisperer' },
  { id: 24691, tool: 'Supermaven', query: 'supermaven' },
  { id: 26064, tool: 'Sourcegraph Cody', query: 'sourcegraph cody' },
  { id: 13574, tool: 'Codota', query: 'codota' },
  { id: 25378, tool: 'Continue', query: 'continue dev' },
];

async function fetchPlugin(pluginId) {
  const url = `https://plugins.jetbrains.com/api/plugins/${pluginId}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function searchPlugin(query) {
  const url = `https://plugins.jetbrains.com/api/searchPlugins?search=${encodeURIComponent(query)}&max=5`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.plugins?.[0] || null;
}

async function main() {
  console.log('🔍 Fetching JetBrains Marketplace stats...\n');
  
  const results = [];
  const errors = [];
  
  for (const plugin of PLUGINS) {
    try {
      // Try direct ID first, fall back to search
      let data = await fetchPlugin(plugin.id);
      if (!data) {
        console.log(`  Searching for ${plugin.tool}...`);
        data = await searchPlugin(plugin.query);
      }
      
      if (data) {
        const result = {
          tool: plugin.tool,
          pluginId: data.id || plugin.id,
          name: data.name,
          downloads: data.downloads,
          rating: data.rating,
          ratingCount: data.ratesCount || 0,
          vendor: data.vendor?.name || 'Unknown',
          isVerified: data.vendor?.isVerified || false,
          pricingModel: data.pricingModel || 'FREE',
          lastUpdated: data.cdate ? new Date(data.cdate).toISOString() : null,
          link: `https://plugins.jetbrains.com/plugin/${data.id || plugin.id}`,
        };
        results.push(result);
        console.log(`  ✓ ${plugin.tool}: ${result.downloads.toLocaleString()} downloads`);
      } else {
        errors.push(`${plugin.tool}: Not found`);
        console.log(`  ✗ ${plugin.tool}: Not found`);
      }
    } catch (err) {
      errors.push(`${plugin.tool}: ${err.message}`);
      console.log(`  ✗ ${plugin.tool}: ${err.message}`);
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 200));
  }
  
  // Sort by downloads
  results.sort((a, b) => b.downloads - a.downloads);
  
  // Calculate market share
  const totalDownloads = results.reduce((sum, r) => sum + r.downloads, 0);
  results.forEach(r => {
    r.marketShare = totalDownloads > 0 ? ((r.downloads / totalDownloads) * 100).toFixed(1) : '0';
  });
  
  const output = {
    generatedAt: new Date().toISOString(),
    totalPlugins: results.length,
    totalDownloads,
    plugins: results,
    errors,
  };
  
  // Write to data directory
  const outPath = path.join(__dirname, '../site/data/jetbrains-stats.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n✓ Wrote ${outPath}`);
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total downloads: ${totalDownloads.toLocaleString()}`);
  console.log(`   Leader: ${results[0]?.tool} (${results[0]?.marketShare}%)`);
  
  return output;
}

main().catch(console.error);
