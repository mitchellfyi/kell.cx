#!/usr/bin/env node
// Twitter/X Monitoring via Nitter instances - tracks competitor announcements

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Twitter accounts for AI coding tools
const TWITTER_ACCOUNTS = [
  { name: 'Cursor', handle: 'cursor_ai' },
  { name: 'Devin / Cognition', handle: 'cognaborator' },
  { name: 'Replit', handle: 'Replit' },
  { name: 'Codeium', handle: 'caborateodiumdev' },
  { name: 'Windsurf', handle: 'WindsurfAI' },
  { name: 'GitHub Copilot', handle: 'GitHubCopilot' },
  { name: 'Tabnine', handle: 'taaboratebnine' },
  { name: 'Sourcegraph', handle: 'sourcegraph' },
  { name: 'Continue', handle: 'continuedev' },
  { name: 'Augment Code', handle: 'AugmentCode' },
  { name: 'Bolt', handle: 'baborateoltnew' },
  { name: 'v0', handle: 'v0' },
  { name: 'Lovable', handle: 'lovaboratable_dev' },
];

// Nitter instances (fallback through list)
const NITTER_INSTANCES = [
  'nitter.net',
  'nitter.poast.org',
  'nitter.privacydev.net',
  'nitter.cz',
  'nitter.esmailelbob.xyz',
];

const DATA_DIR = path.join(__dirname, 'data');
const CACHE_FILE = path.join(DATA_DIR, 'twitter-cache.json');

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const mod = isHttps ? https : http;
    
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...options.headers
      },
      timeout: 10000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location, options).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function extractTweets(html, handle) {
  const tweets = [];
  
  // Nitter tweet structure: <div class="timeline-item">
  const tweetMatches = html.match(/<div class="timeline-item[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g) || [];
  
  for (const match of tweetMatches.slice(0, 5)) {
    // Extract tweet text
    const textMatch = match.match(/<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (!textMatch) continue;
    
    let text = textMatch[1]
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!text || text.length < 10) continue;
    
    // Extract date
    const dateMatch = match.match(/title="([^"]+)"[^>]*class="tweet-date"/);
    const date = dateMatch ? dateMatch[1] : null;
    
    // Extract link
    const linkMatch = match.match(/href="(\/[^"]+\/status\/\d+)"/);
    const link = linkMatch ? linkMatch[1] : null;
    
    tweets.push({
      text: text.substring(0, 500),
      date,
      link
    });
  }
  
  return tweets;
}

function isRecentTweet(dateStr) {
  if (!dateStr) return true; // If no date, include it
  
  try {
    const tweetDate = new Date(dateStr);
    const now = new Date();
    const hoursDiff = (now - tweetDate) / (1000 * 60 * 60);
    return hoursDiff <= 48; // Last 48 hours
  } catch {
    return true;
  }
}

async function scrapeAccountViaNitter(account) {
  const results = {
    name: account.name,
    handle: account.handle,
    tweets: [],
    error: null,
    instance: null,
    scrapedAt: new Date().toISOString()
  };
  
  for (const instance of NITTER_INSTANCES) {
    try {
      const url = `https://${instance}/${account.handle}`;
      const { status, body } = await fetch(url);
      
      if (status === 200 && body.includes('timeline-item')) {
        results.instance = instance;
        results.tweets = extractTweets(body, account.handle);
        return results;
      }
    } catch (err) {
      // Try next instance
    }
  }
  
  results.error = 'All Nitter instances failed or unavailable';
  return results;
}

// Fallback: Search via RSS bridge or similar
async function searchTweetsViaAlternative(query) {
  // Could add RSS bridge, Twstalker, or other alternatives here
  return [];
}

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  } catch (e) {}
  return { accounts: {}, lastScan: null };
}

function saveCache(cache) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function findNewTweets(current, previous) {
  if (!previous || !previous.tweets) return current.tweets;
  
  const prevTexts = new Set(previous.tweets.map(t => t.text.substring(0, 100)));
  return current.tweets.filter(t => !prevTexts.has(t.text.substring(0, 100)));
}

function categorizetweet(text) {
  const lower = text.toLowerCase();
  
  if (lower.includes('launch') || lower.includes('introducing') || lower.includes('announcing') || lower.includes('released')) {
    return '🚀 Launch';
  }
  if (lower.includes('update') || lower.includes('new feature') || lower.includes('now supports') || lower.includes('added')) {
    return '✨ Feature';
  }
  if (lower.includes('hiring') || lower.includes('join us') || lower.includes('we\'re looking')) {
    return '💼 Hiring';
  }
  if (lower.includes('funding') || lower.includes('raised') || lower.includes('series') || lower.includes('valuation')) {
    return '💰 Funding';
  }
  if (lower.includes('partnership') || lower.includes('partner') || lower.includes('integration')) {
    return '🤝 Partnership';
  }
  return '📢 Update';
}

async function main() {
  const cache = loadCache();
  const results = [];
  const newTweets = [];
  
  console.log('🐦 Scanning Twitter/X via Nitter mirrors...\n');
  
  for (const account of TWITTER_ACCOUNTS) {
    console.log(`Checking @${account.handle}...`);
    const data = await scrapeAccountViaNitter(account);
    
    // Find new tweets since last scan
    const prevData = cache.accounts[account.handle];
    const newForAccount = findNewTweets(data, prevData);
    
    if (newForAccount.length > 0) {
      newTweets.push({
        account: account.name,
        handle: account.handle,
        tweets: newForAccount.filter(t => isRecentTweet(t.date))
      });
    }
    
    results.push(data);
    cache.accounts[account.handle] = data;
    
    // Rate limit
    await new Promise(r => setTimeout(r, 1500));
  }
  
  cache.lastScan = new Date().toISOString();
  saveCache(cache);
  
  // Output summary
  console.log('\n=== Twitter/X Activity Summary ===\n');
  
  let successCount = 0;
  for (const r of results) {
    if (r.error) {
      console.log(`❌ ${r.name} (@${r.handle}): ${r.error}`);
    } else {
      successCount++;
      console.log(`✅ ${r.name} (@${r.handle}): ${r.tweets.length} recent tweets via ${r.instance}`);
    }
  }
  
  console.log(`\n📊 Success rate: ${successCount}/${results.length}`);
  
  if (newTweets.length > 0) {
    console.log('\n=== New Activity (Last 48h) ===\n');
    for (const acct of newTweets) {
      if (acct.tweets.length === 0) continue;
      console.log(`\n${acct.account} (@${acct.handle}):`);
      for (const tweet of acct.tweets.slice(0, 3)) {
        const category = categorizetweet(tweet.text);
        console.log(`  ${category}: ${tweet.text.substring(0, 150)}...`);
      }
    }
  }
  
  // Save results
  const outputFile = path.join(DATA_DIR, 'twitter-latest.json');
  fs.writeFileSync(outputFile, JSON.stringify({ results, newTweets }, null, 2));
  console.log(`\n✅ Results saved to ${outputFile}`);
  
  return { results, newTweets };
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, scrapeAccountViaNitter, TWITTER_ACCOUNTS };
