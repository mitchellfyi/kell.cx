/**
 * Product Hunt Scraper
 * Monitors for new AI coding tool launches
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// Keywords to track
const KEYWORDS = [
  'ai coding', 'ai code', 'code assistant', 'copilot', 'code completion',
  'ai developer', 'ai programming', 'code generation', 'ai ide', 'ai editor',
  'cursor', 'devin', 'replit', 'windsurf', 'codeium', 'tabnine', 'copilot'
];

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function scrapeProductHunt() {
  const results = {
    launches: [],
    signals: [],
    scrapedAt: new Date().toISOString()
  };

  // Scrape homepage and AI topic page
  const urls = [
    'https://www.producthunt.com/',
    'https://www.producthunt.com/topics/artificial-intelligence',
    'https://www.producthunt.com/topics/developer-tools'
  ];

  for (const url of urls) {
    try {
      const html = await fetchPage(url);
      
      // Extract product cards/listings
      // PH uses data attributes and structured patterns
      const productMatches = html.matchAll(/data-test="post-name"[^>]*>([^<]+)</gi);
      const taglineMatches = html.matchAll(/data-test="post-tagline"[^>]*>([^<]+)</gi);
      
      // Alternative: look for common patterns in their HTML
      const titlePattern = /<h3[^>]*>([^<]+)<\/h3>/gi;
      const titles = [];
      let match;
      while ((match = titlePattern.exec(html)) !== null) {
        titles.push(match[1].trim());
      }

      // Look for product listings with descriptions
      const productBlocks = html.matchAll(/<a[^>]*href="\/posts\/([^"]+)"[^>]*>[\s\S]*?<\/a>/gi);
      
      // Extract product names and check for keywords
      const productPattern = /\/posts\/([a-z0-9-]+)/gi;
      const productSlugs = new Set();
      while ((match = productPattern.exec(html)) !== null) {
        productSlugs.add(match[1]);
      }

      // Search for AI coding related terms in page content
      const lowerHtml = html.toLowerCase();
      for (const keyword of KEYWORDS) {
        if (lowerHtml.includes(keyword)) {
          // Find context around keyword
          const idx = lowerHtml.indexOf(keyword);
          const context = html.substring(Math.max(0, idx - 100), Math.min(html.length, idx + 150));
          
          // Extract any product name nearby
          const nearbyTitle = context.match(/<h[23][^>]*>([^<]+)<\/h[23]>/i);
          if (nearbyTitle && !results.launches.some(l => l.name === nearbyTitle[1])) {
            results.launches.push({
              name: nearbyTitle[1].trim(),
              matchedKeyword: keyword,
              source: url.includes('artificial') ? 'AI topic' : url.includes('developer') ? 'Dev tools' : 'Homepage'
            });
          }
        }
      }
    } catch (e) {
      console.log(`  PH scrape error for ${url}: ${e.message}`);
    }
  }

  // Also check the specific "new" and "trending" sections
  try {
    const trendingHtml = await fetchPage('https://www.producthunt.com/leaderboard/daily/2026/2/11');
    const lowerHtml = trendingHtml.toLowerCase();
    
    // Look for AI/coding related launches in daily leaderboard
    for (const keyword of KEYWORDS) {
      if (lowerHtml.includes(keyword)) {
        results.signals.push(`Product Hunt trending mentions "${keyword}" today`);
        break; // One signal is enough
      }
    }
  } catch (e) {
    // Daily page might not exist, that's fine
  }

  // Deduplicate and limit
  results.launches = results.launches.slice(0, 10);
  
  // Generate signals
  if (results.launches.length > 0) {
    results.signals.push(`${results.launches.length} potential AI coding tools on Product Hunt`);
  }

  // Save data
  const dataFile = path.join(DATA_DIR, 'producthunt.json');
  fs.writeFileSync(dataFile, JSON.stringify(results, null, 2));

  return results;
}

module.exports = { scrapeProductHunt };

// Run directly
if (require.main === module) {
  scrapeProductHunt()
    .then(r => {
      console.log('Product Hunt results:', JSON.stringify(r, null, 2));
    })
    .catch(console.error);
}
