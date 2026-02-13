#!/usr/bin/env node
/**
 * Dev.to AI Articles Scraper
 * 
 * Fetches top AI and coding-related articles from Dev.to.
 * Dev.to has a public API (no auth required for reading).
 * 
 * Sources:
 * - Tag: ai
 * - Tag: machinelearning  
 * - Tag: llm
 * - Tag: openai
 * - Tag: langchain
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'devto-ai.json');

// Tags to fetch (AI coding focused)
const TAGS = [
  'ai',
  'machinelearning',
  'llm', 
  'openai',
  'langchain',
  'claude',
  'gpt',
  'copilot',
  'cursor'
];

// Keywords that indicate highly relevant content
const RELEVANT_KEYWORDS = [
  'coding', 'code', 'developer', 'programming', 'ide', 'editor',
  'cursor', 'copilot', 'claude', 'gpt', 'chatgpt', 'aider', 'cline',
  'windsurf', 'bolt', 'replit', 'codegen', 'autocomplete',
  'agent', 'agentic', 'tool', 'mcp', 'function calling',
  'benchmark', 'comparison', 'review', 'tutorial', 'guide',
  'prompt', 'workflow', 'productivity', 'vscode', 'neovim'
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTag(tag, page = 1, perPage = 30) {
  const url = `https://dev.to/api/articles?tag=${tag}&page=${page}&per_page=${perPage}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'KellCX-Briefing/1.0 (competitive intelligence)',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch tag ${tag}: ${response.status}`);
      return [];
    }
    
    const articles = await response.json();
    return articles.map(article => ({
      id: article.id,
      title: article.title,
      url: article.url,
      description: article.description,
      published_at: article.published_at,
      reading_time: article.reading_time_minutes,
      reactions: article.public_reactions_count,
      comments: article.comments_count,
      author: article.user?.name,
      author_username: article.user?.username,
      tags: article.tag_list,
      cover_image: article.cover_image,
      source_tag: tag
    }));
  } catch (error) {
    console.error(`Error fetching tag ${tag}:`, error.message);
    return [];
  }
}

function isRelevant(article) {
  const text = `${article.title} ${article.description || ''} ${(article.tags || []).join(' ')}`.toLowerCase();
  return RELEVANT_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
}

function categorizeArticle(article) {
  const text = `${article.title} ${article.description || ''}`.toLowerCase();
  
  if (text.includes('tutorial') || text.includes('guide') || text.includes('how to') || text.includes('step by step')) {
    return 'tutorial';
  }
  if (text.includes('comparison') || text.includes('vs') || text.includes('benchmark') || text.includes('review')) {
    return 'comparison';
  }
  if (text.includes('tip') || text.includes('trick') || text.includes('hack') || text.includes('productivity')) {
    return 'tips';
  }
  if (text.includes('build') || text.includes('create') || text.includes('project') || text.includes('app')) {
    return 'project';
  }
  return 'article';
}

function dedupeById(articles) {
  const seen = new Set();
  return articles.filter(article => {
    if (seen.has(article.id)) return false;
    seen.add(article.id);
    return true;
  });
}

async function main() {
  console.log('Dev.to AI Scraper starting...');
  console.log(`Fetching articles from ${TAGS.length} tags\n`);
  
  const allArticles = [];
  
  for (const tag of TAGS) {
    console.log(`Fetching #${tag}...`);
    const articles = await fetchTag(tag);
    console.log(`  Found ${articles.length} articles`);
    allArticles.push(...articles);
    
    // Rate limit: be nice to Dev.to API
    await sleep(500);
  }
  
  // Dedupe and process
  const unique = dedupeById(allArticles);
  console.log(`\nTotal unique articles: ${unique.length}`);
  
  // Filter recent (last 30 days) and sort by engagement
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const processed = unique
    .filter(article => new Date(article.published_at) >= thirtyDaysAgo)
    .map(article => ({
      ...article,
      category: categorizeArticle(article),
      is_relevant: isRelevant(article),
      engagement_score: article.reactions + (article.comments * 3) // Comments weighted higher
    }))
    .sort((a, b) => b.engagement_score - a.engagement_score);
  
  // Separate highly relevant from general
  const relevant = processed.filter(a => a.is_relevant).slice(0, 30);
  const other = processed.filter(a => !a.is_relevant).slice(0, 20);
  
  const output = {
    scraped_at: new Date().toISOString(),
    tags: TAGS,
    stats: {
      total_fetched: unique.length,
      recent_count: processed.length,
      relevant_count: relevant.length,
      other_count: other.length
    },
    relevant_articles: relevant,
    other_articles: other
  };
  
  // Ensure data directory exists
  const dataDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${relevant.length + other.length} articles to ${OUTPUT_FILE}`);
  
  // Print summary
  console.log('\n=== Top 5 Relevant Articles ===');
  relevant.slice(0, 5).forEach((article, i) => {
    console.log(`${i + 1}. [${article.reactions}❤ ${article.comments}💬] ${article.title.slice(0, 60)}...`);
    console.log(`   ${article.category} | by ${article.author}`);
  });
}

main().catch(console.error);
