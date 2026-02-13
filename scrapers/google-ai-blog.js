#!/usr/bin/env node

/**
 * Google AI Blog Scraper
 * Fetches latest AI-related posts from Google's official blogs
 * Covers Gemini releases, AI features, research announcements
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../data/google-ai-blog.json');

// Google blog sources
const SOURCES = [
  {
    name: 'google-ai-blog',
    rss: 'https://blog.google/technology/ai/rss/',
    fallback: 'https://blog.google/technology/ai/'
  },
  {
    name: 'google-developers-ai',
    rss: 'https://developers.googleblog.com/feeds/posts/default/-/AI?alt=rss',
    fallback: 'https://developers.googleblog.com/search/label/AI'
  }
];

// AI-related keywords to filter/prioritize
const AI_KEYWORDS = [
  'gemini', 'ai', 'machine learning', 'deep learning', 'llm', 'language model',
  'neural', 'transformer', 'gpt', 'model', 'claude', 'anthropic', 'openai',
  'vertex', 'bard', 'palm', 'lamda', 'reasoning', 'multimodal', 'vision',
  'agents', 'agentic', 'coding', 'generation', 'synthetic', 'training'
];

async function fetchUrl(url, retries = 2) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');
    
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BriefingBot/1.0; +https://kell.cx)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*'
      },
      timeout: 15000
    }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          const urlObj = new URL(url);
          redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
        }
        return fetchUrl(redirectUrl, retries).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
    
    req.on('error', (e) => {
      if (retries > 0) {
        setTimeout(() => {
          fetchUrl(url, retries - 1).then(resolve).catch(reject);
        }, 1000);
      } else {
        reject(e);
      }
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(num))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function cleanDescription(desc) {
  if (!desc) return '';
  
  // Remove CDATA wrapper
  desc = desc.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  // Remove HTML tags
  let clean = desc.replace(/<[^>]+>/g, ' ');
  // Decode entities
  clean = decodeHtmlEntities(clean);
  // Normalize whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  // Truncate
  if (clean.length > 350) {
    clean = clean.substring(0, 347) + '...';
  }
  return clean;
}

function extractCDATA(str) {
  const match = str.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return match ? match[1] : str;
}

function parseRSS(xml, sourceName) {
  const items = [];
  
  // Try RSS 2.0 format
  const rssItemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);
  
  for (const match of rssItemMatches) {
    const itemXml = match[1];
    
    // Extract title
    let title = '';
    const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      title = extractCDATA(titleMatch[1]).trim();
    }
    
    // Extract link
    let link = '';
    const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    if (linkMatch) {
      link = extractCDATA(linkMatch[1]).trim();
    }
    // Also check for guid as link
    if (!link || link.includes('tag:')) {
      const guidMatch = itemXml.match(/<guid[^>]*>(https?:\/\/[^<]+)<\/guid>/i);
      if (guidMatch) {
        link = guidMatch[1].trim();
      }
    }
    
    // Extract date
    let pubDate = '';
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) ||
                         itemXml.match(/<dc:date>([\s\S]*?)<\/dc:date>/i);
    if (pubDateMatch) {
      pubDate = pubDateMatch[1].trim();
    }
    
    // Extract description/content
    let description = '';
    const descMatch = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ||
                      itemXml.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i) ||
                      itemXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
    if (descMatch) {
      description = cleanDescription(descMatch[1]);
    }
    
    // Extract categories/tags
    const categories = [];
    const catMatches = itemXml.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi);
    for (const catMatch of catMatches) {
      categories.push(extractCDATA(catMatch[1]).trim().toLowerCase());
    }
    
    if (title && link) {
      items.push({
        title: decodeHtmlEntities(title),
        url: link,
        date: pubDate ? new Date(pubDate).toISOString() : null,
        description: description,
        categories: categories,
        source: sourceName
      });
    }
  }
  
  // Try Atom format if RSS didn't yield results
  if (items.length === 0) {
    const atomEntryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi);
    
    for (const match of atomEntryMatches) {
      const entryXml = match[1];
      
      const title = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
      const linkMatch = entryXml.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) ||
                        entryXml.match(/<link[^>]*href=["']([^"']+)["']/i);
      const link = linkMatch ? linkMatch[1] : '';
      const published = entryXml.match(/<published>([\s\S]*?)<\/published>/i)?.[1] ||
                        entryXml.match(/<updated>([\s\S]*?)<\/updated>/i)?.[1] || '';
      const summary = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ||
                      entryXml.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1] || '';
      
      // Categories
      const categories = [];
      const catMatches = entryXml.matchAll(/<category[^>]*term=["']([^"']+)["']/gi);
      for (const catMatch of catMatches) {
        categories.push(catMatch[1].toLowerCase());
      }
      
      if (title && link) {
        items.push({
          title: decodeHtmlEntities(extractCDATA(title).trim()),
          url: link.trim(),
          date: published ? new Date(published).toISOString() : null,
          description: cleanDescription(summary),
          categories: categories,
          source: sourceName
        });
      }
    }
  }
  
  return items;
}

function isAIRelated(item) {
  const text = `${item.title} ${item.description} ${item.categories?.join(' ')}`.toLowerCase();
  return AI_KEYWORDS.some(kw => text.includes(kw));
}

function calculateRelevanceScore(item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  let score = 0;
  
  // High-value terms
  if (text.includes('gemini')) score += 10;
  if (text.includes('announcing') || text.includes('introducing')) score += 5;
  if (text.includes('release') || text.includes('launch')) score += 4;
  if (text.includes('model')) score += 3;
  if (text.includes('api')) score += 3;
  if (text.includes('benchmark')) score += 3;
  if (text.includes('developer')) score += 2;
  
  // General AI terms
  AI_KEYWORDS.forEach(kw => {
    if (text.includes(kw)) score += 1;
  });
  
  return score;
}

async function scrapeFallbackPage(url, sourceName) {
  try {
    const html = await fetchUrl(url);
    const items = [];
    
    // Look for article links with common patterns
    // Pattern: <a href="/technology/ai/..." ...>Title</a>
    const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']*(?:\/ai\/|\/artificial-intelligence\/)[^"']*)["'][^>]*>([^<]+)<\/a>/gi);
    
    const seenUrls = new Set();
    for (const match of linkMatches) {
      let url = match[1];
      let title = match[2].trim();
      
      if (!title || title.length < 10 || seenUrls.has(url)) continue;
      seenUrls.add(url);
      
      // Make URL absolute
      if (url.startsWith('/')) {
        const base = new URL(sourceName.includes('developers') ? 
          'https://developers.googleblog.com' : 'https://blog.google');
        url = base.origin + url;
      }
      
      items.push({
        title: decodeHtmlEntities(title),
        url: url,
        date: null,
        description: '',
        categories: [],
        source: sourceName
      });
    }
    
    return items.slice(0, 20); // Limit fallback results
  } catch (e) {
    console.error(`Fallback scrape failed for ${url}:`, e.message);
    return [];
  }
}

async function main() {
  console.log('Fetching Google AI blog posts...');
  
  let allItems = [];
  
  for (const source of SOURCES) {
    console.log(`\nProcessing ${source.name}...`);
    
    try {
      const xml = await fetchUrl(source.rss);
      const items = parseRSS(xml, source.name);
      console.log(`  Found ${items.length} items from RSS`);
      allItems.push(...items);
    } catch (e) {
      console.log(`  RSS failed: ${e.message}`);
      
      // Try fallback page scrape
      if (source.fallback) {
        const fallbackItems = await scrapeFallbackPage(source.fallback, source.name);
        console.log(`  Found ${fallbackItems.length} items from fallback scrape`);
        allItems.push(...fallbackItems);
      }
    }
  }
  
  // Deduplicate by URL
  const seenUrls = new Set();
  allItems = allItems.filter(item => {
    const normalized = item.url.replace(/\/$/, '').toLowerCase();
    if (seenUrls.has(normalized)) return false;
    seenUrls.add(normalized);
    return true;
  });
  
  // Filter to AI-related content
  const aiItems = allItems.filter(isAIRelated);
  console.log(`\nFiltered to ${aiItems.length} AI-related items`);
  
  // Calculate relevance scores
  aiItems.forEach(item => {
    item.relevanceScore = calculateRelevanceScore(item);
  });
  
  // Filter to last 60 days
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const recentItems = aiItems.filter(item => {
    if (!item.date) return true; // Keep undated items
    return new Date(item.date) > sixtyDaysAgo;
  });
  
  // Sort by date (newest first), then by relevance
  recentItems.sort((a, b) => {
    // Primary: by date
    if (a.date && b.date) {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff !== 0) return dateDiff;
    }
    if (!a.date && b.date) return 1;
    if (a.date && !b.date) return -1;
    
    // Secondary: by relevance
    return (b.relevanceScore || 0) - (a.relevanceScore || 0);
  });
  
  const output = {
    source: 'google-ai',
    description: 'Official Google AI blog posts and announcements',
    fetched_at: new Date().toISOString(),
    count: recentItems.length,
    items: recentItems.slice(0, 50) // Keep top 50 most recent/relevant
  };
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${output.count} items to ${OUTPUT_FILE}`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
