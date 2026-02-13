#!/usr/bin/env node
/**
 * LinkedIn Job Tracker via Web Search
 * Uses search engines to find job postings without requiring LinkedIn API
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const COMPANIES = [
  { name: 'Cursor', searchName: 'Anysphere', linkedIn: 'anysphere' },
  { name: 'Cognition AI', searchName: 'Cognition AI', linkedIn: 'cognition-ai' },
  { name: 'Replit', searchName: 'Replit', linkedIn: 'replit' },
  { name: 'Codeium', searchName: 'Codeium', linkedIn: 'codeium' },
  { name: 'Windsurf', searchName: 'Codeium Windsurf', linkedIn: 'codeium' },
  { name: 'GitHub', searchName: 'GitHub Copilot', linkedIn: 'github' },
  { name: 'Tabnine', searchName: 'Tabnine', linkedIn: 'tabnine' },
  { name: 'Sourcegraph', searchName: 'Sourcegraph', linkedIn: 'sourcegraph' },
  { name: 'Augment Code', searchName: 'Augment Code', linkedIn: 'augment-code' },
  { name: 'Continue', searchName: 'Continue.dev', linkedIn: 'continue-dev' },
  { name: 'Poolside AI', searchName: 'Poolside AI', linkedIn: 'poolside-ai' },
  { name: 'Lovable', searchName: 'Lovable dev', linkedIn: 'lovable' },
  { name: 'StackBlitz', searchName: 'StackBlitz Bolt', linkedIn: 'stackblitz' },
  { name: 'Vercel', searchName: 'Vercel v0', linkedIn: 'vercel' },
];

const DATA_DIR = path.join(__dirname, 'data');
const CACHE_FILE = path.join(DATA_DIR, 'linkedin-jobs-cache.json');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
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

// Search for jobs via DuckDuckGo HTML (no JS required)
async function searchJobsDDG(company) {
  const query = encodeURIComponent(`site:linkedin.com/jobs "${company.searchName}" hiring 2026`);
  const url = `https://html.duckduckgo.com/html/?q=${query}`;
  
  try {
    const { status, body } = await fetch(url);
    
    if (status !== 200) {
      return { count: null, error: `HTTP ${status}` };
    }
    
    // Count result links
    const resultMatches = body.match(/class="result__url"/g) || [];
    const linkedInJobs = body.match(/linkedin\.com\/jobs/gi) || [];
    
    // Extract job titles if possible
    const titles = [];
    const titleMatches = body.matchAll(/class="result__title"[^>]*>[\s\S]*?<a[^>]*>([^<]+)</g);
    for (const m of titleMatches) {
      if (m[1] && m[1].length < 100) {
        titles.push(m[1].trim());
      }
    }
    
    return {
      resultsFound: resultMatches.length,
      linkedInMatches: linkedInJobs.length,
      sampleTitles: titles.slice(0, 5),
      scrapedAt: new Date().toISOString()
    };
  } catch (err) {
    return { count: null, error: err.message };
  }
}

// Also check careers pages directly
async function checkCareersPage(company) {
  const careersUrls = {
    'Cursor': 'https://www.cursor.com/careers',
    'Cognition AI': 'https://cognition.ai/careers',
    'Replit': 'https://replit.com/careers',
    'Codeium': 'https://codeium.com/careers',
    'GitHub': 'https://github.com/about/careers',
    'Tabnine': 'https://www.tabnine.com/careers',
    'Sourcegraph': 'https://sourcegraph.com/careers',
    'Augment Code': 'https://www.augmentcode.com/careers',
    'Continue': 'https://www.continue.dev/careers',
    'Poolside AI': 'https://poolside.ai/careers',
    'Lovable': 'https://lovable.dev/careers',
    'StackBlitz': 'https://stackblitz.com/careers',
    'Vercel': 'https://vercel.com/careers',
  };
  
  const url = careersUrls[company.name];
  if (!url) return null;
  
  try {
    const { status, body } = await fetch(url);
    if (status !== 200) return { error: `HTTP ${status}` };
    
    // Try to count job listings
    // Common patterns: job cards, role listings
    const patterns = [
      /<div[^>]*class="[^"]*job[^"]*"[^>]*>/gi,
      /<li[^>]*class="[^"]*position[^"]*"[^>]*>/gi,
      /<article[^>]*class="[^"]*role[^"]*"[^>]*>/gi,
      /class="[^"]*career[^"]*listing/gi,
      /<h[23][^>]*>[^<]*engineer/gi,
      /<h[23][^>]*>[^<]*developer/gi,
    ];
    
    let jobCount = 0;
    for (const pattern of patterns) {
      const matches = body.match(pattern);
      if (matches && matches.length > jobCount) {
        jobCount = matches.length;
      }
    }
    
    return {
      url,
      estimatedJobs: jobCount > 0 ? jobCount : 'unknown',
      hasContent: body.length > 5000,
      scrapedAt: new Date().toISOString()
    };
  } catch (err) {
    return { url, error: err.message };
  }
}

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  } catch (e) {}
  return { companies: {}, lastScan: null };
}

function saveCache(cache) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function detectChanges(current, previous) {
  const changes = [];
  if (!previous) return changes;
  
  // Careers page job count changes
  if (current.careers && previous.careers) {
    const curr = current.careers.estimatedJobs;
    const prev = previous.careers.estimatedJobs;
    if (typeof curr === 'number' && typeof prev === 'number') {
      const diff = curr - prev;
      if (diff > 0) {
        changes.push(`📈 +${diff} new job listings on careers page`);
      } else if (diff < 0) {
        changes.push(`📉 ${diff} fewer job listings (filled or removed)`);
      }
    }
  }
  
  // Search results trend
  if (current.search && previous.search) {
    const currResults = current.search.linkedInMatches || 0;
    const prevResults = previous.search.linkedInMatches || 0;
    if (currResults > prevResults + 2) {
      changes.push(`🔥 More LinkedIn job posts appearing in search`);
    }
  }
  
  return changes;
}

async function main() {
  const cache = loadCache();
  const results = [];
  
  console.log('🔍 Tracking job postings for AI coding tool companies...\n');
  
  for (const company of COMPANIES) {
    console.log(`Checking ${company.name}...`);
    
    const searchResults = await searchJobsDDG(company);
    const careersResults = await checkCareersPage(company);
    
    const data = {
      name: company.name,
      search: searchResults,
      careers: careersResults,
      scrapedAt: new Date().toISOString()
    };
    
    const previous = cache.companies[company.name];
    data.changes = detectChanges(data, previous);
    
    results.push(data);
    cache.companies[company.name] = { ...data, changes: undefined };
    
    // Rate limit
    await new Promise(r => setTimeout(r, 1500));
  }
  
  cache.lastScan = new Date().toISOString();
  saveCache(cache);
  
  // Output summary
  console.log('\n=== Hiring Activity Summary ===\n');
  
  const activeHiring = results.filter(r => 
    (r.search && r.search.linkedInMatches > 0) ||
    (r.careers && r.careers.estimatedJobs > 0)
  ).sort((a, b) => {
    const aScore = (a.search?.linkedInMatches || 0) + (typeof a.careers?.estimatedJobs === 'number' ? a.careers.estimatedJobs : 0);
    const bScore = (b.search?.linkedInMatches || 0) + (typeof b.careers?.estimatedJobs === 'number' ? b.careers.estimatedJobs : 0);
    return bScore - aScore;
  });
  
  console.log('🔥 Most Active Hiring:\n');
  for (const r of activeHiring.slice(0, 10)) {
    const searchCount = r.search?.linkedInMatches || 0;
    const careersCount = r.careers?.estimatedJobs;
    const careersStr = typeof careersCount === 'number' ? `${careersCount} on careers page` : (careersCount || 'no careers page');
    
    console.log(`  ${r.name}:`);
    console.log(`    LinkedIn search: ${searchCount} results`);
    console.log(`    Careers page: ${careersStr}`);
    
    if (r.changes && r.changes.length > 0) {
      r.changes.forEach(c => console.log(`    ${c}`));
    }
    console.log();
  }
  
  // Companies with changes
  const withChanges = results.filter(r => r.changes && r.changes.length > 0);
  if (withChanges.length > 0) {
    console.log('\n📢 Notable Changes:\n');
    for (const r of withChanges) {
      console.log(`  ${r.name}:`);
      r.changes.forEach(c => console.log(`    ${c}`));
    }
  }
  
  // Save results
  const outputFile = path.join(DATA_DIR, 'linkedin-jobs-latest.json');
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\n✅ Results saved to ${outputFile}`);
  
  return results;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, COMPANIES };
