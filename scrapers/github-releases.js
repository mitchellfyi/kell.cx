#!/usr/bin/env node
/**
 * GitHub Releases Scraper
 * Monitors releases from key AI coding tool repositories
 * Uses GitHub API (unauthenticated, 60 req/hour limit)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'github-releases.json');

// Key AI coding tool repositories to monitor
const REPOS = [
  // Anthropic
  { owner: 'anthropics', repo: 'claude-code', category: 'cli', company: 'Anthropic' },
  { owner: 'anthropics', repo: 'anthropic-sdk-python', category: 'sdk', company: 'Anthropic' },
  { owner: 'anthropics', repo: 'anthropic-cookbook', category: 'docs', company: 'Anthropic' },
  
  // OpenAI
  { owner: 'openai', repo: 'openai-python', category: 'sdk', company: 'OpenAI' },
  { owner: 'openai', repo: 'tiktoken', category: 'tool', company: 'OpenAI' },
  
  // AI Coding Tools
  { owner: 'Aider-AI', repo: 'aider', category: 'cli', company: 'Aider' },
  { owner: 'continuedev', repo: 'continue', category: 'extension', company: 'Continue' },
  { owner: 'sourcegraph', repo: 'cody', category: 'assistant', company: 'Sourcegraph' },
  { owner: 'Exafunction', repo: 'codeium', category: 'extension', company: 'Codeium' },
  { owner: 'TabbyML', repo: 'tabby', category: 'self-hosted', company: 'Tabby' },
  
  // LLM Frameworks
  { owner: 'langchain-ai', repo: 'langchain', category: 'framework', company: 'LangChain' },
  { owner: 'run-llama', repo: 'llama_index', category: 'framework', company: 'LlamaIndex' },
  { owner: 'BerriAI', repo: 'litellm', category: 'proxy', company: 'LiteLLM' },
  
  // Open Source Models
  { owner: 'ollama', repo: 'ollama', category: 'local', company: 'Ollama' },
  { owner: 'ggerganov', repo: 'llama.cpp', category: 'inference', company: 'llama.cpp' },
  { owner: 'vllm-project', repo: 'vllm', category: 'inference', company: 'vLLM' },
  
  // Developer Tools
  { owner: 'microsoft', repo: 'vscode', category: 'ide', company: 'Microsoft' },
  { owner: 'JetBrains', repo: 'intellij-community', category: 'ide', company: 'JetBrains' },
];

async function fetchReleases(repoInfo) {
  const { owner, repo, category, company } = repoInfo;
  const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=5`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Briefing/1.0 (+https://kell.cx)',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    if (res.status === 404) {
      console.log(`  ${owner}/${repo}: Not found (may be private)`);
      return [];
    }
    
    if (res.status === 403) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      console.log(`  ${owner}/${repo}: Rate limited (${remaining} remaining)`);
      return [];
    }
    
    if (!res.ok) {
      console.log(`  ${owner}/${repo}: HTTP ${res.status}`);
      return [];
    }
    
    const releases = await res.json();
    
    if (!Array.isArray(releases) || releases.length === 0) {
      // Try tags instead (some repos don't use releases)
      return await fetchTags(repoInfo);
    }
    
    console.log(`  ${owner}/${repo}: ${releases.length} releases`);
    
    return releases.map(r => ({
      repo: `${owner}/${repo}`,
      company,
      category,
      name: r.name || r.tag_name,
      tag: r.tag_name,
      url: r.html_url,
      publishedAt: r.published_at,
      isPrerelease: r.prerelease,
      body: truncate(r.body, 300)
    }));
    
  } catch (err) {
    console.log(`  ${owner}/${repo}: ${err.message}`);
    return [];
  }
}

async function fetchTags(repoInfo) {
  const { owner, repo, category, company } = repoInfo;
  const url = `https://api.github.com/repos/${owner}/${repo}/tags?per_page=5`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Briefing/1.0 (+https://kell.cx)',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    if (!res.ok) return [];
    
    const tags = await res.json();
    if (!Array.isArray(tags)) return [];
    
    console.log(`  ${owner}/${repo}: ${tags.length} tags (no releases)`);
    
    return tags.map(t => ({
      repo: `${owner}/${repo}`,
      company,
      category,
      name: t.name,
      tag: t.name,
      url: `https://github.com/${owner}/${repo}/releases/tag/${t.name}`,
      publishedAt: null, // Tags don't have dates without extra API calls
      isPrerelease: false,
      body: null
    }));
    
  } catch (err) {
    return [];
  }
}

function truncate(str, maxLen) {
  if (!str) return null;
  str = str.replace(/\r\n/g, '\n').trim();
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}

async function main() {
  console.log('Fetching GitHub releases...\n');
  
  const allReleases = [];
  const repoStats = [];
  
  // Process repos sequentially to avoid rate limits
  for (const repoInfo of REPOS) {
    const releases = await fetchReleases(repoInfo);
    allReleases.push(...releases);
    
    if (releases.length > 0) {
      const latest = releases[0];
      repoStats.push({
        repo: `${repoInfo.owner}/${repoInfo.repo}`,
        company: repoInfo.company,
        category: repoInfo.category,
        latestRelease: latest.tag,
        latestDate: latest.publishedAt
      });
    }
    
    // Small delay to be nice to GitHub API
    await new Promise(r => setTimeout(r, 200));
  }
  
  // Sort all releases by date (most recent first)
  allReleases.sort((a, b) => {
    if (!a.publishedAt) return 1;
    if (!b.publishedAt) return -1;
    return new Date(b.publishedAt) - new Date(a.publishedAt);
  });
  
  // Filter to last 7 days for "recent" releases
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const recentReleases = allReleases.filter(r => {
    if (!r.publishedAt) return false;
    return new Date(r.publishedAt) > weekAgo;
  });
  
  const output = {
    generatedAt: now.toISOString(),
    source: 'GitHub API',
    reposTracked: REPOS.length,
    recentCount: recentReleases.length,
    totalReleasesFound: allReleases.length,
    recentReleases: recentReleases.slice(0, 20), // Last 20 recent
    allReleases: allReleases.slice(0, 50), // Last 50 overall
    repoStats: repoStats.sort((a, b) => {
      if (!a.latestDate) return 1;
      if (!b.latestDate) return -1;
      return new Date(b.latestDate) - new Date(a.latestDate);
    })
  };
  
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  
  console.log(`\n✓ Saved ${output.totalReleasesFound} releases to ${OUTPUT_FILE}`);
  console.log(`  Recent (7 days): ${output.recentCount}`);
  console.log(`  Repos tracked: ${output.reposTracked}`);
  
  // Show most recent releases
  if (recentReleases.length > 0) {
    console.log('\nRecent releases:');
    recentReleases.slice(0, 5).forEach(r => {
      const date = new Date(r.publishedAt).toLocaleDateString();
      console.log(`  ${r.repo} ${r.tag} (${date})`);
    });
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
