#!/usr/bin/env node
/**
 * Fetch GitHub releases for AI coding tools and generate releases.json
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TOOLS = [
  { repo: 'anthropics/claude-code', name: 'Claude Code' },
  { repo: 'cline/cline', name: 'Cline' },
  { repo: 'Aider-AI/aider', name: 'Aider' },
  { repo: 'continuedev/continue', name: 'Continue' },
  { repo: 'TabbyML/tabby', name: 'Tabby' },
  { repo: 'sourcegraph/cody', name: 'Cody' },
  { repo: 'CodiumAI/pr-agent', name: 'PR-Agent' },
  { repo: 'zed-industries/zed', name: 'Zed' },
  { repo: 'qodo-ai/qodo-cover', name: 'Qodo Cover' },
];

function getRelativeTime(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffHours < 1) return 'just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 14) return '1w ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function extractHighlights(body) {
  if (!body) return [];
  // Extract bullet points or first few lines
  const lines = body.split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('- ') || l.startsWith('* '))
    .map(l => l.replace(/^[-*]\s*/, ''))
    .slice(0, 5);
  return lines;
}

function fetchReleases(repo) {
  try {
    const cmd = `~/bin/gh api "repos/${repo}/releases?per_page=10" 2>/dev/null`;
    const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    return JSON.parse(output);
  } catch (e) {
    console.error(`Failed to fetch ${repo}:`, e.message);
    return [];
  }
}

async function main() {
  const allReleases = [];
  const latestByTool = [];
  
  for (const tool of TOOLS) {
    console.log(`Fetching ${tool.name}...`);
    const releases = fetchReleases(tool.repo);
    
    if (releases.length > 0) {
      // Add to latest by tool
      const latest = releases[0];
      latestByTool.push({
        name: tool.name,
        repo: tool.repo,
        latestVersion: latest.tag_name,
        publishedAt: latest.published_at,
        relativeTime: getRelativeTime(latest.published_at),
        url: latest.html_url,
        highlights: extractHighlights(latest.body),
        isPrerelease: latest.prerelease
      });
      
      // Add all to allReleases
      for (const rel of releases) {
        allReleases.push({
          tool: tool.name,
          repo: tool.repo,
          version: rel.tag_name,
          publishedAt: rel.published_at,
          relativeTime: getRelativeTime(rel.published_at),
          url: rel.html_url,
          isPrerelease: rel.prerelease
        });
      }
    }
  }
  
  // Sort all releases by date
  allReleases.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  
  // Filter to this week
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentReleases = allReleases.filter(r => new Date(r.publishedAt) > oneWeekAgo);
  
  const data = {
    generatedAt: new Date().toISOString(),
    toolCount: latestByTool.length,
    latestByTool: latestByTool.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
    recentReleases,
    allReleases: allReleases.slice(0, 50),
    summary: {
      releasedThisWeek: recentReleases.length,
      mostRecent: recentReleases[0]?.tool || 'None'
    }
  };
  
  const outPath = path.join(__dirname, '../site/data/releases.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`\nWritten to ${outPath}`);
  console.log(`Tools: ${data.toolCount}, This week: ${data.summary.releasedThisWeek}`);
}

main();
