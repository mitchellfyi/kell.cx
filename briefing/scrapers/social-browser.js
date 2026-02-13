#!/usr/bin/env node
/**
 * Social Media Scraper using Browser Automation
 * 
 * Scrapes Twitter/X profiles for competitors using headless Chrome.
 * Note: Glassdoor, Indeed, Wellfound all block headless browsers.
 * 
 * Usage: node social-browser.js [twitter|all]
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Competitor Twitter handles mapped to company names
const TWITTER_HANDLES = {
  'cursor': { handle: 'cursor_ai', name: 'Cursor' },
  'github-copilot': { handle: 'GitHubCopilot', name: 'GitHub Copilot' },
  'replit': { handle: 'Replit', name: 'Replit' },
  'codeium': { handle: 'Codeium', name: 'Codeium/Windsurf' },
  'tabnine': { handle: 'Tabnine', name: 'Tabnine' },
  'sourcegraph': { handle: 'sourcegraph', name: 'Sourcegraph' },
  'codium': { handle: 'CodiumAI', name: 'CodiumAI' },
  'continue': { handle: 'continuedev', name: 'Continue' },
  'bolt': { handle: 'stackblitz', name: 'Bolt/StackBlitz' },
  'poolside': { handle: 'PoolsideAI', name: 'Poolside' },
};

const DATA_DIR = path.join(__dirname, '..', 'data', 'social');
const CONTROL_URL = 'http://127.0.0.1:18791';

// Helper to make HTTP requests
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

// Parse follower count string like "308.1K" or "1.2M"
function parseCount(str) {
  if (!str) return null;
  const match = str.match(/([\d.]+)([KMB])?/i);
  if (!match) return null;
  
  let num = parseFloat(match[1]);
  const suffix = (match[2] || '').toUpperCase();
  
  if (suffix === 'K') num *= 1000;
  else if (suffix === 'M') num *= 1000000;
  else if (suffix === 'B') num *= 1000000000;
  
  return Math.round(num);
}

async function startBrowser() {
  console.log('Starting browser...');
  const res = await request(`${CONTROL_URL}/browser/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { profile: 'clawd' }
  });
  
  if (res.status !== 200) {
    throw new Error(`Failed to start browser: ${res.status}`);
  }
  
  // Wait for browser to be ready
  await new Promise(r => setTimeout(r, 2000));
  return res.data;
}

async function openTab(url) {
  const res = await request(`${CONTROL_URL}/browser/open`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { profile: 'clawd', targetUrl: url }
  });
  
  await new Promise(r => setTimeout(r, 2000));
  return res.data;
}

async function navigate(targetId, url) {
  const res = await request(`${CONTROL_URL}/browser/navigate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { profile: 'clawd', targetId, targetUrl: url }
  });
  
  await new Promise(r => setTimeout(r, 2000));
  return res.data;
}

async function getSnapshot(targetId) {
  const res = await request(`${CONTROL_URL}/browser/snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { profile: 'clawd', targetId, compact: true }
  });
  return res.data;
}

async function click(targetId, ref) {
  const res = await request(`${CONTROL_URL}/browser/act`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { 
      profile: 'clawd', 
      targetId, 
      request: { kind: 'click', ref } 
    }
  });
  await new Promise(r => setTimeout(r, 1000));
  return res.data;
}

function extractTwitterData(snapshotText, handle) {
  const data = {
    handle,
    scrapedAt: new Date().toISOString(),
    followers: null,
    following: null,
    posts: null,
    verified: false,
    bio: null,
    website: null,
    joinedDate: null,
    recentTweets: []
  };

  // Check for account doesn't exist
  if (snapshotText.includes("account doesn't exist") || snapshotText.includes("doesn't exist")) {
    data.error = 'not_found';
    return data;
  }

  // Extract followers
  const followersMatch = snapshotText.match(/"?([\d.]+[KMB]?)\s*Followers?"?/i);
  if (followersMatch) {
    data.followers = parseCount(followersMatch[1]);
  }

  // Extract following
  const followingMatch = snapshotText.match(/"?([\d.]+[KMB]?)\s*Following"?/i);
  if (followingMatch) {
    data.following = parseCount(followingMatch[1]);
  }

  // Extract post count
  const postsMatch = snapshotText.match(/"?([\d.]+[KMB]?)\s*posts?"?/i);
  if (postsMatch) {
    data.posts = parseCount(postsMatch[1]);
  }

  // Check for verified
  data.verified = snapshotText.includes('Verified account');

  // Extract joined date
  const joinedMatch = snapshotText.match(/Joined\s+(\w+\s+\d{4})/i);
  if (joinedMatch) {
    data.joinedDate = joinedMatch[1];
  }

  return data;
}

async function scrapeTwitterProfile(targetId, companyKey, info) {
  console.log(`  Scraping @${info.handle} (${info.name})...`);
  
  try {
    await navigate(targetId, `https://twitter.com/${info.handle}`);
    const snapshot = await getSnapshot(targetId);
    const snapshotText = typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot);
    
    const data = extractTwitterData(snapshotText, info.handle);
    data.company = info.name;
    data.companyKey = companyKey;
    
    if (data.error) {
      console.log(`    Account not found`);
    } else {
      console.log(`    Followers: ${data.followers?.toLocaleString() || 'N/A'}`);
    }
    
    return data;
  } catch (err) {
    console.log(`    Error: ${err.message}`);
    return { handle: info.handle, company: info.name, error: err.message };
  }
}

async function scrapeTwitter() {
  console.log('\n=== Twitter/X Scraping ===\n');
  
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  // Start browser and open first tab
  await startBrowser();
  const tab = await openTab('https://twitter.com');
  const targetId = tab.targetId;
  
  // Accept cookies if present
  const snapshot = await getSnapshot(targetId);
  if (snapshot && snapshot.includes && snapshot.includes('Accept all cookies')) {
    console.log('  Accepting cookies...');
    // Try to find and click accept button
    const acceptMatch = snapshot.match(/button "Accept all cookies" \[ref=(e\d+)\]/);
    if (acceptMatch) {
      await click(targetId, acceptMatch[1]);
    }
  }
  
  const results = {};
  
  for (const [key, info] of Object.entries(TWITTER_HANDLES)) {
    const data = await scrapeTwitterProfile(targetId, key, info);
    results[key] = data;
    await new Promise(r => setTimeout(r, 1500)); // Rate limiting
  }
  
  // Save results
  const date = new Date().toISOString().split('T')[0];
  const outputPath = path.join(DATA_DIR, `twitter-${date}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  const latestPath = path.join(DATA_DIR, 'twitter-latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(results, null, 2));
  
  console.log(`\nSaved to ${outputPath}`);
  
  // Summary
  console.log('\n=== Summary ===\n');
  const sorted = Object.entries(results)
    .filter(([_, d]) => d.followers)
    .sort((a, b) => (b[1].followers || 0) - (a[1].followers || 0));
  
  for (const [key, data] of sorted) {
    console.log(`${data.company}: ${data.followers?.toLocaleString()} followers`);
  }
  
  return results;
}

async function main() {
  const mode = process.argv[2] || 'twitter';
  
  try {
    if (mode === 'twitter' || mode === 'all') {
      await scrapeTwitter();
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
