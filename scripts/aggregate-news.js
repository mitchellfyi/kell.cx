#!/usr/bin/env node
/**
 * News Aggregator
 * 
 * Combines data from all scrapers into a unified, sorted news feed.
 * This creates a single source of truth for the "Latest" section on kell.cx.
 * 
 * Sources:
 * - ai-rss.json (RSS feeds)
 * - hn-ai.json (Hacker News)
 * - github-releases.json (GitHub releases)
 * - company-announcements.json (company blogs)
 * - deepmind-news.json (DeepMind official blog)
 * - mistral-news.json (Mistral AI official blog)
 * 
 * Output: data/latest-news.json
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'latest-news.json');

// Priority scores for different sources (higher = more important)
const SOURCE_PRIORITY = {
  'github-releases': 10,     // Product updates are highly relevant
  'company-announcements': 9,
  'deepmind-blog': 9,        // DeepMind official blog
  'mistral-blog': 9,         // Mistral AI official blog
  'google-ai-blog': 9,       // Google AI official blog (Gemini, etc)
  'techcrunch-ai': 9,        // TechCrunch AI coverage (funding, launches)
  'rss-anthropic': 9,
  'rss-openai': 9,
  'rss-google-ai': 8,
  'rss-huggingface': 8,
  'producthunt-ai': 8,       // New AI product launches
  'devto-ai': 7,             // Dev.to AI tutorials and articles
  'rss-simon-willison': 7,
  'rss-mit-tech-review': 6,
  'rss-deeplearning-ai': 6,
  'hackernews': 5,
  'default': 3
};

// Keywords that boost importance
const BOOST_KEYWORDS = [
  { pattern: /\bclaude\b/i, boost: 5 },
  { pattern: /\bgpt-?[45o]/i, boost: 5 },
  { pattern: /\bgemini\b/i, boost: 4 },
  { pattern: /\bllama\b/i, boost: 4 },
  { pattern: /\bmistral\b/i, boost: 4 },
  { pattern: /\brelease\b/i, boost: 3 },
  { pattern: /\bannounce/i, boost: 3 },
  { pattern: /\bbenchmark\b/i, boost: 3 },
  { pattern: /\bcoding\b/i, boost: 2 },
  { pattern: /\bagent/i, boost: 2 },
  { pattern: /\bcursor\b/i, boost: 2 },
  { pattern: /\bcopilot\b/i, boost: 2 },
  { pattern: /\baider\b/i, boost: 2 }
];

function loadJsonSafe(filepath) {
  try {
    if (!fs.existsSync(filepath)) {
      console.log(`  [skip] ${path.basename(filepath)} not found`);
      return null;
    }
    const content = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`  [error] ${path.basename(filepath)}: ${error.message}`);
    return null;
  }
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function getSourcePriority(source) {
  return SOURCE_PRIORITY[source] || SOURCE_PRIORITY.default;
}

function calculateBoost(title, description = '') {
  const text = `${title} ${description}`;
  let boost = 0;
  
  for (const { pattern, boost: b } of BOOST_KEYWORDS) {
    if (pattern.test(text)) {
      boost += b;
    }
  }
  
  return boost;
}

function normalizeItem(item, source) {
  const title = item.title || item.name || 'Untitled';
  const url = item.url || item.link || item.html_url;
  const date = parseDate(item.date || item.published_at || item.created_at || item.pubDate);
  const description = item.description || item.body || item.summary || '';
  
  return {
    title: title.trim(),
    url,
    date: date ? date.toISOString() : null,
    description: description.slice(0, 300),
    source,
    sourcePriority: getSourcePriority(source),
    boost: calculateBoost(title, description)
  };
}

function loadRssData() {
  const items = [];
  const data = loadJsonSafe(path.join(DATA_DIR, 'ai-rss-news.json'));
  
  if (data?.items) {
    for (const item of data.items) {
      const sourceName = `rss-${item.source?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`;
      items.push(normalizeItem({
        title: item.title,
        url: item.url,
        date: item.date,
        description: item.description
      }, sourceName));
    }
  }
  
  return items;
}

function loadHackerNewsData() {
  const items = [];
  const data = loadJsonSafe(path.join(DATA_DIR, 'hn-ai-mentions.json'));
  
  if (data?.stories) {
    for (const story of data.stories) {
      items.push(normalizeItem({
        title: story.title,
        url: story.url || story.hnUrl,
        date: story.createdAt,
        description: `${story.points} points, ${story.comments} comments on HN`
      }, 'hackernews'));
    }
  }
  
  return items;
}

function loadGitHubReleases() {
  const items = [];
  const data = loadJsonSafe(path.join(DATA_DIR, 'github-releases.json'));
  
  if (data?.recentReleases) {
    for (const release of data.recentReleases) {
      items.push(normalizeItem({
        title: `${release.company || release.repo}: ${release.name || release.tag}`,
        url: release.url,
        date: release.publishedAt,
        description: release.body?.slice(0, 200)
      }, 'github-releases'));
    }
  }
  
  return items;
}

function loadCompanyAnnouncements() {
  const items = [];
  const data = loadJsonSafe(path.join(DATA_DIR, 'company-announcements.json'));
  
  if (data?.companies) {
    for (const company of data.companies) {
      const companyName = company.company?.toLowerCase().replace(/\s+/g, '-') || 'unknown';
      for (const post of (company.posts || [])) {
        items.push(normalizeItem({
          title: `${company.company}: ${post.title}`,
          url: post.link,
          date: post.date,
          description: post.description
        }, `company-${companyName}`));
      }
    }
  }
  
  return items;
}

function loadProductHuntData() {
  const items = [];
  const data = loadJsonSafe(path.join(DATA_DIR, 'producthunt-ai.json'));
  
  if (data?.ai_products) {
    for (const product of data.ai_products) {
      items.push(normalizeItem({
        title: `🚀 ${product.title}`,
        url: product.link,
        date: product.published,
        description: product.description
      }, 'producthunt-ai'));
    }
  }
  
  return items;
}

function loadDevtoData() {
  const items = [];
  const data = loadJsonSafe(path.join(DATA_DIR, 'devto-ai.json'));
  
  if (data?.relevant_articles) {
    for (const article of data.relevant_articles) {
      items.push(normalizeItem({
        title: `📝 ${article.title}`,
        url: article.url,
        date: article.published_at,
        description: article.description || `${article.reactions}❤ ${article.comments}💬 - ${article.category}`
      }, 'devto-ai'));
    }
  }
  
  return items;
}

function loadDeepMindData() {
  const items = [];
  const data = loadJsonSafe(path.join(DATA_DIR, 'deepmind-news.json'));
  
  if (data?.items) {
    for (const item of data.items) {
      items.push(normalizeItem({
        title: `🧠 DeepMind: ${item.title}`,
        url: item.url,
        date: item.date,
        description: item.description
      }, 'deepmind-blog'));
    }
  }
  
  return items;
}

function loadMistralData() {
  const items = [];
  const data = loadJsonSafe(path.join(DATA_DIR, 'mistral-news.json'));
  
  if (data?.items) {
    for (const item of data.items) {
      items.push(normalizeItem({
        title: `🌀 Mistral: ${item.title}`,
        url: item.url,
        date: item.date,
        description: item.description
      }, 'mistral-blog'));
    }
  }
  
  return items;
}

function loadGoogleAIData() {
  const items = [];
  const data = loadJsonSafe(path.join(DATA_DIR, 'google-ai-blog.json'));
  
  if (data?.items) {
    for (const item of data.items) {
      items.push(normalizeItem({
        title: `🔷 Google AI: ${item.title}`,
        url: item.url,
        date: item.date,
        description: item.description
      }, 'google-ai-blog'));
    }
  }
  
  return items;
}

function loadTechCrunchData() {
  const items = [];
  const data = loadJsonSafe(path.join(DATA_DIR, 'techcrunch-ai.json'));
  
  if (data?.articles) {
    for (const article of data.articles) {
      items.push(normalizeItem({
        title: `📰 TC: ${article.title}`,
        url: article.url,
        date: article.date,
        description: article.description
      }, 'techcrunch-ai'));
    }
  }
  
  return items;
}

function main() {
  console.log('News Aggregator starting...\n');
  
  // Load from all sources
  console.log('Loading data sources:');
  const allItems = [
    ...loadRssData(),
    ...loadHackerNewsData(),
    ...loadGitHubReleases(),
    ...loadCompanyAnnouncements(),
    ...loadProductHuntData(),
    ...loadDevtoData(),
    ...loadDeepMindData(),
    ...loadMistralData(),
    ...loadGoogleAIData(),
    ...loadTechCrunchData()
  ];
  
  console.log(`\nTotal items loaded: ${allItems.length}`);
  
  // Filter out items without URLs or titles
  const valid = allItems.filter(item => item.url && item.title);
  console.log(`Valid items: ${valid.length}`);
  
  // Deduplicate by URL
  const seen = new Set();
  const unique = valid.filter(item => {
    const key = item.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`After dedup: ${unique.length}`);
  
  // Calculate final score: recency + priority + boost
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  
  const scored = unique.map(item => {
    let recencyScore = 0;
    if (item.date) {
      const age = now - new Date(item.date).getTime();
      // Newer items get higher score (max 20 for items < 1 hour old)
      recencyScore = Math.max(0, 20 - (age / ONE_DAY) * 5);
    }
    
    const finalScore = recencyScore + item.sourcePriority + item.boost;
    
    return {
      ...item,
      score: Math.round(finalScore * 10) / 10
    };
  });
  
  // Sort by score descending
  const sorted = scored.sort((a, b) => b.score - a.score);
  
  // Separate into recent (last 48h) and older
  const cutoff = now - (48 * 60 * 60 * 1000);
  const recent = sorted.filter(i => i.date && new Date(i.date).getTime() > cutoff).slice(0, 30);
  const older = sorted.filter(i => !i.date || new Date(i.date).getTime() <= cutoff).slice(0, 20);
  
  const output = {
    generated_at: new Date().toISOString(),
    stats: {
      total_sources: 8,
      total_items: sorted.length,
      recent_count: recent.length,
      older_count: older.length
    },
    recent: recent.map(({ title, url, date, description, source, score }) => ({
      title, url, date, description, source, score
    })),
    older: older.map(({ title, url, date, description, source, score }) => ({
      title, url, date, description, source, score
    }))
  };
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nWrote to ${OUTPUT_FILE}`);
  
  // Print top items
  console.log('\n=== Top 10 Recent News ===');
  recent.slice(0, 10).forEach((item, i) => {
    const dateStr = item.date ? new Date(item.date).toLocaleDateString() : 'no date';
    console.log(`${i + 1}. [${item.score}] ${item.title.slice(0, 55)}...`);
    console.log(`   ${item.source} | ${dateStr}`);
  });
}

main();
