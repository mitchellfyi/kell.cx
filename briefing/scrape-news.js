#!/usr/bin/env node
/**
 * scrape-news.js - Monitor tech news RSS feeds for competitor mentions
 * 
 * Parses RSS feeds from TechCrunch, VentureBeat, The Verge, Ars Technica
 * and filters for AI coding tool mentions.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const COMPETITORS = [
  'cursor', 'devin', 'cognition', 'replit', 'windsurf', 'codeium',
  'copilot', 'github copilot', 'tabnine', 'amazon q developer',
  'sourcegraph', 'cody', 'continue.dev', 'supermaven', 'augment code'
];

const KEYWORDS = [
  'ai coding', 'ai code', 'ai developer', 'ai ide', 'ai programming',
  'code assistant', 'coding assistant', 'ai pair programming'
];

const RSS_FEEDS = [
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'VentureBeat', url: 'https://feeds.feedburner.com/venturebeat/SZYF' },
  { name: 'The Verge Tech', url: 'https://www.theverge.com/rss/tech/index.xml' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss' },
];

const DATA_DIR = path.join(__dirname, 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'news.json');
const HISTORY_FILE = path.join(DATA_DIR, 'news-history.json');

function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : require('http');
    const req = client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Briefing/1.0)' },
      timeout: 10000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchRSS(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function parseRSSItems(xml, sourceName) {
  const items = [];
  // Match <item>...</item> blocks
  const itemMatches = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
  
  for (const itemXml of itemMatches.slice(0, 20)) {
    const title = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([^\]<]+)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || '';
    const link = itemXml.match(/<link[^>]*>([^<]+)<\/link>/i)?.[1]?.trim() || '';
    const pubDate = itemXml.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/i)?.[1]?.trim() || '';
    const description = itemXml.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim() || '';
    
    if (title && link) {
      items.push({
        source: sourceName,
        title,
        link,
        pubDate,
        description: description.replace(/<[^>]+>/g, '').slice(0, 300)
      });
    }
  }
  
  return items;
}

function isRelevant(item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  
  // Check for competitor mentions
  for (const competitor of COMPETITORS) {
    if (text.includes(competitor)) {
      return { match: true, reason: `competitor: ${competitor}` };
    }
  }
  
  // Check for general AI coding keywords
  for (const keyword of KEYWORDS) {
    if (text.includes(keyword)) {
      return { match: true, reason: `keyword: ${keyword}` };
    }
  }
  
  return { match: false };
}

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (e) {}
  return { seenUrls: [] };
}

function saveHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

async function scrapeNews() {
  const history = loadHistory();
  const allArticles = [];
  const newArticles = [];

  console.log('📰 Fetching news feeds...');

  for (const feed of RSS_FEEDS) {
    try {
      console.log(`  → ${feed.name}`);
      const xml = await fetchRSS(feed.url);
      const items = parseRSSItems(xml, feed.name);
      
      for (const item of items) {
        const relevance = isRelevant(item);
        if (relevance.match) {
          item.matchReason = relevance.reason;
          allArticles.push(item);
          
          if (!history.seenUrls.includes(item.link)) {
            newArticles.push(item);
            history.seenUrls.push(item.link);
          }
        }
      }
    } catch (e) {
      console.log(`  ⚠ ${feed.name}: ${e.message}`);
    }
  }

  // Keep history trimmed to last 500 URLs
  history.seenUrls = history.seenUrls.slice(-500);
  saveHistory(history);

  const result = {
    timestamp: new Date().toISOString(),
    newArticles,
    allRelevantArticles: allArticles.slice(0, 20),
    signals: []
  };

  // Generate signals
  if (newArticles.length > 0) {
    result.signals.push(`${newArticles.length} new relevant article(s) in tech press`);
  }
  
  // Group by competitor mention
  for (const competitor of COMPETITORS) {
    const mentions = allArticles.filter(a => 
      `${a.title} ${a.description}`.toLowerCase().includes(competitor)
    );
    if (mentions.length > 0) {
      result.signals.push(`${competitor}: ${mentions.length} article(s) in past 24h`);
    }
  }

  return result;
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const results = await scrapeNews();
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  
  console.log(`\n✅ Found ${results.allRelevantArticles.length} relevant articles`);
  console.log(`   ${results.newArticles.length} new (not seen before)`);
  
  if (results.newArticles.length > 0) {
    console.log('\n📌 New articles:');
    results.newArticles.forEach(a => {
      console.log(`   - [${a.source}] ${a.title}`);
      console.log(`     ${a.link}`);
    });
  }
  
  return results;
}

module.exports = { scrapeNews, COMPETITORS, RSS_FEEDS };

if (require.main === module) {
  main().catch(console.error);
}
