#!/usr/bin/env node
/**
 * Anthropic News Scraper
 * 
 * Fetches news and announcements from Anthropic's website.
 * - News/blog posts from anthropic.com/news
 * - Model card updates
 * - Research announcements
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'anthropic-news.json');

// Anthropic doesn't have an RSS feed, so we'll scrape their news page
// and their research page for announcements

async function fetchAnthropicNews() {
  const url = 'https://www.anthropic.com/news';
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Briefing/1.0; +https://kell.cx)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch Anthropic news: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    return html;
  } catch (error) {
    console.error('Error fetching Anthropic news:', error.message);
    return null;
  }
}

async function fetchAnthropicResearch() {
  const url = 'https://www.anthropic.com/research';
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Briefing/1.0; +https://kell.cx)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch Anthropic research: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    return html;
  } catch (error) {
    console.error('Error fetching Anthropic research:', error.message);
    return null;
  }
}

function parseNewsItems(html) {
  if (!html) return [];
  
  const items = [];
  
  // Look for article cards - Anthropic uses structured markup
  // Pattern: links to /news/... with dates and titles
  
  // Match news article links with their titles
  const articlePattern = /<a[^>]+href="(\/news\/[^"]+)"[^>]*>[\s\S]*?<h[23][^>]*>([^<]+)<\/h[23]>/gi;
  let match;
  
  while ((match = articlePattern.exec(html)) !== null) {
    const url = match[1];
    const title = match[2].trim();
    
    if (title && url && !items.some(i => i.url === url)) {
      items.push({
        title,
        url: `https://www.anthropic.com${url}`,
        source: 'anthropic-news'
      });
    }
  }
  
  // Also try to find JSON-LD structured data if present
  const jsonLdPattern = /<script type="application\/ld\+json">([^<]+)<\/script>/gi;
  while ((match = jsonLdPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      if (data['@type'] === 'Article' || data['@type'] === 'NewsArticle') {
        if (!items.some(i => i.title === data.headline)) {
          items.push({
            title: data.headline,
            url: data.url || data.mainEntityOfPage,
            date: data.datePublished,
            description: data.description,
            source: 'anthropic-news'
          });
        }
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }
  
  // Fallback: look for any links containing /news/ with reasonable text
  const linkPattern = /<a[^>]+href="(\/news\/[^"]+)"[^>]*>([^<]{10,100})<\/a>/gi;
  while ((match = linkPattern.exec(html)) !== null) {
    const url = match[1];
    const title = match[2].trim();
    
    if (title && url && !items.some(i => i.url.includes(url))) {
      items.push({
        title,
        url: `https://www.anthropic.com${url}`,
        source: 'anthropic-news'
      });
    }
  }
  
  return items;
}

function parseResearchItems(html) {
  if (!html) return [];
  
  const items = [];
  
  // Match research article links
  const articlePattern = /<a[^>]+href="(\/research\/[^"]+)"[^>]*>[\s\S]*?<h[23][^>]*>([^<]+)<\/h[23]>/gi;
  let match;
  
  while ((match = articlePattern.exec(html)) !== null) {
    const url = match[1];
    const title = match[2].trim();
    
    if (title && url && !items.some(i => i.url === url)) {
      items.push({
        title,
        url: `https://www.anthropic.com${url}`,
        source: 'anthropic-research'
      });
    }
  }
  
  // Fallback pattern
  const linkPattern = /<a[^>]+href="(\/research\/[^"]+)"[^>]*>([^<]{10,100})<\/a>/gi;
  while ((match = linkPattern.exec(html)) !== null) {
    const url = match[1];
    const title = match[2].trim();
    
    if (title && url && !items.some(i => i.url.includes(url))) {
      items.push({
        title,
        url: `https://www.anthropic.com${url}`,
        source: 'anthropic-research'
      });
    }
  }
  
  return items;
}

// Categorize based on title keywords
function categorize(item) {
  const title = item.title.toLowerCase();
  
  if (title.includes('claude') || title.includes('model')) return 'model';
  if (title.includes('api') || title.includes('developer')) return 'api';
  if (title.includes('safety') || title.includes('alignment')) return 'safety';
  if (title.includes('research') || title.includes('paper')) return 'research';
  if (title.includes('policy') || title.includes('government')) return 'policy';
  
  return 'announcement';
}

async function main() {
  console.log('Anthropic News Scraper starting...\n');
  
  // Fetch both news and research pages
  console.log('Fetching news page...');
  const newsHtml = await fetchAnthropicNews();
  
  console.log('Fetching research page...');
  const researchHtml = await fetchAnthropicResearch();
  
  // Parse items
  const newsItems = parseNewsItems(newsHtml);
  const researchItems = parseResearchItems(researchHtml);
  
  console.log(`Found ${newsItems.length} news items`);
  console.log(`Found ${researchItems.length} research items`);
  
  // Combine and categorize
  const allItems = [...newsItems, ...researchItems].map(item => ({
    ...item,
    category: categorize(item)
  }));
  
  // Deduplicate by URL
  const seen = new Set();
  const unique = allItems.filter(item => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
  
  const output = {
    scraped_at: new Date().toISOString(),
    source: 'anthropic.com',
    stats: {
      news_count: newsItems.length,
      research_count: researchItems.length,
      total_unique: unique.length
    },
    items: unique
  };
  
  // Ensure data directory exists
  const dataDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${unique.length} items to ${OUTPUT_FILE}`);
  
  // Print summary
  if (unique.length > 0) {
    console.log('\n=== Recent Items ===');
    unique.slice(0, 5).forEach((item, i) => {
      console.log(`${i + 1}. [${item.category}] ${item.title.slice(0, 60)}...`);
    });
  }
}

main().catch(console.error);
