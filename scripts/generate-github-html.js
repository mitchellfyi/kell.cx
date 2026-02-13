#!/usr/bin/env node
/**
 * Generates github.html from github-stats.json
 * 
 * Usage: node generate-github-html.js
 */

const fs = require('fs');
const path = require('path');

const STATS_FILE = path.join(__dirname, '../site/data/github-stats.json');
const OUTPUT_FILE = path.join(__dirname, '../site/data/github.html');

function formatDate(isoDate) {
  const d = new Date(isoDate);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function generateInsight(tools) {
  const leader = tools[0];
  const hotCount = tools.filter(t => t.activity === 'hot').length;
  
  let insight = `<strong>Key insight:</strong> ${leader.name} leads with ${leader.starsFormatted} stars`;
  
  if (tools.length >= 2) {
    const gap = leader.stars - tools[1].stars;
    if (gap > 0) {
      const gapK = Math.round(gap / 1000);
      insight += `, ${gapK}K ahead of ${tools[1].name}`;
    }
  }
  
  if (hotCount > 3) {
    insight += `. ${hotCount} of ${tools.length} tools pushed today — rapid development across the board.`;
  } else {
    insight += `.`;
  }
  
  return insight;
}

function generateHTML(stats) {
  const tools = stats.tools;
  const updated = formatDate(stats.generatedAt);
  const insight = generateInsight(tools);
  
  const rows = tools.map(t => `
                <tr>
                    <td>
                        <div class="tool-name">
                            <a href="${t.url}" target="_blank">${t.name}</a>
                            ${t.isLeader ? '<span class="badge badge-leader">★ Leader</span>' : ''}
                        </div>
                        <div class="tool-desc">${t.description}</div>
                    </td>
                    <td class="num stars">${t.stars.toLocaleString()}</td>
                    <td class="num forks">${t.forks.toLocaleString()}</td>
                    <td class="activity ${t.activity}">${t.activityText}</td>
                </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub Stats — Kell</title>
    <meta name="description" content="GitHub stars, forks, and activity for open source AI coding tools. Track OSS momentum.">
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
        .nav-logo { color: #fff; text-decoration: none; font-weight: 600; }
        .nav-links { display: flex; gap: 1.5rem; }
        .nav-links a { color: #888; text-decoration: none; font-size: 0.9rem; }
        .nav-links a:hover { color: #fff; }
        .nav-links a.active { color: #fff; }
        
        .breadcrumb {
            font-size: 0.85rem;
            color: #666;
            margin-bottom: 1rem;
        }
        .breadcrumb a { color: #888; text-decoration: none; }
        .breadcrumb a:hover { color: #fff; }
        
        h1 { font-size: 2rem; margin-bottom: 0.5rem; }
        .subtitle { color: #888; margin-bottom: 0.5rem; }
        .updated { color: #555; font-size: 0.85rem; margin-bottom: 2rem; }
        
        .insight-box {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 8px;
            padding: 1rem 1.25rem;
            margin-bottom: 2rem;
            font-size: 0.9rem;
        }
        .insight-box strong { color: #3b82f6; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
            margin-bottom: 2rem;
        }
        th, td {
            text-align: left;
            padding: 0.75rem;
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
        
        .tool-name { font-weight: 500; color: #fff; }
        .tool-name a { color: #fff; text-decoration: none; }
        .tool-name a:hover { color: #3b82f6; }
        .tool-desc { color: #666; font-size: 0.8rem; }
        
        .stars { color: #eab308; }
        .forks { color: #888; }
        .activity { font-size: 0.8rem; }
        .activity.hot { color: #22c55e; }
        .activity.warm { color: #eab308; }
        .activity.cool { color: #888; }
        
        .num { 
            font-variant-numeric: tabular-nums;
            text-align: right;
        }
        
        .badge {
            display: inline-block;
            font-size: 0.7rem;
            padding: 0.15rem 0.4rem;
            border-radius: 4px;
            margin-left: 0.5rem;
        }
        .badge-leader {
            background: rgba(234, 179, 8, 0.2);
            color: #eab308;
        }
        
        .summary {
            display: flex;
            gap: 2rem;
            margin-bottom: 2rem;
            flex-wrap: wrap;
        }
        .summary-stat {
            text-align: center;
        }
        .summary-stat .value {
            font-size: 1.5rem;
            font-weight: 600;
            color: #fff;
        }
        .summary-stat .label {
            font-size: 0.8rem;
            color: #666;
        }
        
        .methodology {
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 8px;
            padding: 1.25rem;
            font-size: 0.85rem;
            color: #888;
        }
        .methodology h3 {
            color: #ccc;
            font-size: 0.9rem;
            margin-bottom: 0.75rem;
        }
        
        footer {
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid rgba(255,255,255,0.08);
            text-align: center;
            color: #555;
            font-size: 0.85rem;
        }
        footer a { color: #888; text-decoration: none; }
        footer a:hover { color: #fff; }
        
        @media (max-width: 600px) {
            nav { flex-direction: column; gap: 1rem; text-align: center; }
            .nav-links { flex-wrap: wrap; justify-content: center; gap: 0.75rem 1.25rem; }
            .container { padding: 1.5rem 1rem; }
            table { font-size: 0.8rem; }
            th, td { padding: 0.5rem 0.25rem; }
            .badge { display: none; }
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
        
        <div class="breadcrumb"><a href="/data/">Data</a> → GitHub Stats</div>
        
        <h1>🐙 GitHub Stats</h1>
        <p class="subtitle">Open source AI coding tools by stars, forks, and activity</p>
        <p class="updated">Updated: ${updated}</p>
        
        <div class="summary">
            <div class="summary-stat">
                <div class="value">${stats.repoCount}</div>
                <div class="label">Tools Tracked</div>
            </div>
            <div class="summary-stat">
                <div class="value">${(stats.summary.totalStars / 1000).toFixed(0)}K</div>
                <div class="label">Total Stars</div>
            </div>
            <div class="summary-stat">
                <div class="value">${stats.summary.activeToday}</div>
                <div class="label">Active Today</div>
            </div>
        </div>
        
        <div class="insight-box">
            ${insight}
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Tool</th>
                    <th class="num">Stars</th>
                    <th class="num">Forks</th>
                    <th>Last Push</th>
                </tr>
            </thead>
            <tbody>${rows}
            </tbody>
        </table>
        
        <div class="methodology">
            <h3>Methodology</h3>
            <p>Data pulled from GitHub API. Stars and forks are live counts. "Today" = pushed within 24h. Excludes closed-source tools (Cursor, Copilot, Windsurf) and model repos.</p>
        </div>
        
        <footer>
            <p>Built by <a href="/about.html">Kell</a> · <a href="mailto:hi@kell.cx">hi@kell.cx</a></p>
        </footer>
    </div>
</body>
</html>`;
}

function main() {
  if (!fs.existsSync(STATS_FILE)) {
    console.error(`Error: ${STATS_FILE} not found. Run collect-github-stats.js first.`);
    process.exit(1);
  }
  
  const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
  const html = generateHTML(stats);
  
  fs.writeFileSync(OUTPUT_FILE, html);
  console.log(`✓ Generated ${OUTPUT_FILE}`);
  console.log(`  ${stats.repoCount} tools, ${stats.summary.totalStars.toLocaleString()} total stars`);
}

main();
