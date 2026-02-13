#!/usr/bin/env node
/**
 * Release Tracker for kell.cx
 * Fetches recent releases from AI coding tool repos
 * 
 * Usage: node collect-releases.js [--output path]
 */

const https = require('https');
const fs = require('fs');

// Repos to track releases for
const REPOS = [
  { repo: 'anthropics/claude-code', name: 'Claude Code' },
  { repo: 'cline/cline', name: 'Cline' },
  { repo: 'Aider-AI/aider', name: 'Aider' },
  { repo: 'TabbyML/tabby', name: 'Tabby' },
  { repo: 'continuedev/continue', name: 'Continue' },
  { repo: 'block/goose', name: 'Goose' },
  { repo: 'voideditor/void', name: 'Void' },
  { repo: 'plandex-ai/plandex', name: 'Plandex' },
  { repo: 'OpenHands/OpenHands', name: 'OpenHands' },
  { repo: 'sourcegraph/cody', name: 'Cody' },
];

function fetchReleases(owner, repo) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/releases?per_page=5`,
      headers: {
        'User-Agent': 'kell-cx-release-tracker',
        'Accept': 'application/vnd.github.v3+json',
      }
    };

    if (process.env.GITHUB_TOKEN) {
      options.headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else if (res.statusCode === 404) {
          resolve([]);
        } else {
          reject(new Error(`GitHub API returned ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

function formatRelativeTime(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const hoursAgo = (now - date) / (1000 * 60 * 60);
  
  if (hoursAgo < 1) return 'Just now';
  if (hoursAgo < 24) return `${Math.floor(hoursAgo)}h ago`;
  if (hoursAgo < 24 * 7) return `${Math.floor(hoursAgo / 24)}d ago`;
  if (hoursAgo < 24 * 30) return `${Math.floor(hoursAgo / (24 * 7))}w ago`;
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function extractHighlights(body) {
  if (!body) return [];
  
  // Extract bullet points or key changes
  const lines = body.split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('- ') || l.startsWith('* ') || l.startsWith('• '))
    .map(l => l.replace(/^[-*•]\s*/, '').trim())
    .filter(l => l.length > 10 && l.length < 200)
    .slice(0, 5);
  
  return lines;
}

async function collectReleases() {
  const results = [];
  const allReleases = [];
  
  console.error(`Fetching releases for ${REPOS.length} repositories...`);
  
  for (const { repo, name } of REPOS) {
    const [owner, repoName] = repo.split('/');
    try {
      const releases = await fetchReleases(owner, repoName);
      
      if (releases && releases.length > 0) {
        const latestRelease = releases[0];
        const result = {
          name,
          repo,
          latestVersion: latestRelease.tag_name,
          publishedAt: latestRelease.published_at,
          relativeTime: formatRelativeTime(latestRelease.published_at),
          url: latestRelease.html_url,
          highlights: extractHighlights(latestRelease.body),
          isPrerelease: latestRelease.prerelease,
        };
        results.push(result);
        
        // Add all releases to the master list
        releases.forEach(r => {
          allReleases.push({
            tool: name,
            repo,
            version: r.tag_name,
            publishedAt: r.published_at,
            relativeTime: formatRelativeTime(r.published_at),
            url: r.html_url,
            isPrerelease: r.prerelease,
          });
        });
        
        console.error(`  ✓ ${name}: ${latestRelease.tag_name} (${formatRelativeTime(latestRelease.published_at)})`);
      } else {
        console.error(`  ✗ ${name}: No releases found`);
      }
    } catch (e) {
      console.error(`  ✗ ${name}: ${e.message}`);
    }
  }
  
  // Sort all releases by date
  allReleases.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  
  // Filter to last 7 days for "recent" section
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentReleases = allReleases.filter(r => new Date(r.publishedAt) > oneWeekAgo);
  
  const output = {
    generatedAt: new Date().toISOString(),
    toolCount: results.length,
    latestByTool: results,
    recentReleases: recentReleases,
    allReleases: allReleases.slice(0, 50),
    summary: {
      releasedThisWeek: recentReleases.length,
      mostRecent: results.length > 0 ? results.sort((a, b) => 
        new Date(b.publishedAt) - new Date(a.publishedAt)
      )[0].name : null,
    }
  };
  
  console.log(JSON.stringify(output, null, 2));
  console.error(`\n✓ Tracked ${results.length} tools, ${recentReleases.length} releases this week`);
}

collectReleases().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
