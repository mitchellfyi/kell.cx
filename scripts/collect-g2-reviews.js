#!/usr/bin/env node
/**
 * Collect G2 Crowd review data for AI coding tools
 * G2 is key for enterprise buying decisions
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// G2 product slugs for AI coding tools
const G2_PRODUCTS = [
  { name: 'GitHub Copilot', slug: 'github-copilot', category: 'IDE Plugin' },
  { name: 'Cursor', slug: 'cursor-ai', category: 'IDE' },
  { name: 'Codeium', slug: 'codeium', category: 'IDE Plugin' },
  { name: 'Tabnine', slug: 'tabnine', category: 'IDE Plugin' },
  { name: 'Amazon CodeWhisperer', slug: 'amazon-codewhisperer', category: 'IDE Plugin' },
  { name: 'Sourcegraph Cody', slug: 'sourcegraph-cody', category: 'IDE Plugin' },
  { name: 'Replit', slug: 'replit', category: 'Cloud IDE' },
  { name: 'JetBrains AI', slug: 'jetbrains-ai-assistant', category: 'IDE Plugin' },
  { name: 'Claude', slug: 'claude', category: 'Foundation' },
  { name: 'ChatGPT', slug: 'chatgpt', category: 'Foundation' },
];

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000,
    };
    
    https.get(url, options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

function extractG2Data(html, productName) {
  // Extract rating from structured data or page content
  const result = {
    name: productName,
    rating: null,
    reviewCount: null,
    satisfactionScore: null,
  };
  
  // Try JSON-LD structured data first
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  if (jsonLdMatch) {
    for (const match of jsonLdMatch) {
      try {
        const jsonStr = match.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, '');
        const data = JSON.parse(jsonStr);
        if (data.aggregateRating) {
          result.rating = parseFloat(data.aggregateRating.ratingValue);
          result.reviewCount = parseInt(data.aggregateRating.reviewCount);
        }
      } catch (e) {}
    }
  }
  
  // Fallback: parse from page HTML
  if (!result.rating) {
    // Look for rating in various formats
    const ratingMatch = html.match(/(\d\.\d)\s*out of\s*5\s*stars/i) ||
                       html.match(/rating['":\s]+(\d\.\d)/i) ||
                       html.match(/stars-(\d)-(\d)/);
    if (ratingMatch) {
      result.rating = parseFloat(ratingMatch[1] + (ratingMatch[2] ? '.' + ratingMatch[2] : ''));
    }
  }
  
  if (!result.reviewCount) {
    const reviewMatch = html.match(/(\d[\d,]*)\s*reviews?/i) ||
                        html.match(/reviewCount['":\s]+(\d+)/i);
    if (reviewMatch) {
      result.reviewCount = parseInt(reviewMatch[1].replace(/,/g, ''));
    }
  }
  
  // Look for satisfaction percentage
  const satMatch = html.match(/(\d{1,3})%\s*(?:would recommend|satisfaction|likely to recommend)/i);
  if (satMatch) {
    result.satisfactionScore = parseInt(satMatch[1]);
  }
  
  return result;
}

async function collectG2Stats() {
  console.log('Collecting G2 review data...\n');
  
  const results = [];
  const errors = [];
  
  for (const product of G2_PRODUCTS) {
    const url = `https://www.g2.com/products/${product.slug}/reviews`;
    console.log(`Fetching ${product.name}...`);
    
    try {
      const response = await fetchPage(url);
      
      if (response.status === 200) {
        const data = extractG2Data(response.body, product.name);
        data.slug = product.slug;
        data.category = product.category;
        data.url = url;
        
        if (data.rating || data.reviewCount) {
          results.push(data);
          console.log(`  ✓ Rating: ${data.rating || 'N/A'}, Reviews: ${data.reviewCount || 'N/A'}`);
        } else {
          console.log(`  ⚠ Could not extract data`);
          errors.push(`${product.name}: Could not parse page`);
        }
      } else {
        console.log(`  ✗ HTTP ${response.status}`);
        errors.push(`${product.name}: HTTP ${response.status}`);
      }
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      errors.push(`${product.name}: ${err.message}`);
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 1500));
  }
  
  // Sort by rating
  results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  
  const output = {
    generatedAt: new Date().toISOString(),
    productCount: results.length,
    products: results,
    errors: errors,
    summary: {
      avgRating: results.length > 0 
        ? (results.reduce((sum, p) => sum + (p.rating || 0), 0) / results.filter(p => p.rating).length).toFixed(2)
        : null,
      totalReviews: results.reduce((sum, p) => sum + (p.reviewCount || 0), 0),
      topRated: results[0]?.name || null,
      mostReviewed: [...results].sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))[0]?.name || null,
    }
  };
  
  // Write JSON
  const outPath = path.join(__dirname, '../site/data/g2-stats.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nSaved to ${outPath}`);
  
  // Print summary
  console.log('\n=== G2 Review Summary ===');
  console.log(`Products: ${output.productCount}`);
  console.log(`Avg Rating: ${output.summary.avgRating}/5`);
  console.log(`Total Reviews: ${output.summary.totalReviews.toLocaleString()}`);
  console.log(`Top Rated: ${output.summary.topRated}`);
  console.log(`Most Reviewed: ${output.summary.mostReviewed}`);
  
  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach(e => console.log(`  - ${e}`));
  }
  
  return output;
}

collectG2Stats().catch(console.error);
