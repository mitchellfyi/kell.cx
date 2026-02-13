#!/usr/bin/env node
/**
 * Chrome Web Store Extension Monitor
 * Tracks install counts, ratings, and versions for competitor browser extensions
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const EXTENSIONS = [
  { name: 'GitHub Copilot', id: 'gjnjmfghjjdlamholfehfnhfhghknkca', competitor: 'copilot' },
  { name: 'Codeium', id: 'hobjkcpmjhlegmobgonaagepfckjkceh', competitor: 'windsurf' },
  { name: 'Tabnine', id: 'hcjjlaldokddkmhaoehokfpiaioomema', competitor: 'tabnine' },
  { name: 'Continue', id: 'codeaccelerate', competitor: 'continue' },
  { name: 'Amazon Q', id: 'fabekkagncfkmdfhoklfokfokhoommcc', competitor: 'amazonq' },
  { name: 'Sourcegraph Cody', id: 'nnpcmdgfpanfaoifkgbgccabjjamhddj', competitor: 'cody' },
  { name: 'Cursor', id: 'kcfibkpgpmfolpdmhphjpobjfmdafbhm', competitor: 'cursor' },
];

const DATA_DIR = path.join(__dirname, 'data');
const CACHE_FILE = path.join(DATA_DIR, 'chrome-webstore-cache.json');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : require('http');
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function parseUserCount(str) {
  if (!str) return null;
  const match = str.match(/([\d,]+)\s*(?:users?|downloads?)?/i);
  if (match) {
    return parseInt(match[1].replace(/,/g, ''));
  }
  // Handle "10K+" format
  const kMatch = str.match(/([\d.]+)\s*[kK]\+?/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const mMatch = str.match(/([\d.]+)\s*[mM]\+?/);
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1000000);
  return null;
}

async function scrapeExtension(ext) {
  const url = `https://chromewebstore.google.com/detail/${ext.id}`;
  try {
    const { status, body } = await fetch(url);
    
    if (status === 404) {
      return { ...ext, found: false, error: 'Not found' };
    }
    
    if (status !== 200) {
      return { ...ext, found: false, error: `HTTP ${status}` };
    }
    
    // Extract rating (look for "X out of 5" pattern)
    const ratingMatch = body.match(/(\d+\.?\d*)\s*(?:out of|\/)\s*5/i) ||
                        body.match(/"ratingValue"[:\s]*"?(\d+\.?\d*)"?/i) ||
                        body.match(/aria-label="[^"]*?(\d+\.?\d*)\s*(?:star|rating)/i);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
    
    // Extract user count
    const userMatch = body.match(/([\d,]+(?:\.\d+)?[KMkm]?\+?)\s*users?/i) ||
                      body.match(/"userCount"[:\s]*"?([^"]+)"?/i) ||
                      body.match(/(\d[\d,]*)\s*weekly users/i);
    const userCountStr = userMatch ? userMatch[1] : null;
    const users = parseUserCount(userCountStr);
    
    // Extract version
    const versionMatch = body.match(/Version[:\s]*(\d+\.[\d.]+)/i) ||
                         body.match(/"version"[:\s]*"([^"]+)"/i);
    const version = versionMatch ? versionMatch[1] : null;
    
    // Extract review count
    const reviewMatch = body.match(/(\d+(?:,\d+)*)\s*(?:reviews?|ratings?)/i) ||
                        body.match(/"ratingCount"[:\s]*"?(\d+)"?/i);
    const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, '')) : null;
    
    return {
      ...ext,
      found: true,
      url,
      rating,
      users,
      userCountStr,
      reviewCount,
      version,
      scrapedAt: new Date().toISOString()
    };
  } catch (e) {
    return { ...ext, found: false, error: e.message };
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
  if (!previous || !current.found) return changes;
  
  // Version change
  if (current.version && previous.version && current.version !== previous.version) {
    changes.push({ type: 'version', change: `New version: ${previous.version} → ${current.version}` });
  }
  
  // Significant user growth (>5%)
  if (current.users && previous.users) {
    const growth = ((current.users - previous.users) / previous.users) * 100;
    if (growth >= 5) {
      changes.push({ type: 'users', change: `User growth: +${growth.toFixed(1)}% (${previous.users.toLocaleString()} → ${current.users.toLocaleString()})` });
    } else if (growth <= -5) {
      changes.push({ type: 'users', change: `User decline: ${growth.toFixed(1)}% (${previous.users.toLocaleString()} → ${current.users.toLocaleString()})` });
    }
  }
  
  // Rating change
  if (current.rating && previous.rating && Math.abs(current.rating - previous.rating) >= 0.1) {
    const dir = current.rating > previous.rating ? '📈' : '📉';
    changes.push({ type: 'rating', change: `${dir} Rating: ${previous.rating} → ${current.rating}` });
  }
  
  return changes;
}

async function scrapeChromeWebStore() {
  const cache = loadCache();
  const results = [];
  const allChanges = [];
  
  console.log('Scanning Chrome Web Store extensions...\n');
  
  for (const ext of EXTENSIONS) {
    console.log(`  Checking ${ext.name}...`);
    const data = await scrapeExtension(ext);
    const previous = cache[ext.id];
    const changes = detectChanges(data, previous);
    
    if (changes.length > 0) {
      changes.forEach(c => {
        console.log(`    ⚠️ ${c.change}`);
        allChanges.push({ extension: ext.name, competitor: ext.competitor, ...c });
      });
    }
    
    results.push({ ...data, changes });
    
    // Update cache (without changes)
    if (data.found) {
      cache[ext.id] = { ...data, changes: undefined };
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }
  
  saveCache(cache);
  
  // Save latest results
  const outputFile = path.join(DATA_DIR, 'chrome-webstore-latest.json');
  fs.writeFileSync(outputFile, JSON.stringify({ results, changes: allChanges }, null, 2));
  
  return { results, changes: allChanges };
}

function generateBriefingSection(results, changes) {
  let md = '\n## 🌐 Chrome Web Store Extensions\n';
  md += '*Browser extension installs and ratings*\n\n';
  
  const found = results.filter(r => r.found);
  if (found.length === 0) {
    md += '*No Chrome extension data available*\n';
    return md;
  }
  
  md += '| Extension | Users | Rating | Version |\n';
  md += '|-----------|------:|:------:|:-------:|\n';
  
  found.sort((a, b) => (b.users || 0) - (a.users || 0));
  found.forEach(r => {
    const users = r.users ? r.users.toLocaleString() : r.userCountStr || '-';
    const rating = r.rating ? `${r.rating}/5` : '-';
    const version = r.version || '-';
    md += `| ${r.name} | ${users} | ${rating} | ${version} |\n`;
  });
  
  if (changes.length > 0) {
    md += '\n**Changes detected:**\n';
    changes.forEach(c => {
      md += `- **${c.extension}**: ${c.change}\n`;
    });
  }
  
  md += '\n';
  return md;
}

// Main execution
if (require.main === module) {
  scrapeChromeWebStore()
    .then(({ results, changes }) => {
      console.log('\n=== Chrome Web Store Summary ===\n');
      results.forEach(r => {
        if (r.found) {
          console.log(`${r.name}: ${r.users?.toLocaleString() || '?'} users, ${r.rating || '?'}/5 rating`);
        } else {
          console.log(`${r.name}: ${r.error}`);
        }
      });
      if (changes.length > 0) {
        console.log('\nChanges:');
        changes.forEach(c => console.log(`  ${c.extension}: ${c.change}`));
      }
    })
    .catch(console.error);
}

module.exports = { scrapeChromeWebStore, generateBriefingSection, EXTENSIONS };
