#!/usr/bin/env node
/**
 * Reddit AI Scraper (RSS Version)
 * 
 * Uses Reddit's public RSS feeds which don't require authentication.
 * Falls back to RSS after Reddit blocked their JSON API in 2024.
 * 
 * Sources:
 * - r/LocalLLaMA - Local model news, releases, benchmarks
 * - r/MachineLearning - Academic/industry ML news
 * - r/ClaudeAI - Claude-specific discussions
 * - r/ChatGPT - GPT-specific discussions
 * - r/singularity - General AI news/hype
 */

const fs = require('fs');
const path = require('path');

const SUBREDDITS = [
  { name: 'LocalLLaMA', category: 'local-models' },
  { name: 'MachineLearning', category: 'academic' },
  { name: 'ClaudeAI', category: 'claude' },
  { name: 'ChatGPT', category: 'chatgpt' },
  { name: 'singularity', category: 'general' }
];

const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'reddit-ai.json');
const MAX_POSTS_PER_SUB = 25;

// Keywords that indicate relevant content
const RELEVANT_KEYWORDS = [
  'benchmark', 'release', 'announcement', 'new model', 'update',
  'claude', 'gpt', 'llama', 'gemini', 'mistral', 'anthropic', 'openai',
  'coding', 'agentic', 'tool use', 'function calling', 'context',
  'fine-tune', 'finetune', 'quantiz', 'gguf', 'ollama', 'vllm',
  'open source', 'open-source', 'weights', 'trained',
  'cursor', 'copilot', 'aider', 'cline', 'windsurf', 'bolt'
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simple Atom/RSS parser - extracts items from feed XML
 * Reddit returns Atom format (<entry>) not RSS (<item>)
 */
function parseRSS(xml) {
  const items = [];
  
  // Try Atom format first (Reddit uses this)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match;
  
  while ((match = entryRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    
    const title = extractTag(itemXml, 'title');
    // Atom uses <link href="..."/> not <link>...</link>
    const link = extractLinkHref(itemXml) || extractTag(itemXml, 'link');
    const pubDate = extractTag(itemXml, 'published') || extractTag(itemXml, 'updated');
    const content = extractTag(itemXml, 'content');
    // Atom author format: <author><name>...</name></author>
    const authorBlock = itemXml.match(/<author>([\s\S]*?)<\/author>/i);
    const author = authorBlock ? extractTag(authorBlock[1], 'name') : null;
    
    if (title && link) {
      items.push({
        title: decodeHTMLEntities(title),
        link,
        pubDate,
        description: cleanDescription(content),
        author
      });
    }
  }
  
  // Fallback to RSS format if no entries found
  if (items.length === 0) {
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      
      const title = extractTag(itemXml, 'title');
      const link = extractTag(itemXml, 'link');
      const pubDate = extractTag(itemXml, 'pubDate');
      const description = extractTag(itemXml, 'description');
      const author = extractTag(itemXml, 'dc:creator') || extractAuthorFromLink(link);
      
      if (title && link) {
        items.push({
          title: decodeHTMLEntities(title),
          link,
          pubDate,
          description: cleanDescription(description),
          author
        });
      }
    }
  }
  
  return items;
}

function extractLinkHref(xml) {
  // Match <link href="..."/> or <link href="...">
  const match = xml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return match ? match[1] : null;
}

function extractTag(xml, tag) {
  // Handle CDATA wrapped content
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();
  
  // Handle regular content
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function extractAuthorFromLink(link) {
  // Reddit links contain /u/username in comments
  const match = link?.match(/\/u\/([^\/\s]+)/);
  return match ? match[1] : null;
}

function decodeHTMLEntities(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x200B;/g, ''); // Zero-width space
}

function cleanDescription(html) {
  if (!html) return null;
  
  // Decode HTML entities first
  let text = decodeHTMLEntities(html);
  
  // Strip HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Truncate
  return text.length > 500 ? text.slice(0, 497) + '...' : text;
}

async function fetchSubredditRSS(subreddit, sort = 'hot') {
  // Reddit RSS feeds are public and don't require auth
  const url = `https://www.reddit.com/r/${subreddit}/${sort}/.rss`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Briefing/1.0 (AI news aggregator; +https://kell.cx)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    });
    
    if (!response.ok) {
      console.error(`  Failed to fetch r/${subreddit} RSS: ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    const items = parseRSS(xml);
    
    return items.slice(0, MAX_POSTS_PER_SUB).map(item => ({
      subreddit,
      title: item.title,
      permalink: item.link,
      url: item.link, // RSS doesn't give external URL, just reddit link
      author: item.author,
      created_utc: item.pubDate ? Math.floor(new Date(item.pubDate).getTime() / 1000) : null,
      selftext: item.description,
      // RSS doesn't provide scores, estimate relevance differently
      score: null,
      num_comments: null,
      is_self: true,
      flair: null
    }));
  } catch (error) {
    console.error(`  Error fetching r/${subreddit}:`, error.message);
    return [];
  }
}

function isRelevant(post) {
  const text = `${post.title} ${post.selftext || ''}`.toLowerCase();
  return RELEVANT_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
}

function categorizePost(post) {
  const text = `${post.title}`.toLowerCase();
  
  if (text.includes('release') || text.includes('announcement') || text.includes('new model') || text.includes('introducing')) {
    return 'release';
  }
  if (text.includes('benchmark') || text.includes('comparison') || text.includes(' vs ') || text.includes('tested')) {
    return 'benchmark';
  }
  if (text.includes('tutorial') || text.includes('guide') || text.includes('how to') || text.includes('walkthrough')) {
    return 'tutorial';
  }
  if (text.includes('?') || text.includes('help') || text.includes('issue') || text.includes('problem')) {
    return 'discussion';
  }
  return 'news';
}

async function main() {
  console.log('Reddit AI Scraper (RSS) starting...');
  console.log(`Fetching from ${SUBREDDITS.length} subreddits\n`);
  
  const allPosts = [];
  
  for (const sub of SUBREDDITS) {
    console.log(`Fetching r/${sub.name}...`);
    const posts = await fetchSubredditRSS(sub.name, 'hot');
    
    // Add category and filter for relevance
    const processed = posts.map(post => ({
      ...post,
      source_category: sub.category,
      post_category: categorizePost(post),
      is_relevant: isRelevant(post)
    }));
    
    console.log(`  Found ${posts.length} posts, ${processed.filter(p => p.is_relevant).length} relevant`);
    allPosts.push(...processed);
    
    // Be nice to Reddit's rate limits
    await sleep(1500);
  }
  
  // Sort by recency (since we don't have scores from RSS)
  const sorted = allPosts.sort((a, b) => {
    // Prioritize relevant posts
    if (a.is_relevant && !b.is_relevant) return -1;
    if (!a.is_relevant && b.is_relevant) return 1;
    // Then by date
    return (b.created_utc || 0) - (a.created_utc || 0);
  });
  
  // Separate into relevant and other
  const relevant = sorted.filter(p => p.is_relevant).slice(0, 30);
  const other = sorted.filter(p => !p.is_relevant).slice(0, 20);
  
  const output = {
    scraped_at: new Date().toISOString(),
    source: 'rss',
    subreddits: SUBREDDITS.map(s => s.name),
    stats: {
      total_fetched: allPosts.length,
      relevant_count: relevant.length,
      other_count: other.length
    },
    relevant_posts: relevant,
    other_posts: other
  };
  
  // Ensure data directory exists
  const dataDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${relevant.length + other.length} posts to ${OUTPUT_FILE}`);
  
  // Print summary
  if (relevant.length > 0) {
    console.log('\n=== Top 5 Relevant Posts ===');
    relevant.slice(0, 5).forEach((post, i) => {
      console.log(`${i + 1}. ${post.title.slice(0, 70)}${post.title.length > 70 ? '...' : ''}`);
      console.log(`   r/${post.subreddit} | ${post.post_category}`);
    });
  } else {
    console.log('\nNo relevant posts found in this fetch.');
  }
}

main().catch(console.error);
