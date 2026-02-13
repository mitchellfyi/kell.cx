#!/usr/bin/env node
/**
 * Pricing Monitor - Detect pricing changes across AI coding tools
 * 
 * Scrapes official pricing pages and compares against stored baseline.
 * Run daily via cron to detect changes.
 * 
 * Usage: node scrapers/pricing-monitor.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const DATA_DIR = path.join(__dirname, '../data');
const BASELINE_PATH = path.join(DATA_DIR, 'pricing-baseline.json');
const CHANGES_PATH = path.join(DATA_DIR, 'pricing-changes.json');

// Pricing page configurations with selectors/patterns
const PRICING_SOURCES = [
  {
    name: 'Cursor',
    url: 'https://cursor.com/pricing',
    patterns: [
      /\$(\d+)\/mo/gi,
      /\$(\d+)\s*per\s*month/gi,
      /(\d+)\s*USD/gi
    ],
    expectedPrices: { pro: 20, business: 40 }
  },
  {
    name: 'GitHub Copilot',
    url: 'https://github.com/features/copilot/plans',
    patterns: [
      /\$(\d+)\s*\/\s*month/gi,
      /\$(\d+)\s*per\s*user/gi,
      /USD\s*(\d+)/gi
    ],
    expectedPrices: { individual: 10, business: 19, enterprise: 39 }
  },
  {
    name: 'Windsurf',
    url: 'https://codeium.com/pricing',
    patterns: [
      /\$(\d+)\/mo/gi,
      /\$(\d+)\s*per\s*month/gi
    ],
    expectedPrices: { pro: 10, team: 25 }
  },
  {
    name: 'Tabnine',
    url: 'https://www.tabnine.com/pricing',
    patterns: [
      /\$(\d+)\/mo/gi,
      /\$(\d+)\s*per\s*user/gi
    ],
    expectedPrices: { pro: 12, enterprise: 39 }
  },
  {
    name: 'Sourcegraph Cody',
    url: 'https://sourcegraph.com/pricing',
    patterns: [
      /\$(\d+)\/mo/gi,
      /\$(\d+)\s*per\s*user/gi
    ],
    expectedPrices: { pro: 9, enterprise: 19 }
  },
  {
    name: 'Amazon Q Developer',
    url: 'https://aws.amazon.com/q/developer/pricing/',
    patterns: [
      /\$(\d+(?:\.\d+)?)\s*per\s*user/gi,
      /USD\s*(\d+(?:\.\d+)?)/gi
    ],
    expectedPrices: { pro: 19, enterprise: 25 }
  },
  {
    name: 'JetBrains AI',
    url: 'https://www.jetbrains.com/ai/pricing/',
    patterns: [
      /\$(\d+(?:\.\d+)?)\s*\/\s*month/gi,
      /€(\d+(?:\.\d+)?)/gi,
      /(\d+(?:\.\d+)?)\s*USD/gi
    ],
    expectedPrices: { individual: 10, organization: 20 }
  },
  {
    name: 'Replit',
    url: 'https://replit.com/pricing',
    patterns: [
      /\$(\d+)\/mo/gi,
      /\$(\d+)\s*per\s*month/gi
    ],
    expectedPrices: { hacker: 7, pro: 25 }
  },
  {
    name: 'Devin',
    url: 'https://www.cognition.ai/pricing',
    patterns: [
      /\$(\d+)\/mo/gi,
      /\$(\d+(?:,\d+)?)\s*per\s*month/gi
    ],
    expectedPrices: { standard: 500 }
  },
  {
    name: 'v0.dev',
    url: 'https://v0.dev/pricing',
    patterns: [
      /\$(\d+)\/mo/gi,
      /\$(\d+)\s*per\s*month/gi
    ],
    expectedPrices: { premium: 20 }
  }
];

// Simple HTTPS/HTTP fetch
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BriefingBot/1.0; +https://kell.cx)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000
    };
    
    const req = protocol.get(url, options, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http') 
          ? res.headers.location 
          : new URL(res.headers.location, url).toString();
        return fetchPage(redirectUrl).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Extract prices from HTML content
function extractPrices(html, patterns) {
  const prices = new Set();
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  
  for (const pattern of patterns) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const price = parseFloat(match[1].replace(',', ''));
      if (price > 0 && price < 10000) { // Sanity check
        prices.add(price);
      }
    }
  }
  
  return Array.from(prices).sort((a, b) => a - b);
}

// Load baseline data
function loadBaseline() {
  if (fs.existsSync(BASELINE_PATH)) {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  }
  return {};
}

// Save baseline data
function saveBaseline(baseline) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2));
}

// Load existing changes
function loadChanges() {
  if (fs.existsSync(CHANGES_PATH)) {
    return JSON.parse(fs.readFileSync(CHANGES_PATH, 'utf8'));
  }
  return { changes: [], lastChecked: null };
}

// Save changes
function saveChanges(changes) {
  fs.writeFileSync(CHANGES_PATH, JSON.stringify(changes, null, 2));
}

// Compare prices and detect changes
function detectChanges(name, oldPrices, newPrices) {
  const changes = [];
  const oldSet = new Set(oldPrices || []);
  const newSet = new Set(newPrices);
  
  // New prices
  for (const price of newPrices) {
    if (!oldSet.has(price)) {
      changes.push({ type: 'added', price });
    }
  }
  
  // Removed prices
  for (const price of (oldPrices || [])) {
    if (!newSet.has(price)) {
      changes.push({ type: 'removed', price });
    }
  }
  
  return changes;
}

async function monitorPricing() {
  console.log('🔍 Pricing Monitor - Checking for changes...\n');
  
  const baseline = loadBaseline();
  const changesData = loadChanges();
  const newChanges = [];
  const results = [];
  
  for (const source of PRICING_SOURCES) {
    process.stdout.write(`  ${source.name}... `);
    
    try {
      const html = await fetchPage(source.url);
      const prices = extractPrices(html, source.patterns);
      
      const changes = detectChanges(source.name, baseline[source.name]?.prices, prices);
      
      if (changes.length > 0) {
        console.log(`⚠️  CHANGES DETECTED`);
        newChanges.push({
          tool: source.name,
          url: source.url,
          timestamp: new Date().toISOString(),
          oldPrices: baseline[source.name]?.prices || [],
          newPrices: prices,
          changes
        });
      } else if (prices.length === 0) {
        console.log(`⚠️  No prices found (may need selector update)`);
      } else {
        console.log(`✓ ${prices.length} prices (no changes)`);
      }
      
      // Update baseline
      baseline[source.name] = {
        prices,
        lastChecked: new Date().toISOString(),
        url: source.url
      };
      
      results.push({
        name: source.name,
        status: 'ok',
        prices,
        changes: changes.length
      });
      
    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
      results.push({
        name: source.name,
        status: 'error',
        error: error.message
      });
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Save updates
  saveBaseline(baseline);
  
  if (newChanges.length > 0) {
    changesData.changes = [...newChanges, ...changesData.changes].slice(0, 100);
  }
  changesData.lastChecked = new Date().toISOString();
  saveChanges(changesData);
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Checked: ${results.length} tools`);
  console.log(`   Changes: ${newChanges.length}`);
  console.log(`   Errors: ${results.filter(r => r.status === 'error').length}`);
  
  if (newChanges.length > 0) {
    console.log('\n🚨 PRICING CHANGES DETECTED:');
    for (const change of newChanges) {
      console.log(`\n   ${change.tool}:`);
      console.log(`   Old: ${change.oldPrices.join(', ') || 'none'}`);
      console.log(`   New: ${change.newPrices.join(', ')}`);
      for (const c of change.changes) {
        const symbol = c.type === 'added' ? '➕' : '➖';
        console.log(`   ${symbol} $${c.price} ${c.type}`);
      }
    }
  }
  
  return { results, changes: newChanges };
}

// Run if called directly
if (require.main === module) {
  monitorPricing().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { monitorPricing, PRICING_SOURCES };
