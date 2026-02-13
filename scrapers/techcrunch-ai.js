#!/usr/bin/env node
/**
 * TechCrunch AI News Scraper
 * 
 * Fetches AI-related articles from TechCrunch's RSS feed.
 * TechCrunch is one of the most authoritative tech news sources,
 * particularly for startup news, funding rounds, and industry analysis.
 * 
 * Sources:
 * - Main TechCrunch RSS feed (filtered for AI keywords)
 * - AI category tag when available
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'techcrunch-ai.json');

// AI-related keywords to filter articles
const AI_KEYWORDS = [
  'artificial intelligence', 'ai ', ' ai', 'machine learning', 'deep learning',
  'llm', 'large language model', 'chatgpt', 'gpt-4', 'gpt-5', 'claude', 'anthropic',
  'openai', 'google ai', 'deepmind', 'gemini', 'mistral', 'llama', 'meta ai',
  'copilot', 'github copilot', 'cursor', 'windsurf', 'codeium', 'tabnine',
  'neural network', 'transformer', 'diffusion', 'generative ai', 'gen ai',
  'autonomous', 'robotics', 'computer vision', 'nlp', 'natural language',
  'hugging face', 'huggingface', 'stability ai', 'midjourney', 'dalle', 'dall-e',
  'perplexity', 'cohere', 'together ai', 'fireworks ai', 'anyscale', 'databricks',
  'nvidia ai', 'amd ai', 'ai chip', 'ai hardware', 'tpu', 'gpu cluster',
  'agent', 'agentic', 'rag', 'retrieval augmented', 'embeddings', 'vector database'
];

async function fetchTechCrunchRSS() {
  // TechCrunch RSS feed
  const url = 'https://techcrunch.com/feed/';
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Briefing/1.0; +https://kell.cx)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch TechCrunch RSS: ${response.status}`);
      return null;
    }
    
    const xml = await response.text();
    return xml;
  } catch (error) {
    console.error('Error fetching TechCrunch RSS:', error.message);
    return null;
  }
}

function parseRSSItems(xml) {
  if (!xml) return [];
  
  const items = [];
  
  // Parse RSS items
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  
  while ((match = itemPattern.exec(xml)) !== null) {
    const itemXml = match[1];
    
    // Extract fields
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const pubDate = extractTag(itemXml, 'pubDate');
    const description = extractTag(itemXml, 'description');
    const creator = extractTag(itemXml, 'dc:creator') || extractTag(itemXml, 'creator');
    const categories = extractAllTags(itemXml, 'category');
    
    if (title && link) {
      items.push({
        title: cleanHtml(title),
        url: link.trim(),
        date: pubDate ? new Date(pubDate).toISOString() : null,
        description: cleanHtml(description),
        author: creator ? cleanHtml(creator) : null,
        categories: categories.map(c => cleanHtml(c))
      });
    }
  }
  
  return items;
}

function extractTag(xml, tagName) {
  // Handle CDATA and regular tags
  const cdataPattern = new RegExp(`<${tagName}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tagName}>`, 'i');
  const simplePattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
  
  let match = cdataPattern.exec(xml);
  if (match) return match[1];
  
  match = simplePattern.exec(xml);
  if (match) return match[1];
  
  return null;
}

function extractAllTags(xml, tagName) {
  const results = [];
  const pattern = new RegExp(`<${tagName}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tagName}>`, 'gi');
  let match;
  
  while ((match = pattern.exec(xml)) !== null) {
    results.push(match[1]);
  }
  
  return results;
}

function cleanHtml(str) {
  if (!str) return '';
  return str
    .replace(/<[^>]+>/g, '')           // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAIRelated(item) {
  const searchText = [
    item.title,
    item.description,
    ...(item.categories || [])
  ].join(' ').toLowerCase();
  
  return AI_KEYWORDS.some(keyword => searchText.includes(keyword.toLowerCase()));
}

function scoreItem(item) {
  let score = 0;
  const searchText = [item.title, item.description].join(' ').toLowerCase();
  
  // Score based on keyword matches
  AI_KEYWORDS.forEach(keyword => {
    if (searchText.includes(keyword.toLowerCase())) {
      score += 1;
    }
  });
  
  // Boost for AI in title
  if (item.title && item.title.toLowerCase().match(/\bai\b|artificial intelligence|machine learning|llm/)) {
    score += 5;
  }
  
  // Boost for major company mentions
  const majorCompanies = ['openai', 'anthropic', 'google', 'meta', 'microsoft', 'nvidia'];
  majorCompanies.forEach(company => {
    if (searchText.includes(company)) {
      score += 2;
    }
  });
  
  // Boost for funding/acquisition news
  if (searchText.match(/funding|raised|acquisition|acquires|acquired|series [a-e]|valuation/)) {
    score += 3;
  }
  
  // Recency boost
  if (item.date) {
    const hoursAgo = (Date.now() - new Date(item.date).getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 6) score += 5;
    else if (hoursAgo < 12) score += 3;
    else if (hoursAgo < 24) score += 2;
  }
  
  return score;
}

async function main() {
  console.log('Fetching TechCrunch AI news...');
  
  const xml = await fetchTechCrunchRSS();
  if (!xml) {
    console.error('Failed to fetch RSS feed');
    process.exit(1);
  }
  
  // Parse all items
  const allItems = parseRSSItems(xml);
  console.log(`Parsed ${allItems.length} total articles`);
  
  // Filter for AI-related
  const aiItems = allItems.filter(isAIRelated);
  console.log(`Found ${aiItems.length} AI-related articles`);
  
  // Score and sort
  const scored = aiItems.map(item => ({
    ...item,
    score: scoreItem(item)
  })).sort((a, b) => b.score - a.score);
  
  // Build output
  const output = {
    source: 'TechCrunch',
    url: 'https://techcrunch.com',
    fetched_at: new Date().toISOString(),
    total_parsed: allItems.length,
    ai_filtered: aiItems.length,
    articles: scored.map(({ score, ...rest }) => rest) // Remove score from output
  };
  
  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Wrote ${scored.length} articles to ${OUTPUT_FILE}`);
  
  // Show top articles
  if (scored.length > 0) {
    console.log('\nTop AI articles:');
    scored.slice(0, 5).forEach((item, i) => {
      console.log(`${i + 1}. ${item.title} (score: ${item.score})`);
    });
  }
}

main().catch(console.error);
