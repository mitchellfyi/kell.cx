#!/usr/bin/env node
/**
 * Bluesky AI Scraper
 * 
 * Fetches AI-related posts from Bluesky using their public API.
 * Bluesky has an open API and growing AI/tech community.
 * 
 * Searches for posts about:
 * - AI model releases and announcements
 * - LLM benchmarks and comparisons  
 * - AI coding tools and agents
 * - Industry news from key accounts
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'bluesky-ai.json');

// Search terms to find relevant posts
const SEARCH_TERMS = [
  'claude 4',
  'gpt-5',
  'anthropic',
  'openai',
  'llama 4',
  'gemini 2',
  'ai benchmark',
  'swe-bench',
  'aider',
  'cursor ai',
  'copilot',
  'ai agent',
  'ai coding'
];

// Key accounts to follow for AI news (expanded list since search requires auth)
// Only accounts verified to exist on Bluesky
const KEY_HANDLES = [
  'simonw.bsky.social',          // Simon Willison - AI blogger
  'karpathy.bsky.social',        // Andrej Karpathy  
  'jeffdean.bsky.social',        // Jeff Dean - Google AI
  'hardmaru.bsky.social',        // David Ha - Sakana AI
  'moritzlaurer.bsky.social',    // Moritz Laurer - NLP
  'aigrant.bsky.social',         // AI Grant
  'sakanaai.bsky.social',        // Sakana AI (discovered from reposts)
];

const BLUESKY_API = 'https://public.api.bsky.app';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchPosts(query, limit = 25) {
  const url = `${BLUESKY_API}/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&limit=${limit}&sort=latest`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Briefing/1.0 (AI news aggregator; +https://kell.cx)'
      }
    });
    
    if (!response.ok) {
      console.error(`  Search failed for "${query}": ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return data.posts || [];
  } catch (error) {
    console.error(`  Error searching "${query}":`, error.message);
    return [];
  }
}

async function getAuthorFeed(handle, limit = 20) {
  const url = `${BLUESKY_API}/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(handle)}&limit=${limit}&filter=posts_no_replies`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Briefing/1.0 (AI news aggregator; +https://kell.cx)'
      }
    });
    
    if (!response.ok) {
      console.error(`  Feed fetch failed for @${handle}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return (data.feed || []).map(item => item.post);
  } catch (error) {
    console.error(`  Error fetching @${handle}:`, error.message);
    return [];
  }
}

function formatPost(post) {
  const record = post.record;
  const author = post.author;
  
  // Build Bluesky web URL
  const uri = post.uri; // at://did:plc:xxx/app.bsky.feed.post/xxx
  const parts = uri.split('/');
  const rkey = parts[parts.length - 1];
  const webUrl = `https://bsky.app/profile/${author.handle}/post/${rkey}`;
  
  return {
    uri: post.uri,
    url: webUrl,
    author: {
      handle: author.handle,
      displayName: author.displayName || author.handle,
      avatar: author.avatar
    },
    text: record?.text || '',
    createdAt: record?.createdAt,
    created_utc: record?.createdAt ? Math.floor(new Date(record.createdAt).getTime() / 1000) : null,
    likeCount: post.likeCount || 0,
    repostCount: post.repostCount || 0,
    replyCount: post.replyCount || 0,
    // Check for embedded links
    embed: post.embed ? {
      type: post.embed.$type,
      uri: post.embed?.external?.uri,
      title: post.embed?.external?.title,
      description: post.embed?.external?.description
    } : null,
    // Check for images
    hasImages: post.embed?.$type === 'app.bsky.embed.images#view'
  };
}

function isAIRelevant(post) {
  const text = (post.text || '').toLowerCase();
  const embedText = `${post.embed?.title || ''} ${post.embed?.description || ''}`.toLowerCase();
  const combined = text + ' ' + embedText;
  
  const aiKeywords = [
    'llm', 'language model', 'ai model', 'chatgpt', 'claude', 'gemini',
    'gpt-4', 'gpt-5', 'gpt4', 'gpt5', 'llama', 'mistral', 'anthropic', 'openai',
    'benchmark', 'swe-bench', 'aider', 'cursor', 'copilot', 'windsurf',
    'ai agent', 'agentic', 'tool use', 'function calling',
    'fine-tun', 'finetun', 'rlhf', 'transformer', 'neural', 'deep learning',
    'artificial intelligence', 'machine learning', ' ml ', 'training', 'inference',
    'model', 'weights', 'tokens', 'context window', 'reasoning',
    'hugging face', 'huggingface', 'diffusion', 'stable', 'midjourney',
    'embedding', 'vector', 'rag', 'retrieval', 'prompt'
  ];
  
  return aiKeywords.some(kw => combined.includes(kw));
}

function categorizePost(post) {
  const text = (post.text || '').toLowerCase();
  
  if (text.includes('release') || text.includes('announcing') || text.includes('launched') || text.includes('introducing')) {
    return 'release';
  }
  if (text.includes('benchmark') || text.includes('comparison') || text.includes(' vs ') || text.includes('tested')) {
    return 'benchmark';
  }
  if (text.includes('thread') || text.includes('how to') || text.includes('tutorial')) {
    return 'thread';
  }
  if (post.embed?.uri) {
    return 'link';
  }
  return 'discussion';
}

async function main() {
  console.log('Bluesky AI Scraper starting...');
  console.log('(Note: Search API requires auth, using feed-based approach)\n');
  
  const allPosts = new Map(); // Dedupe by URI
  
  // Get posts from key accounts (search requires auth so we skip it)
  console.log('--- Key Account Feeds ---');
  for (const handle of KEY_HANDLES) {
    console.log(`Fetching @${handle}...`);
    const posts = await getAuthorFeed(handle, 15);
    
    let aiCount = 0;
    for (const post of posts) {
      const formatted = formatPost(post);
      if (isAIRelevant(formatted) && !allPosts.has(post.uri)) {
        allPosts.set(post.uri, formatted);
        aiCount++;
      }
    }
    console.log(`  Found ${posts.length} posts, ${aiCount} AI-relevant`);
    await sleep(300);
  }
  
  // Process all posts
  const posts = Array.from(allPosts.values())
    .filter(p => isAIRelevant(p))
    .map(p => ({
      ...p,
      category: categorizePost(p),
      engagement: (p.likeCount || 0) + (p.repostCount || 0) * 2 + (p.replyCount || 0)
    }))
    .sort((a, b) => b.engagement - a.engagement);
  
  // Separate high and low engagement
  const highEngagement = posts.filter(p => p.engagement >= 5).slice(0, 40);
  const recent = posts.filter(p => p.engagement < 5).slice(0, 20);
  
  const output = {
    scraped_at: new Date().toISOString(),
    source: 'bluesky',
    stats: {
      total_fetched: allPosts.size,
      ai_relevant: posts.length,
      high_engagement: highEngagement.length,
      recent: recent.length
    },
    search_terms: SEARCH_TERMS,
    key_accounts: KEY_HANDLES,
    high_engagement_posts: highEngagement,
    recent_posts: recent
  };
  
  // Ensure data directory exists
  const dataDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${posts.length} AI-relevant posts to ${OUTPUT_FILE}`);
  
  // Print summary
  if (highEngagement.length > 0) {
    console.log('\n=== Top 5 Posts by Engagement ===');
    highEngagement.slice(0, 5).forEach((post, i) => {
      const text = post.text.slice(0, 80).replace(/\n/g, ' ');
      console.log(`${i + 1}. [${post.engagement}] @${post.author.handle}`);
      console.log(`   ${text}${post.text.length > 80 ? '...' : ''}`);
    });
  }
}

main().catch(console.error);
