#!/usr/bin/env node
/**
 * AI RSS Feed Aggregator
 * Fetches from RSS/Atom feeds of major AI sources
 * 
 * Sources with RSS:
 * - Hugging Face Blog
 * - AI Snake Oil (Substack) 
 * - Simon Willison's Weblog (prolific AI blogger)
 * - The AI Times
 * - MIT Technology Review AI
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'ai-rss-news.json');

const FEEDS = [
  {
    name: 'Hugging Face Blog',
    url: 'https://huggingface.co/blog/feed.xml',
    category: 'industry'
  },
  {
    name: 'Simon Willison',
    url: 'https://simonwillison.net/atom/everything/',
    category: 'technical'
  },
  {
    name: 'MIT Tech Review AI',
    url: 'https://www.technologyreview.com/feed/',
    category: 'news'
  },
  {
    name: 'The Batch (DeepLearning.AI)',
    url: 'https://www.deeplearning.ai/the-batch/feed/',
    category: 'news'
  },
  {
    name: 'AI News (Google)',
    url: 'https://blog.google/technology/ai/rss/',
    category: 'industry'
  }
];

async function fetchFeed(feedInfo) {
  try {
    const res = await fetch(feedInfo.url, {
      headers: {
        'User-Agent': 'Briefing/1.0 (+https://kell.cx)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
      }
    });
    
    if (!res.ok) {
      console.error(`  ${feedInfo.name}: HTTP ${res.status}`);
      return [];
    }
    
    const xml = await res.text();
    return parseRSS(xml, feedInfo);
  } catch (err) {
    console.error(`  ${feedInfo.name}: ${err.message}`);
    return [];
  }
}

function parseRSS(xml, feedInfo) {
  const items = [];
  
  // Try to extract <item> (RSS) or <entry> (Atom) elements
  const itemMatches = xml.matchAll(/<(item|entry)>([\s\S]*?)<\/\1>/gi);
  
  for (const match of itemMatches) {
    const content = match[2];
    
    // Extract title
    const titleMatch = content.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/is);
    const title = titleMatch ? stripCDATA(titleMatch[1]).trim() : null;
    
    // Extract link (handle both RSS and Atom formats)
    let link = null;
    const linkMatch = content.match(/<link[^>]*href="([^"]+)"/i) || 
                      content.match(/<link>([^<]+)<\/link>/i);
    if (linkMatch) link = linkMatch[1].trim();
    
    // Extract date
    const dateMatch = content.match(/<(pubDate|published|updated)>([^<]+)<\/\1>/i);
    const date = dateMatch ? dateMatch[2].trim() : null;
    
    // Extract description/summary
    const descMatch = content.match(/<(description|summary|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/i);
    let description = descMatch ? stripCDATA(descMatch[2]).trim() : null;
    if (description) {
      description = stripTags(description).slice(0, 200);
      if (description.length === 200) description += '...';
    }
    
    if (title && link) {
      items.push({
        source: feedInfo.name,
        category: feedInfo.category,
        title: stripTags(title),
        url: link,
        date: date ? new Date(date).toISOString() : null,
        description
      });
    }
  }
  
  return items.slice(0, 10); // Limit per feed
}

function stripCDATA(str) {
  return str.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '');
}

function stripTags(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log('Fetching AI RSS feeds...\n');
  
  const allItems = [];
  
  for (const feed of FEEDS) {
    console.log(`Fetching: ${feed.name}`);
    const items = await fetchFeed(feed);
    console.log(`  → ${items.length} items`);
    allItems.push(...items);
  }
  
  // Sort by date (newest first)
  allItems.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });
  
  const output = {
    scraped_at: new Date().toISOString(),
    feeds: FEEDS.map(f => ({ name: f.name, url: f.url })),
    total_count: allItems.length,
    items: allItems
  };
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\n✓ Saved ${allItems.length} items to ${OUTPUT_FILE}`);
}

main().catch(console.error);
