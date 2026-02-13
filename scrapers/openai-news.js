#!/usr/bin/env node
/**
 * OpenAI News Scraper
 * 
 * Fetches news and announcements from OpenAI's RSS feed.
 * - Blog posts and news
 * - Research announcements
 * - Product updates
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'openai-news.json');
const RSS_URL = 'https://openai.com/news/rss.xml';

async function fetchRSS() {
  try {
    const response = await fetch(RSS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Briefing/1.0; +https://kell.cx)',
        'Accept': 'application/rss+xml,application/xml,text/xml'
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch OpenAI RSS: ${response.status}`);
      return null;
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error fetching OpenAI RSS:', error.message);
    return null;
  }
}

function parseRSS(xml) {
  if (!xml) return [];
  
  const items = [];
  
  // Parse each <item> element
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemPattern.exec(xml)) !== null) {
    const itemXml = match[1];
    
    // Extract fields
    const title = extractCDATA(itemXml, 'title');
    const description = extractCDATA(itemXml, 'description');
    const link = extractText(itemXml, 'link');
    const guid = extractText(itemXml, 'guid');
    const category = extractCDATA(itemXml, 'category');
    const pubDate = extractText(itemXml, 'pubDate');
    
    if (title && link) {
      items.push({
        title,
        description,
        url: link,
        category: category || 'News',
        date: pubDate,
        source: 'openai-rss'
      });
    }
  }
  
  return items;
}

function extractCDATA(xml, tag) {
  const pattern = new RegExp(`<${tag}>(?:\\s*<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>\\s*)?<\\/${tag}>`, 'i');
  const match = pattern.exec(xml);
  return match ? match[1].trim() : null;
}

function extractText(xml, tag) {
  const pattern = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i');
  const match = pattern.exec(xml);
  return match ? match[1].trim() : null;
}

// Categorize/normalize based on OpenAI's category tags
function normalizeCategory(category) {
  if (!category) return 'announcement';
  
  const cat = category.toLowerCase();
  
  if (cat.includes('engineering')) return 'engineering';
  if (cat.includes('research') || cat.includes('publication')) return 'research';
  if (cat.includes('product')) return 'product';
  if (cat.includes('safety') || cat.includes('security')) return 'safety';
  if (cat.includes('chatgpt')) return 'chatgpt';
  if (cat.includes('sora')) return 'sora';
  if (cat.includes('global affairs') || cat.includes('company')) return 'company';
  if (cat.includes('startup')) return 'startup';
  if (cat.includes('enterprise')) return 'enterprise';
  
  return 'announcement';
}

// Determine importance based on title keywords
function determineImportance(item) {
  const title = item.title.toLowerCase();
  
  // High importance: new models, major features
  if (title.includes('introducing') || title.includes('announcing')) return 'high';
  if (title.includes('gpt-5') || title.includes('gpt-4') || title.includes('codex')) return 'high';
  if (title.includes('o1') || title.includes('o3') || title.includes('o4')) return 'high';
  if (title.includes('api') && title.includes('new')) return 'high';
  
  // Medium importance: updates, partnerships
  if (title.includes('partnership') || title.includes('partner')) return 'medium';
  if (title.includes('update') || title.includes('system card')) return 'medium';
  
  return 'normal';
}

async function main() {
  console.log('OpenAI News Scraper starting...\n');
  
  console.log(`Fetching RSS from ${RSS_URL}...`);
  const rssXml = await fetchRSS();
  
  if (!rssXml) {
    console.error('Failed to fetch RSS feed');
    process.exit(1);
  }
  
  const items = parseRSS(rssXml);
  console.log(`Parsed ${items.length} items from RSS`);
  
  // Enrich items
  const enriched = items.map(item => ({
    ...item,
    normalizedCategory: normalizeCategory(item.category),
    importance: determineImportance(item),
    parsedDate: item.date ? new Date(item.date).toISOString() : null
  }));
  
  // Sort by date (newest first)
  enriched.sort((a, b) => {
    if (!a.parsedDate) return 1;
    if (!b.parsedDate) return -1;
    return new Date(b.parsedDate) - new Date(a.parsedDate);
  });
  
  // Count by category
  const categoryStats = {};
  enriched.forEach(item => {
    const cat = item.normalizedCategory;
    categoryStats[cat] = (categoryStats[cat] || 0) + 1;
  });
  
  const output = {
    scraped_at: new Date().toISOString(),
    source: 'openai.com/news/rss',
    stats: {
      total: enriched.length,
      high_importance: enriched.filter(i => i.importance === 'high').length,
      by_category: categoryStats
    },
    items: enriched
  };
  
  // Ensure data directory exists
  const dataDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${enriched.length} items to ${OUTPUT_FILE}`);
  
  // Print summary
  console.log('\n=== Category Stats ===');
  Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
  
  const highImportance = enriched.filter(i => i.importance === 'high');
  if (highImportance.length > 0) {
    console.log('\n=== High Importance Items ===');
    highImportance.slice(0, 5).forEach((item, i) => {
      console.log(`${i + 1}. [${item.normalizedCategory}] ${item.title.slice(0, 60)}...`);
    });
  }
}

main().catch(console.error);
