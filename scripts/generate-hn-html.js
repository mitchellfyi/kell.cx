#!/usr/bin/env node
/**
 * Generate HN Mentions HTML page for kell.cx
 * 
 * Usage: node generate-hn-html.js [--input path] [--output path]
 */

const fs = require('fs');
const path = require('path');

function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function generateHTML(data) {
  const rows = data.stories.slice(0, 30).map(story => `
                    <tr>
                        <td class="tool-cell"><span class="tool-tag">${story.tool}</span></td>
                        <td class="title-cell">
                            <a href="${story.url}" target="_blank" rel="noopener">${escapeHtml(story.title)}</a>
                            <a href="${story.hnUrl}" class="hn-link" target="_blank" rel="noopener">↗</a>
                        </td>
                        <td class="stat-cell">${story.emoji} ${story.points}</td>
                        <td class="stat-cell">${story.comments}</td>
                        <td class="date-cell">${formatDate(story.createdAt)}</td>
                    </tr>`).join('');

  const toolRows = data.toolRankings.slice(0, 10).map((t, i) => `
                    <tr>
                        <td class="rank-cell">#${i + 1}</td>
                        <td>${t.tool}</td>
                        <td class="stat-cell">${t.mentions}</td>
                        <td class="stat-cell">${formatNumber(t.totalPoints)}</td>
                        <td class="stat-cell">${formatNumber(t.totalComments)}</td>
                    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HackerNews Buzz — Kell</title>
    <meta name="description" content="AI coding tool mentions and discussions on HackerNews. Track which tools are generating the most buzz.">
    <meta property="og:title" content="HackerNews Buzz — AI Coding Tools">
    <meta property="og:description" content="Track AI coding tool mentions and discussions on HackerNews">
    <meta property="og:image" content="https://kell.cx/og-image.png">
    <meta property="og:url" content="https://kell.cx/data/hackernews.html">
    <meta name="twitter:card" content="summary_large_image">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #fafafa;
            min-height: 100vh;
            line-height: 1.6;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem;
        }
        nav {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .nav-logo {
            color: #fff;
            text-decoration: none;
            font-weight: 600;
        }
        .nav-links {
            display: flex;
            gap: 1.5rem;
        }
        .nav-links a {
            color: #888;
            text-decoration: none;
            font-size: 0.9rem;
        }
        .nav-links a:hover { color: #fff; }
        .nav-links a.active { color: #fff; }
        .breadcrumb {
            font-size: 0.85rem;
            color: #666;
            margin-bottom: 1rem;
        }
        .breadcrumb a {
            color: #888;
            text-decoration: none;
        }
        .breadcrumb a:hover { color: #fff; }
        h1 {
            font-size: 2rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        .subtitle {
            color: #888;
            margin-bottom: 2rem;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 8px;
            padding: 1rem;
            text-align: center;
        }
        .stat-card .value {
            font-size: 1.5rem;
            font-weight: 600;
            color: #3b82f6;
        }
        .stat-card .label {
            font-size: 0.8rem;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }
        h2 {
            font-size: 1.3rem;
            font-weight: 600;
            margin: 2rem 0 1rem;
            color: #fff;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
        }
        th, td {
            text-align: left;
            padding: 0.75rem 0.5rem;
            border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        th {
            color: #888;
            font-weight: 500;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }
        td { color: #ccc; }
        tr:hover td { background: rgba(255,255,255,0.02); }
        .tool-cell { width: 100px; }
        .tool-tag {
            display: inline-block;
            padding: 0.2rem 0.5rem;
            background: rgba(59,130,246,0.15);
            color: #3b82f6;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        .title-cell a {
            color: #fff;
            text-decoration: none;
        }
        .title-cell a:hover { text-decoration: underline; }
        .hn-link {
            color: #ff6600 !important;
            margin-left: 0.5rem;
            font-size: 0.8rem;
        }
        .stat-cell {
            text-align: right;
            width: 80px;
            color: #888;
        }
        .date-cell {
            text-align: right;
            width: 70px;
            color: #666;
            font-size: 0.85rem;
        }
        .rank-cell {
            width: 50px;
            color: #666;
        }
        .updated {
            font-size: 0.8rem;
            color: #555;
            margin-top: 2rem;
        }
        footer {
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid rgba(255,255,255,0.08);
            text-align: center;
            color: #555;
            font-size: 0.85rem;
        }
        footer a {
            color: #888;
            text-decoration: none;
        }
        footer a:hover { color: #fff; }
        
        @media (max-width: 600px) {
            .container { padding: 1.5rem 1rem; }
            nav {
                flex-direction: column;
                gap: 1rem;
                text-align: center;
            }
            .nav-links {
                flex-wrap: wrap;
                justify-content: center;
                gap: 0.75rem 1.25rem;
            }
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            table { font-size: 0.8rem; }
            th, td { padding: 0.5rem 0.25rem; }
            .tool-cell { width: 70px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <nav>
            <a href="/" class="nav-logo">⚡ Kell</a>
            <div class="nav-links">
                <a href="/about.html">About</a>
                <a href="/blog.html">Blog</a>
                <a href="/data/" class="active">Data</a>
                <a href="/pricing.html">Pricing</a>
            </div>
        </nav>
        
        <div class="breadcrumb"><a href="/data/">Data</a> → HackerNews Buzz</div>
        
        <h1>📰 HackerNews Buzz</h1>
        <p class="subtitle">AI coding tool mentions and discussions — ${data.period}</p>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="value">${data.totalMentions}</div>
                <div class="label">Stories</div>
            </div>
            <div class="stat-card">
                <div class="value">${formatNumber(data.summary.totalPoints)}</div>
                <div class="label">Total Points</div>
            </div>
            <div class="stat-card">
                <div class="value">${formatNumber(data.summary.totalComments)}</div>
                <div class="label">Comments</div>
            </div>
            <div class="stat-card">
                <div class="value">${data.summary.viralStories}</div>
                <div class="label">Viral Posts</div>
            </div>
        </div>
        
        <h2>🏆 Tool Rankings</h2>
        <table>
            <thead>
                <tr>
                    <th></th>
                    <th>Tool</th>
                    <th style="text-align:right">Mentions</th>
                    <th style="text-align:right">Points</th>
                    <th style="text-align:right">Comments</th>
                </tr>
            </thead>
            <tbody>${toolRows}
            </tbody>
        </table>
        
        <h2>📋 Recent Stories</h2>
        <table>
            <thead>
                <tr>
                    <th>Tool</th>
                    <th>Title</th>
                    <th style="text-align:right">Points</th>
                    <th style="text-align:right">💬</th>
                    <th style="text-align:right">Date</th>
                </tr>
            </thead>
            <tbody>${rows}
            </tbody>
        </table>
        
        <p class="updated">Last updated: ${new Date(data.generatedAt).toUTCString()}</p>
        
        <footer>
            <p>Built by <a href="/about.html">Kell</a> · <a href="mailto:hi@kell.cx">hi@kell.cx</a></p>
        </footer>
    </div>
</body>
</html>`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf('--input');
  const outputIndex = args.indexOf('--output');
  
  const inputPath = inputIndex >= 0 ? args[inputIndex + 1] : path.join(__dirname, '../site/data/hn-mentions.json');
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : path.join(__dirname, '../site/data/hackernews.html');
  
  try {
    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    const html = generateHTML(data);
    fs.writeFileSync(outputPath, html);
    console.log(`Generated ${outputPath}`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
