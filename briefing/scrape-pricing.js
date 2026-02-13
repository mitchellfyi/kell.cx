#!/usr/bin/env node
/**
 * Pricing Page Monitor
 * Tracks competitor pricing pages and detects changes
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const PRICING_FILE = path.join(DATA_DIR, 'pricing-history.json');

const PRICING_PAGES = [
  { 
    name: 'Cursor', 
    slug: 'cursor',
    url: 'https://cursor.com/pricing',
    selectors: ['pricing', 'price', 'plan', 'month', 'year', 'pro', 'business', 'enterprise']
  },
  { 
    name: 'Replit', 
    slug: 'replit',
    url: 'https://replit.com/pricing',
    selectors: ['pricing', 'price', 'plan', 'cycles', 'free', 'hacker', 'pro', 'teams']
  },
  {
    name: 'Devin',
    slug: 'cognition',
    url: 'https://cognition.ai',  // No dedicated pricing page yet
    selectors: ['pricing', 'waitlist', 'early access', 'beta']
  },
  {
    name: 'Windsurf (Codeium)',
    slug: 'windsurf',
    url: 'https://codeium.com/pricing',
    selectors: ['pricing', 'price', 'plan', 'free', 'individual', 'teams', 'enterprise', 'windsurf']
  },
  {
    name: 'GitHub Copilot',
    slug: 'copilot',
    url: 'https://github.com/features/copilot/plans',
    selectors: ['pricing', 'price', 'plan', 'free', 'pro', 'business', 'enterprise', 'copilot']
  },
  {
    name: 'Tabnine',
    slug: 'tabnine',
    url: 'https://www.tabnine.com/pricing',
    selectors: ['pricing', 'price', 'plan', 'starter', 'pro', 'enterprise']
  },
  {
    name: 'Amazon Q Developer',
    slug: 'amazonq',
    url: 'https://aws.amazon.com/q/developer/pricing/',
    selectors: ['pricing', 'price', 'plan', 'free', 'pro', 'tier']
  },
  {
    name: 'Sourcegraph Cody',
    slug: 'cody',
    url: 'https://sourcegraph.com/pricing',
    selectors: ['pricing', 'price', 'plan', 'free', 'pro', 'enterprise', 'cody']
  },
  {
    name: 'Continue',
    slug: 'continue',
    url: 'https://continue.dev',  // Open source, no pricing page
    selectors: ['free', 'open source', 'download']
  },
  {
    name: 'Supermaven',
    slug: 'supermaven',
    url: 'https://supermaven.com/pricing',
    selectors: ['pricing', 'price', 'plan', 'free', 'pro', 'team']
  },
  {
    name: 'Augment Code',
    slug: 'augment',
    url: 'https://www.augmentcode.com/pricing',
    selectors: ['pricing', 'price', 'plan', 'free', 'pro', 'enterprise']
  },
  {
    name: 'Lovable',
    slug: 'lovable',
    url: 'https://lovable.dev/pricing',
    selectors: ['pricing', 'price', 'plan', 'free', 'pro', 'team', 'enterprise']
  },
  {
    name: 'Poolside',
    slug: 'poolside',
    url: 'https://poolside.ai',  // No pricing page yet (enterprise)
    selectors: ['pricing', 'waitlist', 'early access', 'enterprise', 'contact']
  },
  {
    name: 'Bolt',
    slug: 'bolt',
    url: 'https://bolt.new/pricing',
    selectors: ['pricing', 'price', 'plan', 'free', 'pro', 'team', 'tokens', 'credits']
  },
  {
    name: 'v0',
    slug: 'v0',
    url: 'https://v0.dev/pricing',
    selectors: ['pricing', 'price', 'plan', 'free', 'pro', 'credits', 'generations']
  }
];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirect = res.headers.location.startsWith('http') 
          ? res.headers.location 
          : new URL(res.headers.location, url).href;
        return fetchPage(redirect).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function extractPricingInfo(html, selectors) {
  // Extract text content (strip HTML tags)
  const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                   .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                   .replace(/<[^>]+>/g, ' ')
                   .replace(/\s+/g, ' ')
                   .toLowerCase();
  
  // Extract price-like patterns ($XX, €XX, etc.)
  const prices = html.match(/[\$€£]\s*\d+(?:\.\d{2})?(?:\s*\/\s*(?:mo|month|year|yr))?/gi) || [];
  
  // Look for common pricing tier names
  const tiers = [];
  const tierPatterns = [/free/i, /pro/i, /business/i, /enterprise/i, /team/i, /starter/i, /premium/i, /basic/i];
  tierPatterns.forEach(p => {
    if (p.test(html)) tiers.push(p.source.replace(/\\/g, ''));
  });
  
  // Check for selector keywords
  const foundKeywords = selectors.filter(s => text.includes(s.toLowerCase()));
  
  return {
    prices: [...new Set(prices)].slice(0, 10),
    tiers: [...new Set(tiers)],
    keywords: foundKeywords,
    contentHash: crypto.createHash('md5').update(text.slice(0, 50000)).digest('hex')
  };
}

function loadHistory() {
  try {
    if (fs.existsSync(PRICING_FILE)) {
      return JSON.parse(fs.readFileSync(PRICING_FILE, 'utf8'));
    }
  } catch (e) {}
  return { lastUpdated: null, competitors: {} };
}

function saveHistory(history) {
  fs.writeFileSync(PRICING_FILE, JSON.stringify(history, null, 2));
}

async function scrapePricing() {
  const history = loadHistory();
  const results = [];
  
  for (const config of PRICING_PAGES) {
    const result = {
      name: config.name,
      slug: config.slug,
      url: config.url,
      scrapedAt: new Date().toISOString(),
      status: 'unknown',
      signals: []
    };
    
    try {
      const html = await fetchPage(config.url);
      const info = extractPricingInfo(html, config.selectors);
      
      result.prices = info.prices;
      result.tiers = info.tiers;
      result.contentHash = info.contentHash;
      result.status = 'success';
      
      // Compare with history
      const prev = history.competitors[config.slug];
      if (prev) {
        // Check for hash change (content changed)
        if (prev.contentHash && prev.contentHash !== info.contentHash) {
          result.signals.push('⚠️ Pricing page content changed');
          result.changed = true;
        }
        
        // Check for new prices
        const newPrices = info.prices.filter(p => !prev.prices?.includes(p));
        if (newPrices.length > 0) {
          result.signals.push(`💰 New prices detected: ${newPrices.join(', ')}`);
          result.changed = true;
        }
        
        // Check for removed prices
        const removedPrices = (prev.prices || []).filter(p => !info.prices.includes(p));
        if (removedPrices.length > 0) {
          result.signals.push(`🗑️ Prices removed: ${removedPrices.join(', ')}`);
          result.changed = true;
        }
        
        // Check for new tiers
        const newTiers = info.tiers.filter(t => !prev.tiers?.includes(t));
        if (newTiers.length > 0) {
          result.signals.push(`📦 New tier detected: ${newTiers.join(', ')}`);
          result.changed = true;
        }
      } else {
        result.signals.push('First scan - baseline established');
        result.isBaseline = true;
      }
      
      // Update history
      history.competitors[config.slug] = {
        prices: info.prices,
        tiers: info.tiers,
        contentHash: info.contentHash,
        lastChecked: result.scrapedAt
      };
      
    } catch (e) {
      result.status = 'error';
      result.error = e.message;
    }
    
    results.push(result);
  }
  
  history.lastUpdated = new Date().toISOString();
  saveHistory(history);
  
  return results;
}

// Export for use in daily-briefing.js
module.exports = { scrapePricing, PRICING_PAGES };

// CLI run
if (require.main === module) {
  scrapePricing().then(results => {
    console.log('\n💰 Pricing Page Monitor Results\n');
    results.forEach(r => {
      console.log(`${r.name} (${r.url})`);
      console.log(`  Status: ${r.status}`);
      if (r.prices?.length) console.log(`  Prices: ${r.prices.join(', ')}`);
      if (r.tiers?.length) console.log(`  Tiers: ${r.tiers.join(', ')}`);
      if (r.signals?.length) {
        console.log('  Signals:');
        r.signals.forEach(s => console.log(`    - ${s}`));
      }
      console.log('');
    });
  }).catch(console.error);
}
