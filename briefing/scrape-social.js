#!/usr/bin/env node
/**
 * Social/News Monitoring
 * - Hacker News: Recent mentions/submissions
 * - GitHub: Repository activity (stars, releases)
 * - Reddit: Discussions from tech subreddits
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// Subreddits to search for AI coding tool discussions
const REDDIT_SUBS = ['programming', 'MachineLearning', 'LocalLLaMA', 'artificial', 'coding', 'vscode'];

// Competitor GitHub repos and HN search terms
const TARGETS = {
  cursor: {
    name: 'Cursor',
    hn: ['cursor.sh', 'cursor ai', 'cursor editor'],
    reddit: ['cursor ai', 'cursor editor'],
    github: null // Closed source
  },
  cognition: {
    name: 'Devin',
    hn: ['devin ai', 'cognition.ai', 'cognition ai'],
    reddit: ['devin ai', 'cognition ai'],
    github: null
  },
  replit: {
    name: 'Replit',
    hn: ['replit', 'repl.it'],
    reddit: ['replit ai', 'replit agent'],
    github: 'replit/replit-desktop'
  },
  windsurf: {
    name: 'Windsurf',
    hn: ['windsurf', 'codeium'],
    reddit: ['windsurf', 'codeium'],
    github: 'Exafunction/codeium.vim'
  },
  copilot: {
    name: 'GitHub Copilot',
    hn: ['github copilot'],
    reddit: ['github copilot', 'copilot workspace'],
    github: null // Closed source
  },
  tabnine: {
    name: 'Tabnine',
    hn: ['tabnine'],
    reddit: ['tabnine'],
    github: 'codota/tabnine-vscode'
  },
  amazonq: {
    name: 'Amazon Q',
    hn: ['amazon q developer', 'aws q'],
    reddit: ['amazon q developer'],
    github: null
  },
  cody: {
    name: 'Sourcegraph Cody',
    hn: ['sourcegraph cody', 'sourcegraph ai'],
    reddit: ['sourcegraph cody', 'cody ai'],
    github: 'sourcegraph/cody'
  },
  continue: {
    name: 'Continue',
    hn: ['continue.dev', 'continuedev'],
    reddit: ['continue.dev', 'continuedev'],
    github: 'continuedev/continue'
  },
  supermaven: {
    name: 'Supermaven',
    hn: ['supermaven'],
    reddit: ['supermaven'],
    github: null // Closed source
  },
  augment: {
    name: 'Augment Code',
    hn: ['augment code', 'augmentcode'],
    reddit: ['augment code', 'augmentcode'],
    github: null // Closed source
  }
};

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Briefing/1.0' },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// Check if a title is actually relevant to the competitor (not just a tangential mention)
function isRelevantTitle(title, queries, companyName) {
  const titleLower = title.toLowerCase();
  
  // Must contain the company name or one of the search terms in the title
  const hasDirectMention = queries.some(q => titleLower.includes(q.toLowerCase())) 
    || titleLower.includes(companyName.toLowerCase());
  
  if (!hasDirectMention) return false;
  
  // Filter out obvious false positives (generic terms that appear in company names)
  const falsePositives = [
    'continue reading', 'to continue', 'will continue', 'continues to',
    'the cursor', 'mouse cursor', 'cursor position',
    'a devin', 'by devin' // Person's name vs the AI
  ];
  
  for (const fp of falsePositives) {
    if (titleLower.includes(fp)) return false;
  }
  
  return true;
}

async function searchHN(query, companyName, allQueries) {
  // Use HN Algolia API - last 7 days
  const weekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&numericFilters=created_at_i>${weekAgo}&hitsPerPage=10`;
  
  try {
    const json = await fetch(url);
    const data = JSON.parse(json);
    // Filter for relevance - title must mention the company
    return (data.hits || []).filter(hit => 
      isRelevantTitle(hit.title, allQueries || [query], companyName || query)
    );
  } catch (e) {
    return [];
  }
}

async function searchReddit(query) {
  // Reddit JSON API - search across tech subreddits, last 7 days
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=top&t=week&limit=5`;
  
  try {
    const json = await fetch(url);
    const data = JSON.parse(json);
    if (!data.data || !data.data.children) return [];
    
    return data.data.children
      .filter(post => {
        const sub = post.data.subreddit.toLowerCase();
        return REDDIT_SUBS.some(s => sub === s.toLowerCase());
      })
      .map(post => ({
        title: post.data.title,
        score: post.data.score,
        comments: post.data.num_comments,
        subreddit: post.data.subreddit,
        url: `https://reddit.com${post.data.permalink}`,
        date: new Date(post.data.created_utc * 1000).toISOString()
      }));
  } catch (e) {
    return [];
  }
}

async function getGitHubStats(repo) {
  // Get basic repo stats
  const url = `https://api.github.com/repos/${repo}`;
  
  try {
    const json = await fetch(url);
    const data = JSON.parse(json);
    return {
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      updatedAt: data.updated_at,
      pushedAt: data.pushed_at
    };
  } catch (e) {
    return null;
  }
}

async function getGitHubReleases(repo) {
  const url = `https://api.github.com/repos/${repo}/releases?per_page=3`;
  
  try {
    const json = await fetch(url);
    const releases = JSON.parse(json);
    return releases.map(r => ({
      tag: r.tag_name,
      name: r.name,
      date: r.published_at
    }));
  } catch (e) {
    return [];
  }
}

async function scrapeAllSocial() {
  const results = {};
  
  for (const [slug, target] of Object.entries(TARGETS)) {
    console.log(`  → ${target.name}`);
    const data = {
      name: target.name,
      scrapedAt: new Date().toISOString(),
      signals: [],
      hnMentions: [],
      redditMentions: [],
      github: null
    };
    
    // Search HN for each query term
    const seenUrls = new Set();
    for (const query of target.hn) {
      const hits = await searchHN(query, target.name, target.hn);
      for (const hit of hits) {
        if (!seenUrls.has(hit.url || hit.objectID)) {
          seenUrls.add(hit.url || hit.objectID);
          data.hnMentions.push({
            title: hit.title,
            points: hit.points,
            comments: hit.num_comments,
            url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
            date: hit.created_at
          });
        }
      }
    }
    
    // Sort by points
    data.hnMentions.sort((a, b) => b.points - a.points);
    data.hnMentions = data.hnMentions.slice(0, 5);
    
    // Search Reddit for each query term
    const seenRedditUrls = new Set();
    for (const query of (target.reddit || [])) {
      const posts = await searchReddit(query);
      for (const post of posts) {
        if (!seenRedditUrls.has(post.url)) {
          seenRedditUrls.add(post.url);
          data.redditMentions.push(post);
        }
      }
      await new Promise(r => setTimeout(r, 1000)); // Reddit rate limit
    }
    
    // Sort by score
    data.redditMentions.sort((a, b) => b.score - a.score);
    data.redditMentions = data.redditMentions.slice(0, 5);
    
    // Generate signals from HN
    if (data.hnMentions.length > 0) {
      const topPost = data.hnMentions[0];
      if (topPost.points >= 100) {
        data.signals.push(`🔥 Trending on HN: "${topPost.title}" (${topPost.points} pts, ${topPost.comments} comments)`);
      } else if (topPost.points >= 20) {
        data.signals.push(`📰 HN mention: "${topPost.title}" (${topPost.points} pts)`);
      }
    }
    
    // Generate signals from Reddit
    if (data.redditMentions.length > 0) {
      const topPost = data.redditMentions[0];
      if (topPost.score >= 100) {
        data.signals.push(`🔥 Trending on Reddit: "${topPost.title}" (${topPost.score} pts, r/${topPost.subreddit})`);
      } else if (topPost.score >= 20) {
        data.signals.push(`💬 Reddit buzz: "${topPost.title}" (${topPost.score} pts, r/${topPost.subreddit})`);
      }
    }
    
    // Get GitHub stats if available
    if (target.github) {
      const stats = await getGitHubStats(target.github);
      const releases = await getGitHubReleases(target.github);
      
      if (stats) {
        data.github = { ...stats, releases };
        
        // Check for recent release (last 7 days)
        if (releases.length > 0) {
          const latestRelease = new Date(releases[0].date);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          if (latestRelease > weekAgo) {
            data.signals.push(`🚀 New release: ${releases[0].tag} (${releases[0].name || 'no name'})`);
          }
        }
        
        // Check for recent activity (pushed in last 24h)
        const pushedAt = new Date(stats.pushedAt);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (pushedAt > dayAgo) {
          data.signals.push(`⚡ Active development (pushed ${formatRelativeTime(pushedAt)})`);
        }
      }
    }
    
    results[slug] = data;
    
    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }
  
  return results;
}

function formatRelativeTime(date) {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Export for use in daily-briefing.js
module.exports = { scrapeAllSocial, TARGETS };

// Run standalone
if (require.main === module) {
  console.log('📡 Scanning social/news sources...\n');
  scrapeAllSocial()
    .then(results => {
      console.log('\n📊 Results:\n');
      for (const [slug, data] of Object.entries(results)) {
        console.log(`${data.name}:`);
        if (data.signals.length > 0) {
          data.signals.forEach(s => console.log(`  ${s}`));
        }
        if (data.hnMentions.length > 0) {
          console.log(`  HN mentions: ${data.hnMentions.length}`);
        }
        if (data.redditMentions.length > 0) {
          console.log(`  Reddit mentions: ${data.redditMentions.length}`);
        }
        if (data.github) {
          console.log(`  GitHub: ${data.github.stars} stars`);
        }
        console.log('');
      }
    })
    .catch(console.error);
}
