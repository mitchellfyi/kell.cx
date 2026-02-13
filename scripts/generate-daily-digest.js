#!/usr/bin/env node
/**
 * Daily Digest Generator
 * Synthesizes ALL data sources into an email-ready HTML digest
 * 
 * Sources: github-releases, company-announcements, ai-rss-news, hn-ai-mentions,
 *          arxiv-ai, reddit-ai, bluesky-ai, producthunt-ai, devto-ai, model-releases
 * 
 * Output: HTML email digest for daily send
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_DIR = path.join(__dirname, '..', 'site', 'digests');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function loadJson(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.error(`Failed to load ${filename}:`, e.message);
    return null;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isLast24Hours(dateStr) {
  if (!dateStr) return false;
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return new Date(dateStr) >= cutoff;
}

function isLast48Hours(dateStr) {
  if (!dateStr) return false;
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  return new Date(dateStr) >= cutoff;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
}

function truncate(str, len = 120) {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.slice(0, len).trim() + '...';
}

function generateDigest() {
  const sections = [];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Track total items for summary
  let totalItems = 0;

  // 1. Model Releases (highest priority - new models are big news)
  const modelReleases = loadJson('model-releases.json');
  if (modelReleases?.releases) {
    const recent = modelReleases.releases.filter(r => isLast48Hours(r.date || r.publishedAt));
    if (recent.length > 0) {
      totalItems += recent.length;
      let html = `<div class="section">
        <h2>🤖 New Model Releases</h2>`;
      recent.slice(0, 5).forEach(r => {
        html += `<div class="item">
          <a href="${escapeHtml(r.url || r.link || '#')}" class="title">${escapeHtml(r.name || r.title)}</a>
          <span class="meta">${escapeHtml(r.provider || r.source || '')} • ${formatDate(r.date || r.publishedAt)}</span>
          ${r.description ? `<p class="desc">${escapeHtml(truncate(r.description, 150))}</p>` : ''}
        </div>`;
      });
      html += `</div>`;
      sections.push({ priority: 1, html });
    }
  }

  // 2. GitHub Releases
  const releases = loadJson('github-releases.json');
  if (releases?.recentReleases) {
    const recent = releases.recentReleases.filter(r => isLast48Hours(r.publishedAt));
    // Dedupe by repo
    const seenRepos = new Set();
    const deduped = recent.filter(r => {
      if (seenRepos.has(r.repo)) return false;
      seenRepos.add(r.repo);
      return true;
    });
    
    if (deduped.length > 0) {
      totalItems += deduped.length;
      let html = `<div class="section">
        <h2>🚀 Tool Releases</h2>`;
      deduped.slice(0, 8).forEach(r => {
        html += `<div class="item">
          <a href="${escapeHtml(r.url)}" class="title">${escapeHtml(r.company || r.repo)} ${escapeHtml(r.tag)}</a>
          <span class="meta">${formatDate(r.publishedAt)}</span>
        </div>`;
      });
      html += `</div>`;
      sections.push({ priority: 2, html });
    }
  }

  // 3. Company Announcements
  const announcements = loadJson('company-announcements.json');
  if (announcements?.companies) {
    const recentPosts = [];
    announcements.companies.forEach(company => {
      if (company.posts) {
        company.posts.filter(p => isLast48Hours(p.date)).forEach(p => {
          recentPosts.push({ company: company.company, logo: company.logo, ...p });
        });
      }
    });
    
    if (recentPosts.length > 0) {
      totalItems += recentPosts.length;
      recentPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
      let html = `<div class="section">
        <h2>📢 Company Updates</h2>`;
      recentPosts.slice(0, 6).forEach(p => {
        html += `<div class="item">
          <a href="${escapeHtml(p.link)}" class="title">${p.logo} ${escapeHtml(p.company)}: ${escapeHtml(p.title)}</a>
          <span class="meta">${formatDate(p.date)}</span>
          ${p.description ? `<p class="desc">${escapeHtml(truncate(p.description))}</p>` : ''}
        </div>`;
      });
      html += `</div>`;
      sections.push({ priority: 3, html });
    }
  }

  // 4. arXiv AI Papers
  const arxiv = loadJson('arxiv-ai.json');
  if (arxiv?.papers || Array.isArray(arxiv)) {
    const papers = arxiv.papers || arxiv;
    const recent = papers.filter(p => isLast48Hours(p.published || p.date));
    // Filter for high-impact keywords
    const impactful = recent.filter(p => {
      const text = `${p.title || ''} ${p.summary || ''}`.toLowerCase();
      return text.includes('gpt') || text.includes('llm') || text.includes('transformer') ||
             text.includes('benchmark') || text.includes('agent') || text.includes('reasoning');
    });
    
    if (impactful.length > 0) {
      totalItems += Math.min(impactful.length, 4);
      let html = `<div class="section">
        <h2>📄 Notable Research</h2>`;
      impactful.slice(0, 4).forEach(p => {
        html += `<div class="item">
          <a href="${escapeHtml(p.link || p.url)}" class="title">${escapeHtml(p.title)}</a>
          <span class="meta">${formatDate(p.published || p.date)}</span>
          ${p.summary ? `<p class="desc">${escapeHtml(truncate(p.summary, 150))}</p>` : ''}
        </div>`;
      });
      html += `</div>`;
      sections.push({ priority: 4, html });
    }
  }

  // 5. Hacker News Discussions
  const hn = loadJson('hn-ai-mentions.json');
  if (hn?.stories && Array.isArray(hn.stories)) {
    const recent = hn.stories.filter(s => isLast48Hours(s.createdAt) && s.points >= 20);
    recent.sort((a, b) => (b.points || 0) - (a.points || 0));
    
    if (recent.length > 0) {
      totalItems += Math.min(recent.length, 6);
      let html = `<div class="section">
        <h2>💬 Hacker News</h2>`;
      recent.slice(0, 6).forEach(s => {
        html += `<div class="item">
          <a href="${escapeHtml(s.hnUrl || s.url)}" class="title">${escapeHtml(s.title)}</a>
          <span class="meta">${s.points} pts • ${s.comments || 0} comments</span>
        </div>`;
      });
      html += `</div>`;
      sections.push({ priority: 5, html });
    }
  }

  // 6. Reddit Discussions
  const reddit = loadJson('reddit-ai.json');
  if (reddit) {
    // Handle both relevant_posts and posts arrays
    const posts = reddit.relevant_posts || reddit.posts || reddit;
    if (Array.isArray(posts)) {
      // Handle created_utc (Unix timestamp) or ISO date strings
      const recent = posts.filter(p => {
        const ts = p.created_utc ? new Date(p.created_utc * 1000) : new Date(p.created || p.date);
        return isLast48Hours(ts.toISOString());
      });
      // Sort by score if available, otherwise by date
      recent.sort((a, b) => (b.score || b.ups || 0) - (a.score || a.ups || 0));
      
      if (recent.length > 0) {
        totalItems += Math.min(recent.length, 5);
        let html = `<div class="section">
          <h2>📱 Reddit Highlights</h2>`;
        recent.slice(0, 5).forEach(p => {
          const url = p.permalink?.startsWith('http') ? p.permalink : `https://reddit.com${p.permalink}`;
          const score = p.score || p.ups;
          const scoreText = score ? ` • ${score} pts` : '';
          html += `<div class="item">
            <a href="${escapeHtml(url)}" class="title">${escapeHtml(p.title)}</a>
            <span class="meta">r/${escapeHtml(p.subreddit || 'unknown')}${scoreText}</span>
          </div>`;
        });
        html += `</div>`;
        sections.push({ priority: 6, html });
      }
    }
  }

  // 7. Product Hunt
  const ph = loadJson('producthunt-ai.json');
  if (ph?.products || Array.isArray(ph)) {
    const products = ph.products || ph;
    const recent = products.filter(p => isLast48Hours(p.launchDate || p.date));
    recent.sort((a, b) => (b.votes || b.votesCount || 0) - (a.votes || a.votesCount || 0));
    
    if (recent.length > 0) {
      totalItems += Math.min(recent.length, 4);
      let html = `<div class="section">
        <h2>🚀 Product Hunt Launches</h2>`;
      recent.slice(0, 4).forEach(p => {
        html += `<div class="item">
          <a href="${escapeHtml(p.url || p.link)}" class="title">${escapeHtml(p.name || p.title)}</a>
          <span class="meta">${p.votes || p.votesCount || 0} upvotes • ${escapeHtml(p.tagline || '')}</span>
        </div>`;
      });
      html += `</div>`;
      sections.push({ priority: 7, html });
    }
  }

  // 8. Dev.to Articles
  const devto = loadJson('devto-ai.json');
  if (devto?.articles || Array.isArray(devto)) {
    const articles = devto.articles || devto;
    const recent = articles.filter(a => isLast48Hours(a.published || a.publishedAt || a.date));
    recent.sort((a, b) => (b.reactions || b.positive_reactions_count || 0) - (a.reactions || a.positive_reactions_count || 0));
    
    if (recent.length > 0) {
      totalItems += Math.min(recent.length, 4);
      let html = `<div class="section">
        <h2>✍️ Developer Articles</h2>`;
      recent.slice(0, 4).forEach(a => {
        html += `<div class="item">
          <a href="${escapeHtml(a.url || a.link)}" class="title">${escapeHtml(a.title)}</a>
          <span class="meta">${a.reactions || a.positive_reactions_count || 0} reactions • ${escapeHtml(a.author || a.user?.name || '')}</span>
        </div>`;
      });
      html += `</div>`;
      sections.push({ priority: 8, html });
    }
  }

  // 9. Bluesky mentions
  const bluesky = loadJson('bluesky-ai.json');
  if (bluesky) {
    // Handle both high_engagement_posts and posts arrays
    const posts = bluesky.high_engagement_posts || bluesky.posts || bluesky;
    if (Array.isArray(posts)) {
      const recent = posts.filter(p => isLast24Hours(p.createdAt || p.date));
      recent.sort((a, b) => (b.likeCount || b.likes || 0) - (a.likeCount || a.likes || 0));
      
      if (recent.length > 0) {
        totalItems += Math.min(recent.length, 4);
        let html = `<div class="section">
          <h2>🦋 Bluesky Buzz</h2>`;
        recent.slice(0, 4).forEach(p => {
          const text = truncate(p.text || p.content || '', 150);
          const authorName = p.author?.displayName || p.author?.handle || p.author || p.handle || 'Unknown';
          html += `<div class="item">
            <a href="${escapeHtml(p.url || p.uri || '#')}" class="title">${escapeHtml(authorName)}</a>
            <p class="desc">${escapeHtml(text)}</p>
            <span class="meta">${p.likeCount || p.likes || 0} likes • ${p.repostCount || p.reposts || 0} reposts</span>
          </div>`;
        });
        html += `</div>`;
        sections.push({ priority: 9, html });
      }
    }
  }

  // 10. TechCrunch AI News
  const techcrunch = loadJson('techcrunch-ai.json');
  if (techcrunch?.articles && Array.isArray(techcrunch.articles)) {
    const recent = techcrunch.articles.filter(a => isLast48Hours(a.date));
    
    if (recent.length > 0) {
      totalItems += Math.min(recent.length, 5);
      let html = `<div class="section">
        <h2>📰 TechCrunch</h2>`;
      recent.slice(0, 5).forEach(a => {
        html += `<div class="item">
          <a href="${escapeHtml(a.url)}" class="title">${escapeHtml(a.title)}</a>
          <span class="meta">${escapeHtml(a.author || '')} • ${formatDate(a.date)}</span>
          ${a.description ? `<p class="desc">${escapeHtml(truncate(a.description, 120))}</p>` : ''}
        </div>`;
      });
      html += `</div>`;
      sections.push({ priority: 10, html });
    }
  }

  // Sort sections by priority
  sections.sort((a, b) => a.priority - b.priority);

  // Generate full HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Briefing Daily Digest - ${today}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      max-width: 640px;
      margin: 0 auto;
      padding: 24px;
      line-height: 1.5;
    }
    a { color: #60a5fa; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid #222;
    }
    .header h1 {
      font-size: 1.8rem;
      margin: 0 0 8px 0;
      color: #fff;
    }
    .header .date {
      color: #888;
      font-size: 0.9rem;
    }
    .header .summary {
      color: #666;
      font-size: 0.85rem;
      margin-top: 8px;
    }
    .section {
      margin-bottom: 28px;
    }
    .section h2 {
      font-size: 1.1rem;
      color: #fff;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #222;
    }
    .item {
      margin-bottom: 14px;
      padding-left: 12px;
      border-left: 2px solid #333;
    }
    .item .title {
      font-weight: 500;
      display: block;
      margin-bottom: 4px;
    }
    .item .meta {
      font-size: 0.8rem;
      color: #666;
    }
    .item .desc {
      font-size: 0.85rem;
      color: #999;
      margin: 6px 0 0 0;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #222;
      color: #666;
      font-size: 0.85rem;
    }
    .footer a { color: #888; }
    
    /* Email-friendly dark mode alternative */
    @media (prefers-color-scheme: light) {
      body { background: #fff; color: #333; }
      .header h1 { color: #111; }
      .section h2 { color: #111; border-bottom-color: #ddd; }
      .header, .footer { border-color: #ddd; }
      .item { border-left-color: #ddd; }
      a { color: #2563eb; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚡ Briefing</h1>
    <div class="date">${today}</div>
    <div class="summary">${totalItems} updates from ${sections.length} sources</div>
  </div>

  ${sections.map(s => s.html).join('\n')}

  ${sections.length === 0 ? '<p style="text-align: center; color: #666;">No significant updates in the last 24 hours.</p>' : ''}

  <div class="footer">
    <p>Competitive intelligence for AI coding tools</p>
    <p><a href="https://kell.cx">kell.cx</a> — Built by <a href="https://kell.cx/about">Kell</a></p>
  </div>
</body>
</html>`;

  return { html, totalItems, sectionCount: sections.length };
}

// Generate and save
const { html, totalItems, sectionCount } = generateDigest();
const dateStr = new Date().toISOString().split('T')[0];
const outputFile = path.join(OUTPUT_DIR, `daily-${dateStr}.html`);

fs.writeFileSync(outputFile, html);
console.log(`Generated daily digest: ${outputFile}`);
console.log(`Total items: ${totalItems} across ${sectionCount} sections`);

// Also save as latest for easy access
const latestFile = path.join(OUTPUT_DIR, 'latest.html');
fs.writeFileSync(latestFile, html);
console.log(`Updated: ${latestFile}`);
