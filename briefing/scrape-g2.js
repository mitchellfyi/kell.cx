#!/usr/bin/env node
// G2 Review Monitoring - tracks customer sentiment and ratings

const https = require('https');
const fs = require('fs');
const path = require('path');

const G2_PRODUCTS = [
  { name: 'Cursor', slug: 'cursor-ai' },
  { name: 'GitHub Copilot', slug: 'github-copilot' },
  { name: 'Replit', slug: 'replit' },
  { name: 'Tabnine', slug: 'tabnine' },
  { name: 'Amazon Q', slug: 'amazon-codewhisperer' },
  { name: 'Sourcegraph Cody', slug: 'sourcegraph-cody' },
  { name: 'Windsurf', slug: 'codeium' }, // Windsurf is Codeium product
  { name: 'Continue', slug: 'continue-dev' },
];

const DATA_DIR = path.join(__dirname, 'data');
const CACHE_FILE = path.join(DATA_DIR, 'g2-cache.json');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (compatible; BriefingBot/1.0)',
        'Accept': 'text/html'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function extractRating(html) {
  // Look for rating in G2 page structure
  const ratingMatch = html.match(/(\d+\.?\d*)\s*(?:out of 5|\/\s*5)/i) ||
                      html.match(/data-rating="(\d+\.?\d*)"/i) ||
                      html.match(/"ratingValue"[:\s]*"?(\d+\.?\d*)"?/i);
  return ratingMatch ? parseFloat(ratingMatch[1]) : null;
}

function extractReviewCount(html) {
  const countMatch = html.match(/(\d+(?:,\d+)*)\s*reviews?/i) ||
                     html.match(/"reviewCount"[:\s]*"?(\d+)"?/i);
  if (countMatch) {
    return parseInt(countMatch[1].replace(/,/g, ''));
  }
  return null;
}

function extractRecentReviews(html) {
  const reviews = [];
  // Try to find review snippets
  const snippetMatches = html.match(/"reviewBody"[:\s]*"([^"]+)"/g);
  if (snippetMatches) {
    snippetMatches.slice(0, 3).forEach(m => {
      const text = m.match(/"reviewBody"[:\s]*"([^"]+)"/);
      if (text) reviews.push(text[1].substring(0, 200));
    });
  }
  return reviews;
}

async function scrapeG2Product(product) {
  const url = `https://www.g2.com/products/${product.slug}/reviews`;
  try {
    const html = await fetch(url);
    const rating = extractRating(html);
    const reviewCount = extractReviewCount(html);
    const recentReviews = extractRecentReviews(html);
    
    return {
      name: product.name,
      slug: product.slug,
      url: url,
      rating,
      reviewCount,
      recentReviews,
      scrapedAt: new Date().toISOString()
    };
  } catch (err) {
    return {
      name: product.name,
      slug: product.slug,
      error: err.message,
      scrapedAt: new Date().toISOString()
    };
  }
}

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function saveCache(cache) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function detectChanges(current, previous) {
  const changes = [];
  if (!previous) return changes;
  
  if (current.rating && previous.rating && current.rating !== previous.rating) {
    const diff = (current.rating - previous.rating).toFixed(1);
    const direction = diff > 0 ? '📈' : '📉';
    changes.push(`${direction} Rating changed: ${previous.rating} → ${current.rating}`);
  }
  
  if (current.reviewCount && previous.reviewCount) {
    const newReviews = current.reviewCount - previous.reviewCount;
    if (newReviews > 0) {
      changes.push(`📝 ${newReviews} new reviews since last check`);
    }
  }
  
  return changes;
}

async function main() {
  const cache = loadCache();
  const results = [];
  
  console.log('Scraping G2 reviews for AI coding tools...\n');
  
  for (const product of G2_PRODUCTS) {
    console.log(`Checking ${product.name}...`);
    const data = await scrapeG2Product(product);
    const previous = cache[product.slug];
    data.changes = detectChanges(data, previous);
    results.push(data);
    cache[product.slug] = { ...data, changes: undefined };
    
    // Rate limit
    await new Promise(r => setTimeout(r, 1000));
  }
  
  saveCache(cache);
  
  // Output summary
  console.log('\n=== G2 Review Summary ===\n');
  for (const r of results) {
    if (r.error) {
      console.log(`${r.name}: Error - ${r.error}`);
    } else {
      console.log(`${r.name}: ${r.rating || 'N/A'}/5 (${r.reviewCount || '?'} reviews)`);
      if (r.changes && r.changes.length > 0) {
        r.changes.forEach(c => console.log(`  ${c}`));
      }
    }
  }
  
  // Save results for briefing integration
  const outputFile = path.join(DATA_DIR, 'g2-latest.json');
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to ${outputFile}`);
  
  return results;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, scrapeG2Product, G2_PRODUCTS };
