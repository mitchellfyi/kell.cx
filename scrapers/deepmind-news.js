#!/usr/bin/env node

/**
 * DeepMind News Scraper
 * Fetches latest news/blog posts from Google DeepMind
 * Similar to anthropic-news.js and openai-news.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../data/deepmind-news.json');

// DeepMind blog RSS/Atom feed
const DEEPMIND_FEED = 'https://deepmind.google/blog/rss.xml';

// Also check their research page for papers
const DEEPMIND_RESEARCH = 'https://deepmind.google/research/publications/';

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');
    
    protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BriefingBot/1.0; +https://kell.cx)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseRSS(xml) {
  const items = [];
  
  // Extract items from RSS
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  
  for (const match of itemMatches) {
    const itemXml = match[1];
    
    const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
                  itemXml.match(/<title>(.*?)<\/title>/)?.[1] || '';
    const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
    const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
    const description = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ||
                        itemXml.match(/<description>(.*?)<\/description>/)?.[1] || '';
    
    if (title && link) {
      items.push({
        title: decodeHtmlEntities(title.trim()),
        url: link.trim(),
        date: pubDate ? new Date(pubDate).toISOString() : null,
        description: cleanDescription(description),
        source: 'deepmind-blog'
      });
    }
  }
  
  // Also try Atom format
  if (items.length === 0) {
    const entryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g);
    
    for (const match of entryMatches) {
      const entryXml = match[1];
      
      const title = entryXml.match(/<title[^>]*>(.*?)<\/title>/)?.[1] || '';
      const link = entryXml.match(/<link[^>]*href="([^"]+)"/)?.[1] || '';
      const published = entryXml.match(/<published>(.*?)<\/published>/)?.[1] ||
                        entryXml.match(/<updated>(.*?)<\/updated>/)?.[1] || '';
      const summary = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1] || '';
      
      if (title && link) {
        items.push({
          title: decodeHtmlEntities(title.trim()),
          url: link.trim(),
          date: published ? new Date(published).toISOString() : null,
          description: cleanDescription(summary),
          source: 'deepmind-blog'
        });
      }
    }
  }
  
  return items;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function cleanDescription(desc) {
  if (!desc) return '';
  
  // Remove HTML tags
  let clean = desc.replace(/<[^>]+>/g, ' ');
  // Decode entities
  clean = decodeHtmlEntities(clean);
  // Normalize whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  // Truncate
  if (clean.length > 300) {
    clean = clean.substring(0, 297) + '...';
  }
  return clean;
}

async function scrapeDeepMindPage() {
  // Fallback: scrape the blog listing page directly
  try {
    const html = await fetchUrl('https://deepmind.google/discover/blog/');
    const items = [];
    
    // Extract blog post cards - pattern based on typical Google blog structure
    const articleMatches = html.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/g);
    
    for (const match of articleMatches) {
      const articleHtml = match[1];
      
      // Try to extract title and link
      const titleMatch = articleHtml.match(/<h[23][^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/);
      if (titleMatch) {
        let url = titleMatch[1];
        if (url.startsWith('/')) {
          url = 'https://deepmind.google' + url;
        }
        
        // Try to extract date
        const dateMatch = articleHtml.match(/datetime="([^"]+)"/);
        
        items.push({
          title: decodeHtmlEntities(titleMatch[2].trim()),
          url: url,
          date: dateMatch ? new Date(dateMatch[1]).toISOString() : null,
          description: '',
          source: 'deepmind-blog'
        });
      }
    }
    
    return items;
  } catch (e) {
    console.error('Failed to scrape DeepMind page:', e.message);
    return [];
  }
}

async function main() {
  console.log('Fetching DeepMind news...');
  
  let items = [];
  
  // Try RSS feed first
  try {
    const rss = await fetchUrl(DEEPMIND_FEED);
    items = parseRSS(rss);
    console.log(`Found ${items.length} items from RSS feed`);
  } catch (e) {
    console.log('RSS feed failed, trying page scrape:', e.message);
  }
  
  // If RSS didn't work, try page scrape
  if (items.length === 0) {
    items = await scrapeDeepMindPage();
    console.log(`Found ${items.length} items from page scrape`);
  }
  
  // Filter to recent items (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentItems = items.filter(item => {
    if (!item.date) return true; // Keep items without dates
    return new Date(item.date) > thirtyDaysAgo;
  });
  
  // Sort by date (newest first)
  recentItems.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });
  
  const output = {
    source: 'deepmind',
    fetched_at: new Date().toISOString(),
    count: recentItems.length,
    items: recentItems
  };
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Wrote ${recentItems.length} items to ${OUTPUT_FILE}`);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
