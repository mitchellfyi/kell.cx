#!/usr/bin/env node
/**
 * Hacker News AI Mentions Scraper
 * Tracks AI-related discussions and stories on HN
 * Source: https://hn.algolia.com/api
 */

const fs = require('fs');
const path = require('path');

const ALGOLIA_API = 'https://hn.algolia.com/api/v1';

// AI-related search terms
const AI_QUERIES = [
  'Claude',
  'GPT-4',
  'GPT-5',
  'ChatGPT',
  'Anthropic',
  'OpenAI',
  'Gemini AI',
  'LLM',
  'language model',
  'AI agent',
  'agentic',
  'AI coding',
  'cursor AI',
  'copilot',
];

// Companies to track specifically
const AI_COMPANIES = [
  { name: 'Anthropic', query: 'Anthropic' },
  { name: 'OpenAI', query: 'OpenAI' },
  { name: 'Google DeepMind', query: 'DeepMind OR "Google AI"' },
  { name: 'xAI', query: 'xAI OR Grok' },
  { name: 'Meta AI', query: '"Meta AI" OR "LLaMA"' },
  { name: 'Mistral', query: 'Mistral AI' },
  { name: 'Cohere', query: 'Cohere AI' },
];

async function searchHN(query, options = {}) {
  const params = new URLSearchParams({
    query,
    tags: options.tags || 'story',
    numericFilters: `created_at_i>${Math.floor(Date.now() / 1000) - (options.hoursBack || 24) * 3600}`,
    hitsPerPage: options.limit || 50,
  });

  const url = `${ALGOLIA_API}/search?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HN API error: ${res.status}`);
  return res.json();
}

async function getTopStories(limit = 30) {
  const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
  if (!res.ok) throw new Error(`HN Firebase error: ${res.status}`);
  const ids = await res.json();
  return ids.slice(0, limit);
}

async function getStory(id) {
  const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
  if (!res.ok) return null;
  return res.json();
}

function isAIRelated(story) {
  if (!story || !story.title) return false;
  const text = `${story.title} ${story.url || ''}`.toLowerCase();
  
  const aiKeywords = [
    'ai', 'llm', 'gpt', 'claude', 'anthropic', 'openai', 'gemini',
    'chatbot', 'language model', 'neural', 'transformer', 'machine learning',
    'deep learning', 'artificial intelligence', 'copilot', 'cursor',
    'agentic', 'autonomous agent', 'reasoning', 'benchmark',
    'deepseek', 'mistral', 'llama', 'qwen', 'grok',
  ];
  
  return aiKeywords.some(kw => text.includes(kw));
}

async function main() {
  console.log('🔍 Fetching Hacker News AI Mentions...\n');

  try {
    const results = {
      generatedAt: new Date().toISOString(),
      source: 'Hacker News (Algolia API)',
      timeRange: '24 hours',
      stories: [],
      byCompany: {},
      trending: [],
    };

    // 1. Get AI-related stories from search
    console.log('  Searching AI topics...');
    const allStories = new Map();

    for (const query of AI_QUERIES) {
      const data = await searchHN(query, { hoursBack: 48, limit: 20 });
      for (const hit of data.hits) {
        if (!allStories.has(hit.objectID)) {
          allStories.set(hit.objectID, {
            id: hit.objectID,
            title: hit.title,
            url: hit.url,
            author: hit.author,
            points: hit.points || 0,
            comments: hit.num_comments || 0,
            createdAt: new Date(hit.created_at).toISOString(),
            hnUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
            matchedQuery: query,
          });
        }
      }
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`    Found ${allStories.size} unique stories from search`);

    // 2. Check current top stories for AI relevance
    console.log('  Checking top stories...');
    const topIds = await getTopStories(50);
    let aiInTop = 0;

    for (const id of topIds) {
      const story = await getStory(id);
      if (story && isAIRelated(story) && !allStories.has(String(id))) {
        allStories.set(String(id), {
          id: String(id),
          title: story.title,
          url: story.url,
          author: story.by,
          points: story.score || 0,
          comments: story.descendants || 0,
          createdAt: new Date(story.time * 1000).toISOString(),
          hnUrl: `https://news.ycombinator.com/item?id=${id}`,
          isTopStory: true,
        });
        aiInTop++;
      }
      // Rate limit
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`    Found ${aiInTop} AI stories in top 50`);

    // 3. Track by company
    console.log('  Tracking company mentions...');
    for (const company of AI_COMPANIES) {
      const data = await searchHN(company.query, { hoursBack: 72, limit: 10 });
      results.byCompany[company.name] = {
        mentions: data.hits.length,
        totalPoints: data.hits.reduce((sum, h) => sum + (h.points || 0), 0),
        topStory: data.hits[0] ? {
          title: data.hits[0].title,
          points: data.hits[0].points,
          url: `https://news.ycombinator.com/item?id=${data.hits[0].objectID}`,
        } : null,
      };
      await new Promise(r => setTimeout(r, 200));
    }

    // Convert to array and sort by points
    results.stories = Array.from(allStories.values())
      .sort((a, b) => b.points - a.points);

    // Top trending (high points in last 24h)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    results.trending = results.stories
      .filter(s => new Date(s.createdAt).getTime() > oneDayAgo)
      .slice(0, 10);

    // Summary stats
    results.summary = {
      totalStories: results.stories.length,
      last24h: results.stories.filter(s => new Date(s.createdAt).getTime() > oneDayAgo).length,
      totalPoints: results.stories.reduce((sum, s) => sum + s.points, 0),
      totalComments: results.stories.reduce((sum, s) => sum + s.comments, 0),
      topStory: results.stories[0] || null,
    };

    console.log(`\n  Summary:`);
    console.log(`    Total AI stories: ${results.summary.totalStories}`);
    console.log(`    Last 24h: ${results.summary.last24h}`);
    console.log(`    Total points: ${results.summary.totalPoints}`);
    if (results.summary.topStory) {
      console.log(`    Top story: "${results.summary.topStory.title}" (${results.summary.topStory.points} pts)`);
    }

    console.log(`\n  Company mentions (72h):`);
    for (const [company, data] of Object.entries(results.byCompany)) {
      console.log(`    ${company}: ${data.mentions} mentions, ${data.totalPoints} total pts`);
    }

    // Write output
    const outDir = path.join(__dirname, '../data');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const outPath = path.join(outDir, 'hn-ai-mentions.json');
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

    console.log(`\n  📁 Written to: ${outPath}`);
    console.log(`  ⏰ Generated: ${results.generatedAt}`);

  } catch (err) {
    console.error(`\n  ✗ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
