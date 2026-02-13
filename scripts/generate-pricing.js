#!/usr/bin/env node
/**
 * Generate pricing.html from structured pricing.json data
 * Run: node scripts/generate-pricing.js
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/pricing.json');
const outputPath = path.join(__dirname, '../site/data/pricing.html');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

function formatPrice(tier) {
  if (tier === null) return '<td class="na">—</td>';
  if (tier === true) return '<td class="free">Yes</td>';
  if (tier === 'Custom' || tier === 'Enterprise') return '<td>Custom</td>';
  if (tier === 'BYOK') return '<td class="usage">BYOK</td>';
  if (tier === 'Open Source') return '<td class="free">Open Source</td>';
  if (tier === 'Usage-based') return '<td class="usage">Usage-based</td>';
  if (tier === 'TBA' || tier === 'Waitlist') return '<td class="na">' + tier + '</td>';
  if (typeof tier === 'string') return `<td>${tier}</td>`;
  if (typeof tier === 'object' && tier.price !== undefined) {
    const priceStr = typeof tier.price === 'number' ? `$${tier.price}` : tier.price;
    return `<td>${priceStr}/${tier.period}</td>`;
  }
  return '<td class="na">—</td>';
}

function generateToolRow(tool) {
  const highlight = tool.highlight ? ' class="highlight"' : '';
  const badge = tool.badge ? `<span class="new-badge">${tool.badge}</span>` : '';
  
  return `                    <tr${highlight}>
                        <td class="company">${tool.name}${badge}</td>
                        ${formatPrice(tool.freeTier)}
                        ${formatPrice(tool.individual)}
                        ${formatPrice(tool.team)}
                        ${formatPrice(tool.enterprise)}
                        <td>${tool.notes || ''}</td>
                    </tr>`;
}

function generateCategory(cat) {
  const rows = cat.tools.map(generateToolRow).join('\n');
  return `        <div class="section">
            <h2>${cat.emoji} ${cat.name}</h2>
            <table>
                <thead>
                    <tr>
                        <th>Tool</th>
                        <th>Free Tier</th>
                        <th>Individual</th>
                        <th>Team</th>
                        <th>Enterprise</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
${rows}
                </tbody>
            </table>
        </div>`;
}

function generateLLMPricing(llm) {
  const rows = llm.providers.flatMap(p => 
    p.models.map((m, i) => 
      `                    <tr>
                        <td>${i === 0 ? `<strong>${p.name}</strong>` : ''}</td>
                        <td>${m.name}</td>
                        <td>$${m.input.toFixed(2)}</td>
                        <td>$${m.output.toFixed(2)}</td>
                    </tr>`
    )
  ).join('\n');

  return `        <div class="section">
            <h2>💵 LLM API Pricing (for BYOK tools)</h2>
            <p class="note">${llm.description}</p>
            <table>
                <thead>
                    <tr>
                        <th>Provider</th>
                        <th>Model</th>
                        <th>Input (${llm.providers[0].models[0].unit})</th>
                        <th>Output (${llm.providers[0].models[0].unit})</th>
                    </tr>
                </thead>
                <tbody>
${rows}
                </tbody>
            </table>
        </div>`;
}

const categories = data.categories.map(generateCategory).join('\n\n');
const llmSection = generateLLMPricing(data.llmApiPricing);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Coding Tool Pricing Comparison — Kell</title>
    <meta name="description" content="Comprehensive pricing comparison for AI coding assistants: Cursor, Copilot, Claude Code, Windsurf, and 15+ more tools. Updated February 2026.">
    <meta property="og:title" content="AI Coding Tool Pricing — Kell">
    <meta property="og:description" content="Compare pricing across all major AI coding tools. Updated weekly.">
    <meta property="og:image" content="https://kell.cx/og-image.png">
    <meta property="og:url" content="https://kell.cx/data/pricing.html">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #fafafa;
            min-height: 100vh;
            line-height: 1.6;
        }
        .container { max-width: 1000px; margin: 0 auto; padding: 2rem; }
        nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .nav-logo { color: #fff; text-decoration: none; font-weight: 600; }
        .nav-links { display: flex; gap: 1.5rem; }
        .nav-links a { color: #888; text-decoration: none; font-size: 0.9rem; }
        .nav-links a:hover { color: #fff; }
        .nav-links a.active { color: #fff; }
        @media (max-width: 600px) {
            nav { flex-direction: column; gap: 1rem; text-align: center; }
            .nav-links { flex-wrap: wrap; justify-content: center; gap: 0.75rem 1.25rem; }
            .container { padding: 1.5rem 1rem; }
        }
        
        .breadcrumb { font-size: 0.85rem; color: #666; margin-bottom: 1rem; }
        .breadcrumb a { color: #888; text-decoration: none; }
        .breadcrumb a:hover { color: #fff; }
        h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
        .subtitle { color: #888; margin-bottom: 2rem; }
        
        .section { margin-bottom: 3rem; }
        .section h2 { font-size: 1.25rem; color: #fff; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem; }
        
        table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 1.5rem; }
        th, td { text-align: left; padding: 0.75rem 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
        th { color: #888; font-weight: 500; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.03em; position: sticky; top: 0; background: #0a0a0a; }
        td { color: #ccc; }
        tr:hover td { background: rgba(255,255,255,0.02); }
        .company { color: #fff; font-weight: 500; }
        .free { color: #22c55e; }
        .na { color: #555; }
        .highlight { background: rgba(59, 130, 246, 0.1); }
        .new-badge { background: #3b82f6; color: #fff; font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; margin-left: 6px; text-transform: uppercase; vertical-align: middle; }
        .usage { color: #eab308; }
        
        .note { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem; font-size: 0.85rem; color: #888; margin-bottom: 1.5rem; }
        .note strong { color: #ccc; }
        
        .key { display: flex; gap: 2rem; flex-wrap: wrap; margin-bottom: 2rem; font-size: 0.8rem; }
        .key-item { display: flex; align-items: center; gap: 0.5rem; }
        .key-dot { width: 10px; height: 10px; border-radius: 50%; }
        .key-dot.free { background: #22c55e; }
        .key-dot.paid { background: #3b82f6; }
        .key-dot.usage { background: #eab308; }
        
        @media (max-width: 700px) {
            table { font-size: 0.75rem; display: block; overflow-x: auto; }
            th, td { padding: 0.5rem 0.25rem; white-space: nowrap; }
        }
        
        footer { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.08); text-align: center; color: #555; font-size: 0.85rem; }
        footer a { color: #888; text-decoration: none; }
        footer a:hover { color: #fff; }
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
        
        <div class="breadcrumb"><a href="/data/">Data</a> → Pricing</div>
        <h1>💰 AI Coding Tool Pricing</h1>
        <p class="subtitle">Last updated: ${data.meta.lastUpdated}</p>
        
        <div class="key">
            <div class="key-item"><span class="key-dot free"></span> Free tier available</div>
            <div class="key-item"><span class="key-dot paid"></span> Subscription-based</div>
            <div class="key-item"><span class="key-dot usage"></span> Usage-based pricing</div>
        </div>

${categories}

${llmSection}

        <div class="note">
            <strong>Notes:</strong> Prices as of ${data.meta.lastUpdated}. "BYOK" = Bring Your Own Keys (use your own API keys). Enterprise pricing varies by company size and requirements. LLM API prices are approximate and may vary.
        </div>

        <footer>
            <p>Built by <a href="/">Kell</a> ⚡</p>
            <p style="margin-top: 0.5rem;">Data sourced from official pricing pages. <a href="mailto:hi@kell.cx">Report errors</a></p>
        </footer>
    </div>
</body>
</html>`;

fs.writeFileSync(outputPath, html);
console.log(`✅ Generated ${outputPath}`);
console.log(`   ${data.categories.reduce((sum, c) => sum + c.tools.length, 0)} tools across ${data.categories.length} categories`);
