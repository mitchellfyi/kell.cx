#!/usr/bin/env node
/**
 * Collect Homebrew install stats for AI coding CLI tools
 * Homebrew formulae API provides 30d/90d/365d install counts
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// CLI tools available on Homebrew
const HOMEBREW_FORMULAE = [
  { name: 'Aider', formula: 'aider', category: 'Coding Agent' },
  { name: 'Claude Code', formula: 'claude-cli', category: 'Coding Agent' },
  { name: 'Continue', formula: 'continue-cli', category: 'IDE Plugin' },
  { name: 'LangChain CLI', formula: 'langchain-cli', category: 'Framework' },
  { name: 'Ollama', formula: 'ollama', category: 'Local LLM' },
  { name: 'LMStudio', formula: 'lm-studio', category: 'Local LLM' },
  { name: 'llm', formula: 'llm', category: 'CLI Tool' },
  { name: 'sgpt', formula: 'shell-gpt', category: 'CLI Tool' },
  { name: 'Fabric', formula: 'fabric', category: 'CLI Tool' },
  { name: 'gh', formula: 'gh', category: 'Dev Tool' },
  { name: 'glab', formula: 'glab', category: 'Dev Tool' },
];

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 10000 }, (res) => {
      if (res.statusCode === 404) {
        return resolve(null);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function collectHomebrewStats() {
  console.log('Collecting Homebrew install stats...\n');
  
  const results = [];
  const errors = [];
  
  for (const tool of HOMEBREW_FORMULAE) {
    const url = `https://formulae.brew.sh/api/formula/${tool.formula}.json`;
    console.log(`Fetching ${tool.name} (${tool.formula})...`);
    
    try {
      const data = await fetchJSON(url);
      
      if (data && data.analytics && data.analytics.install) {
        const installs = data.analytics.install;
        const result = {
          name: tool.name,
          formula: tool.formula,
          category: tool.category,
          version: data.versions?.stable || 'unknown',
          description: data.desc || '',
          homepage: data.homepage || '',
          installs30d: Object.values(installs['30d'] || {}).reduce((a, b) => a + b, 0),
          installs90d: Object.values(installs['90d'] || {}).reduce((a, b) => a + b, 0),
          installs365d: Object.values(installs['365d'] || {}).reduce((a, b) => a + b, 0),
        };
        
        // Calculate growth (30d as % of 90d = recent momentum)
        if (result.installs90d > 0) {
          result.recentMomentum = Math.round((result.installs30d / (result.installs90d / 3)) * 100);
        }
        
        results.push(result);
        console.log(`  ✓ 30d: ${result.installs30d.toLocaleString()}, 90d: ${result.installs90d.toLocaleString()}, 365d: ${result.installs365d.toLocaleString()}`);
      } else {
        console.log(`  ⚠ Not found or no analytics`);
        errors.push(`${tool.name}: Not found on Homebrew`);
      }
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      errors.push(`${tool.name}: ${err.message}`);
    }
    
    // Small delay to be nice
    await new Promise(r => setTimeout(r, 300));
  }
  
  // Sort by 30d installs
  results.sort((a, b) => b.installs30d - a.installs30d);
  
  const output = {
    generatedAt: new Date().toISOString(),
    toolCount: results.length,
    tools: results,
    errors: errors,
    summary: {
      total30d: results.reduce((sum, t) => sum + t.installs30d, 0),
      total90d: results.reduce((sum, t) => sum + t.installs90d, 0),
      total365d: results.reduce((sum, t) => sum + t.installs365d, 0),
      topByInstalls: results[0]?.name || null,
      fastestGrowing: [...results].sort((a, b) => (b.recentMomentum || 0) - (a.recentMomentum || 0))[0]?.name || null,
    }
  };
  
  // Write JSON
  const outPath = path.join(__dirname, '../site/data/homebrew-stats.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nSaved to ${outPath}`);
  
  // Print summary
  console.log('\n=== Homebrew Install Summary ===');
  console.log(`Tools tracked: ${output.toolCount}`);
  console.log(`Total 30d installs: ${output.summary.total30d.toLocaleString()}`);
  console.log(`Total 365d installs: ${output.summary.total365d.toLocaleString()}`);
  console.log(`Top by installs: ${output.summary.topByInstalls}`);
  console.log(`Fastest growing: ${output.summary.fastestGrowing}`);
  
  if (errors.length > 0) {
    console.log(`\nNot found (${errors.length}):`);
    errors.forEach(e => console.log(`  - ${e}`));
  }
  
  return output;
}

collectHomebrewStats().catch(console.error);
