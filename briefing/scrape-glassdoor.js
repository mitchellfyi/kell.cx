#!/usr/bin/env node
// Glassdoor Company Monitoring - tracks employee satisfaction and hiring signals

const https = require('https');
const fs = require('fs');
const path = require('path');

const GLASSDOOR_COMPANIES = [
  { name: 'Cursor', slug: 'anysphere', displayName: 'Anysphere' }, // Cursor's parent company
  { name: 'Cognition AI', slug: 'cognition-ai', displayName: 'Cognition AI' }, // Devin
  { name: 'Replit', slug: 'replit', displayName: 'Replit' },
  { name: 'Codeium', slug: 'codeium', displayName: 'Codeium' }, // Windsurf
  { name: 'GitHub', slug: 'github', displayName: 'GitHub' }, // Copilot
  { name: 'Tabnine', slug: 'tabnine', displayName: 'Tabnine' },
  { name: 'Sourcegraph', slug: 'sourcegraph', displayName: 'Sourcegraph' },
  { name: 'Augment Code', slug: 'augment-code', displayName: 'Augment Code' },
  { name: 'Poolside AI', slug: 'poolside-ai', displayName: 'Poolside AI' },
  { name: 'StackBlitz', slug: 'stackblitz', displayName: 'StackBlitz' }, // Bolt.new
  { name: 'Vercel', slug: 'vercel', displayName: 'Vercel' }, // v0.dev
  { name: 'Lovable', slug: 'lovable', displayName: 'Lovable' },
];

const DATA_DIR = path.join(__dirname, 'data');
const CACHE_FILE = path.join(DATA_DIR, 'glassdoor-cache.json');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function extractRating(html) {
  // Look for overall rating
  const patterns = [
    /"overallRating"[:\s]*"?(\d+\.?\d*)"?/i,
    /data-test="rating"[^>]*>(\d+\.?\d*)</i,
    /class="[^"]*rating[^"]*"[^>]*>(\d+\.?\d*)</i,
    /(\d+\.?\d*)\s*out of\s*5/i,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return parseFloat(match[1]);
  }
  return null;
}

function extractReviewCount(html) {
  const patterns = [
    /"numberOfReviews"[:\s]*"?(\d+)"?/i,
    /(\d+(?:,\d+)*)\s*reviews?/i,
    /(\d+(?:,\d+)*)\s*employee reviews?/i,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return parseInt(match[1].replace(/,/g, ''));
  }
  return null;
}

function extractCultureRatings(html) {
  const ratings = {};
  
  // Common Glassdoor sub-ratings
  const categories = [
    'cultureAndValues',
    'diversityAndInclusion',
    'workLifeBalance',
    'seniorManagement',
    'compensationAndBenefits',
    'careerOpportunities'
  ];
  
  for (const cat of categories) {
    const pattern = new RegExp(`"${cat}"[:\\s]*"?(\\d+\\.?\\d*)"?`, 'i');
    const match = html.match(pattern);
    if (match) {
      ratings[cat] = parseFloat(match[1]);
    }
  }
  
  return Object.keys(ratings).length > 0 ? ratings : null;
}

function extractRecommendPercentage(html) {
  const match = html.match(/(\d+)%?\s*(?:would )?recommend/i) ||
                html.match(/"recommendToFriend"[:\s]*"?(\d+)"?/i);
  return match ? parseInt(match[1]) : null;
}

function extractCEOApproval(html) {
  const match = html.match(/(\d+)%?\s*(?:CEO )?approval/i) ||
                html.match(/"ceoApproval"[:\s]*"?(\d+)"?/i);
  return match ? parseInt(match[1]) : null;
}

function extractInterviewDifficulty(html) {
  // Interview difficulty on scale of 1-5
  const match = html.match(/"interviewDifficulty"[:\s]*"?(\d+\.?\d*)"?/i) ||
                html.match(/interview difficulty[:\s]*(\d+\.?\d*)/i);
  return match ? parseFloat(match[1]) : null;
}

function extractHiringStatus(html) {
  // Look for signals about hiring activity
  const signals = [];
  
  if (html.match(/actively hiring/i)) signals.push('Actively hiring');
  if (html.match(/urgent(?:ly)? hiring/i)) signals.push('Urgently hiring');
  if (html.match(/hiring freeze/i)) signals.push('Hiring freeze');
  if (html.match(/layoff|laid off|letting go/i)) signals.push('Recent layoffs');
  
  return signals.length > 0 ? signals : null;
}

async function scrapeGlassdoorCompany(company) {
  // Try the overview page first
  const url = `https://www.glassdoor.com/Overview/Working-at-${company.slug}-EI_IE${company.slug}.htm`;
  const searchUrl = `https://www.glassdoor.com/Reviews/${company.slug}-reviews-SRCH_KE0,${company.displayName.length}.htm`;
  
  try {
    // Use a search-style URL that's more likely to work
    const { status, body: html } = await fetch(searchUrl);
    
    if (status === 403 || status === 429) {
      return {
        name: company.name,
        slug: company.slug,
        blocked: true,
        note: 'Glassdoor blocking automated access - may need manual check',
        scrapedAt: new Date().toISOString()
      };
    }
    
    const rating = extractRating(html);
    const reviewCount = extractReviewCount(html);
    const cultureRatings = extractCultureRatings(html);
    const recommendPct = extractRecommendPercentage(html);
    const ceoApproval = extractCEOApproval(html);
    const interviewDifficulty = extractInterviewDifficulty(html);
    const hiringStatus = extractHiringStatus(html);
    
    return {
      name: company.name,
      slug: company.slug,
      displayName: company.displayName,
      url: searchUrl,
      rating,
      reviewCount,
      cultureRatings,
      recommendPct,
      ceoApproval,
      interviewDifficulty,
      hiringStatus,
      scrapedAt: new Date().toISOString()
    };
  } catch (err) {
    return {
      name: company.name,
      slug: company.slug,
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
  
  // Rating changes
  if (current.rating && previous.rating && current.rating !== previous.rating) {
    const diff = (current.rating - previous.rating).toFixed(1);
    const direction = diff > 0 ? '📈' : '📉';
    changes.push(`${direction} Rating: ${previous.rating} → ${current.rating}`);
  }
  
  // Review count changes
  if (current.reviewCount && previous.reviewCount) {
    const newReviews = current.reviewCount - previous.reviewCount;
    if (newReviews >= 5) {
      changes.push(`📝 ${newReviews} new employee reviews`);
    }
  }
  
  // CEO approval changes
  if (current.ceoApproval && previous.ceoApproval) {
    const diff = current.ceoApproval - previous.ceoApproval;
    if (Math.abs(diff) >= 5) {
      const direction = diff > 0 ? '👍' : '👎';
      changes.push(`${direction} CEO approval: ${previous.ceoApproval}% → ${current.ceoApproval}%`);
    }
  }
  
  // Recommend percentage changes
  if (current.recommendPct && previous.recommendPct) {
    const diff = current.recommendPct - previous.recommendPct;
    if (Math.abs(diff) >= 5) {
      const direction = diff > 0 ? '✨' : '⚠️';
      changes.push(`${direction} Recommend: ${previous.recommendPct}% → ${current.recommendPct}%`);
    }
  }
  
  // Hiring status changes
  if (current.hiringStatus && !previous.hiringStatus) {
    changes.push(`🚨 New status: ${current.hiringStatus.join(', ')}`);
  }
  
  return changes;
}

function formatRating(rating) {
  if (!rating) return 'N/A';
  const stars = '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '');
  return `${rating}/5 ${stars}`;
}

async function main() {
  const cache = loadCache();
  const results = [];
  
  console.log('🔍 Scraping Glassdoor for AI coding tool companies...\n');
  
  for (const company of GLASSDOOR_COMPANIES) {
    console.log(`Checking ${company.displayName}...`);
    const data = await scrapeGlassdoorCompany(company);
    const previous = cache[company.slug];
    data.changes = detectChanges(data, previous);
    results.push(data);
    
    // Update cache (without changes field)
    cache[company.slug] = { ...data, changes: undefined };
    
    // Rate limit - be respectful
    await new Promise(r => setTimeout(r, 2000));
  }
  
  saveCache(cache);
  
  // Output summary
  console.log('\n=== Glassdoor Company Summary ===\n');
  for (const r of results) {
    if (r.blocked) {
      console.log(`${r.name}: ⚠️ ${r.note}`);
    } else if (r.error) {
      console.log(`${r.name}: ❌ ${r.error}`);
    } else {
      console.log(`${r.displayName}: ${formatRating(r.rating)} (${r.reviewCount || '?'} reviews)`);
      if (r.recommendPct) console.log(`  👥 ${r.recommendPct}% would recommend`);
      if (r.ceoApproval) console.log(`  👔 ${r.ceoApproval}% CEO approval`);
      if (r.changes && r.changes.length > 0) {
        r.changes.forEach(c => console.log(`  ${c}`));
      }
    }
  }
  
  // Save results
  const outputFile = path.join(DATA_DIR, 'glassdoor-latest.json');
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\n✅ Results saved to ${outputFile}`);
  
  return results;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, scrapeGlassdoorCompany, GLASSDOOR_COMPANIES };
