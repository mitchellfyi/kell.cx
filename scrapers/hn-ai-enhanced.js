#!/usr/bin/env node
/**
 * Enhanced Hacker News AI Mentions Scraper with Summarization
 * Tracks AI-related discussions with AI-powered summaries and sentiment analysis
 */

const fs = require('fs');
const path = require('path');
const { analyzeHNStory, calculateSentimentTrends } = require('../briefing/services/ai-content-analyzer.js');

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

// File paths for data storage
const DATA_DIR = path.join(__dirname, '../data');
const SUMMARIES_FILE = path.join(DATA_DIR, 'hn-summaries.json');
const SENTIMENT_HISTORY_FILE = path.join(DATA_DIR, 'hn-sentiment-history.json');

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

async function getComments(storyId, limit = 10) {
  try {
    const story = await getStory(storyId);
    if (!story || !story.kids || story.kids.length === 0) return [];

    const comments = [];
    const commentsToFetch = story.kids.slice(0, limit);

    for (const commentId of commentsToFetch) {
      const comment = await getStory(commentId);
      if (comment && comment.text) {
        comments.push({
          id: comment.id,
          author: comment.by,
          text: comment.text.replace(/<[^>]+>/g, ''), // Strip HTML
          score: comment.score || 0
        });
      }
      await new Promise(r => setTimeout(r, 100)); // Rate limit
    }

    return comments;
  } catch (error) {
    console.error(`Failed to fetch comments for story ${storyId}:`, error);
    return [];
  }
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

async function loadExistingSummaries() {
  try {
    if (fs.existsSync(SUMMARIES_FILE)) {
      const data = fs.readFileSync(SUMMARIES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load existing summaries:', error);
  }
  return {};
}

async function loadSentimentHistory() {
  try {
    if (fs.existsSync(SENTIMENT_HISTORY_FILE)) {
      const data = fs.readFileSync(SENTIMENT_HISTORY_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load sentiment history:', error);
  }
  return [];
}

async function saveSentimentHistory(history) {
  try {
    fs.writeFileSync(SENTIMENT_HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('Failed to save sentiment history:', error);
  }
}

async function main() {
  console.log('🔍 Fetching Hacker News AI Mentions with Summaries...\n');

  try {
    const results = {
      generatedAt: new Date().toISOString(),
      source: 'Hacker News (Algolia API)',
      timeRange: '24 hours',
      stories: [],
      summaries: {},
      sentimentAnalysis: {},
      byCompany: {},
      trending: [],
    };

    // Load existing summaries to avoid re-analyzing
    const existingSummaries = await loadExistingSummaries();
    const sentimentHistory = await loadSentimentHistory();

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
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`    Found ${aiInTop} AI stories in top 50`);

    // Convert to array and sort by points
    results.stories = Array.from(allStories.values())
      .sort((a, b) => b.points - a.points);

    // 3. Analyze stories with high engagement (>50 points)
    console.log('\n  Analyzing high-engagement stories...');
    const storiesToAnalyze = results.stories.filter(s => s.points >= 50);
    let analyzedCount = 0;

    for (const story of storiesToAnalyze) {
      // Check if we already have a summary for this story
      if (existingSummaries[story.id]) {
        results.summaries[story.id] = existingSummaries[story.id];
        console.log(`    Using cached summary for "${story.title}"`);
        continue;
      }

      // Fetch comments for context
      let discussionContent = null;
      if (story.comments > 5) {
        const comments = await getComments(story.id);
        if (comments.length > 0) {
          discussionContent = comments
            .map(c => `${c.author}: ${c.text}`)
            .join('\n\n')
            .slice(0, 2000);
        }
      }

      // Analyze the story
      const analysis = await analyzeHNStory(story, discussionContent);
      if (analysis) {
        results.summaries[story.id] = analysis;
        analyzedCount++;
        console.log(`    Analyzed: "${story.title}" - Sentiment: ${analysis.sentiment}`);
      }

      // Rate limiting to avoid API limits
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`    Analyzed ${analyzedCount} new stories`);

    // 4. Calculate sentiment trends
    const allAnalyses = Object.values(results.summaries);
    if (allAnalyses.length > 0) {
      // Add today's analyses to history
      const todayAnalyses = allAnalyses.map(a => ({
        ...a,
        date: new Date().toISOString().split('T')[0]
      }));

      const updatedHistory = [...sentimentHistory, ...todayAnalyses]
        .filter(a => {
          // Keep only last 30 days
          const date = new Date(a.analyzedAt || a.date);
          return date > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        });

      results.sentimentAnalysis = {
        current: calculateSentimentTrends(allAnalyses),
        historical: calculateSentimentTrends(updatedHistory)
      };

      // Save updated history
      await saveSentimentHistory(updatedHistory);
    }

    // 5. Track by company
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
      analyzedStories: Object.keys(results.summaries).length,
      sentimentOverview: results.sentimentAnalysis.current || null
    };

    console.log(`\n  Summary:`);
    console.log(`    Total AI stories: ${results.summary.totalStories}`);
    console.log(`    Last 24h: ${results.summary.last24h}`);
    console.log(`    Total points: ${results.summary.totalPoints}`);
    console.log(`    Stories analyzed: ${results.summary.analyzedStories}`);
    if (results.summary.topStory) {
      console.log(`    Top story: "${results.summary.topStory.title}" (${results.summary.topStory.points} pts)`);
    }
    if (results.summary.sentimentOverview) {
      console.log(`    Overall sentiment: ${results.summary.sentimentOverview.trend} (avg: ${results.summary.sentimentOverview.average.toFixed(2)})`);
    }

    // Write outputs
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Main results
    const outPath = path.join(DATA_DIR, 'hn-ai-mentions.json');
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

    // Save summaries separately for caching
    const allSummaries = { ...existingSummaries, ...results.summaries };
    fs.writeFileSync(SUMMARIES_FILE, JSON.stringify(allSummaries, null, 2));

    console.log(`\n  📁 Written to: ${outPath}`);
    console.log(`  📊 Summaries saved to: ${SUMMARIES_FILE}`);
    console.log(`  📈 Sentiment history updated`);
    console.log(`  ⏰ Generated: ${results.generatedAt}`);

  } catch (err) {
    console.error(`\n  ✗ Error: ${err.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };