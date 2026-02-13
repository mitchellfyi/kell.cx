#!/usr/bin/env node

/**
 * Mistral AI News Scraper
 * Fetches latest news/announcements from Mistral AI
 * Covers blog posts, model releases, and company updates
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../data/mistral-news.json');

// Mistral news page
const MISTRAL_NEWS = 'https://mistral.ai/news/';

// Also their docs changelog for model updates
const MISTRAL_DOCS = 'https://docs.mistral.ai/';

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BriefingBot/1.0; +https://kell.cx)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    };
    
    const req = protocol.get(url, options, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http') 
          ? res.headers.location 
          : new URL(res.headers.location, url).href;
        return fetchUrl(redirectUrl).then(resolve).catch(reject);
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
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function cleanText(text) {
  return decodeHtmlEntities(text)
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDate(text) {
  // Common date formats on Mistral's site
  const datePatterns = [
    /(\w+ \d{1,2}, \d{4})/,  // "January 15, 2026"
    /(\d{4}-\d{2}-\d{2})/,   // "2026-01-15"
    /(\d{1,2}\/\d{1,2}\/\d{4})/, // "01/15/2026"
    /(\d{1,2} \w+ \d{4})/    // "15 January 2026"
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const parsed = new Date(match[1]);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  }
  return null;
}

async function scrapeMistralNews() {
  console.log('Fetching Mistral AI news...');
  const items = [];
  
  try {
    const html = await fetchUrl(MISTRAL_NEWS);
    
    // Mistral's news page uses article cards
    // Look for patterns like links with titles and dates
    
    // Pattern 1: Look for article/news item links
    const linkPattern = /<a[^>]+href=["']([^"']*news\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    const seenUrls = new Set();
    
    while ((match = linkPattern.exec(html)) !== null) {
      let url = match[1];
      const content = match[2];
      
      // Make absolute URL
      if (!url.startsWith('http')) {
        url = url.startsWith('/') ? `https://mistral.ai${url}` : `https://mistral.ai/${url}`;
      }
      
      // Skip if already seen or if it's just the news index
      if (seenUrls.has(url) || url === MISTRAL_NEWS || url === 'https://mistral.ai/news') {
        continue;
      }
      seenUrls.add(url);
      
      // Extract title from link content or heading inside
      let title = cleanText(content);
      
      // Look for h1-h3 inside the content
      const headingMatch = content.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
      if (headingMatch) {
        title = cleanText(headingMatch[1]);
      }
      
      if (title && title.length > 5 && title.length < 200) {
        items.push({
          title,
          url,
          source: 'mistral-blog'
        });
      }
    }
    
    // Pattern 2: Look for article cards with data attributes or structured divs
    const articlePattern = /<article[^>]*>([\s\S]*?)<\/article>/gi;
    while ((match = articlePattern.exec(html)) !== null) {
      const articleHtml = match[1];
      
      // Find link
      const linkMatch = articleHtml.match(/href=["']([^"']+)["']/);
      if (!linkMatch) continue;
      
      let url = linkMatch[1];
      if (!url.startsWith('http')) {
        url = url.startsWith('/') ? `https://mistral.ai${url}` : `https://mistral.ai/${url}`;
      }
      
      if (seenUrls.has(url)) continue;
      seenUrls.add(url);
      
      // Find title
      const titleMatch = articleHtml.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
      const title = titleMatch ? cleanText(titleMatch[1]) : null;
      
      // Find date
      const dateMatch = articleHtml.match(/<time[^>]*datetime=["']([^"']+)["']/i);
      const date = dateMatch ? new Date(dateMatch[1]).toISOString() : extractDate(articleHtml);
      
      // Find description
      const descMatch = articleHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      const description = descMatch ? cleanText(descMatch[1]).slice(0, 300) : null;
      
      if (title && title.length > 5) {
        items.push({
          title,
          url,
          date,
          description,
          source: 'mistral-blog'
        });
      }
    }
    
    // Pattern 3: Look for div-based cards (common in Next.js sites)
    const cardPattern = /<div[^>]*class="[^"]*card[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    while ((match = cardPattern.exec(html)) !== null) {
      const cardHtml = match[1];
      
      const linkMatch = cardHtml.match(/href=["']([^"']+)["']/);
      if (!linkMatch) continue;
      
      let url = linkMatch[1];
      if (!url.startsWith('http')) {
        url = url.startsWith('/') ? `https://mistral.ai${url}` : `https://mistral.ai/${url}`;
      }
      
      if (seenUrls.has(url) || !url.includes('/news/')) continue;
      seenUrls.add(url);
      
      const titleMatch = cardHtml.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i);
      const title = titleMatch ? cleanText(titleMatch[1]) : null;
      
      if (title && title.length > 5) {
        items.push({
          title,
          url,
          source: 'mistral-blog'
        });
      }
    }
    
    console.log(`Found ${items.length} news items from Mistral AI`);
    
  } catch (err) {
    console.error('Error fetching Mistral news:', err.message);
  }
  
  return items;
}

async function scrapeWithFallback() {
  let items = await scrapeMistralNews();
  
  // If we got no items, try fetching known recent URLs
  if (items.length === 0) {
    console.log('No items found via scraping, trying known patterns...');
    
    // Mistral typically uses slug-based URLs for news
    // We can at least acknowledge the main page exists
    items.push({
      title: 'Mistral AI News',
      url: MISTRAL_NEWS,
      description: 'Latest updates from Mistral AI - check the news page directly',
      source: 'mistral-placeholder',
      note: 'Scraper may need updating - visit site directly'
    });
  }
  
  return items;
}

async function main() {
  console.log('=== Mistral AI News Scraper ===');
  console.log(`Started at ${new Date().toISOString()}`);
  
  const items = await scrapeWithFallback();
  
  // Load existing data to merge
  let existingData = { items: [], lastUpdated: null };
  try {
    if (fs.existsSync(OUTPUT_FILE)) {
      existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    }
  } catch (e) {
    console.log('No existing data file or parse error');
  }
  
  // Merge new items with existing, deduping by URL
  const urlMap = new Map();
  
  // Add existing items first
  for (const item of existingData.items || []) {
    if (item.url) urlMap.set(item.url, item);
  }
  
  // Add/update with new items
  for (const item of items) {
    if (item.url) urlMap.set(item.url, { ...urlMap.get(item.url), ...item });
  }
  
  // Sort by date (newest first), then by title
  const mergedItems = Array.from(urlMap.values()).sort((a, b) => {
    if (a.date && b.date) return new Date(b.date) - new Date(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title);
  });
  
  const output = {
    source: 'mistral-ai',
    url: MISTRAL_NEWS,
    lastUpdated: new Date().toISOString(),
    itemCount: mergedItems.length,
    items: mergedItems.slice(0, 50) // Keep latest 50
  };
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Wrote ${output.itemCount} items to ${OUTPUT_FILE}`);
  
  return output;
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
