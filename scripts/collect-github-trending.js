#!/usr/bin/env node
/**
 * Collect GitHub Trending repositories
 * Focuses on AI/ML/coding tools trending repos
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'github-trending.json');

// Languages to check for AI-relevant repos
const LANGUAGES = ['python', 'typescript', 'rust', 'go', ''];
const SINCE = ['daily', 'weekly'];

// Keywords that indicate AI/coding tool relevance
const AI_KEYWORDS = [
  'ai', 'llm', 'gpt', 'claude', 'agent', 'copilot', 'coding', 'code',
  'ml', 'machine-learning', 'neural', 'transformer', 'model',
  'assistant', 'automation', 'developer', 'ide', 'editor'
];

function fetchTrending(language = '', since = 'daily') {
  return new Promise((resolve, reject) => {
    const langPath = language ? `/${language}` : '';
    const options = {
      hostname: 'api.gitterapp.com',
      path: `/repositories${langPath}?since=${since}`,
      headers: {
        'User-Agent': 'kell-cx-trending-collector',
        'Accept': 'application/json',
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          // Try alternative: scrape github directly via proxy
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

// Alternative: use GitHub search API for trending-like results
function searchRecentPopular() {
  return new Promise((resolve, reject) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const query = encodeURIComponent(`created:>${weekAgo} stars:>100 (AI OR LLM OR agent OR coding OR copilot)`);
    
    const options = {
      hostname: 'api.github.com',
      path: `/search/repositories?q=${query}&sort=stars&order=desc&per_page=50`,
      headers: {
        'User-Agent': 'kell-cx-trending-collector',
        'Accept': 'application/vnd.github.v3+json',
      }
    };

    if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) {
      options.headers['Authorization'] = `token ${process.env.GITHUB_TOKEN || process.env.GH_TOKEN}`;
    }

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.items || []);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

function isAIRelevant(repo) {
  const text = `${repo.name} ${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
  return AI_KEYWORDS.some(kw => text.includes(kw));
}

async function main() {
  console.error('Collecting GitHub trending/popular AI repos...');
  
  // Use GitHub search API for recent popular repos
  const repos = await searchRecentPopular();
  
  // Filter for AI relevance
  const aiRepos = repos.filter(isAIRelevant).map(repo => ({
    name: repo.full_name,
    url: repo.html_url,
    description: repo.description,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    language: repo.language,
    topics: repo.topics || [],
    createdAt: repo.created_at,
    pushedAt: repo.pushed_at,
  }));

  // Also fetch general trending if available
  let generalTrending = [];
  try {
    generalTrending = await fetchTrending('', 'daily');
    if (Array.isArray(generalTrending)) {
      generalTrending = generalTrending.filter(isAIRelevant).slice(0, 20);
    }
  } catch (e) {
    // Ignore errors from trending API
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'GitHub API',
    summary: {
      recentPopularCount: aiRepos.length,
      trendingCount: generalTrending.length,
      topLanguages: getTopLanguages(aiRepos),
    },
    recentPopular: aiRepos.slice(0, 30),
    trending: generalTrending,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.error(`\n✓ Found ${aiRepos.length} recent popular AI repos`);
  
  // Print top 5
  console.error('\nTop 5:');
  aiRepos.slice(0, 5).forEach((r, i) => {
    console.error(`  ${i + 1}. ${r.name} (⭐ ${r.stars}) - ${(r.description || '').slice(0, 50)}`);
  });
  
  console.log(JSON.stringify(output, null, 2));
}

function getTopLanguages(repos) {
  const counts = {};
  repos.forEach(r => {
    if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang, count]) => ({ language: lang, count }));
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
