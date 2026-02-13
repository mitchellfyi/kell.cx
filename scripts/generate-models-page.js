#!/usr/bin/env node
/**
 * Generate models.html from company-products.json
 * Run: node scripts/generate-models-page.js
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/company-products.json');
const OUTPUT_PATH = path.join(__dirname, '../site/data/models.html');

// Model release tracking (source of truth for recent releases)
const RECENT_RELEASES = [
  { date: '2026-02-10', model: 'Grok 4', provider: 'xAI', type: 'flagship', link: 'https://x.ai' },
  { date: '2026-02-04', model: 'GPT-5.3-Codex', provider: 'OpenAI', type: 'coding', link: 'https://openai.com/blog' },
  { date: '2026-01-28', model: 'Claude Opus 4.6', provider: 'Anthropic', type: 'flagship', link: 'https://anthropic.com/news' },
  { date: '2026-01-15', model: 'Gemini 2.5 Flash Lite', provider: 'Google', type: 'fast', link: 'https://ai.google' },
  { date: '2026-01-09', model: 'Llama 4 Maverick', provider: 'Meta', type: 'flagship', link: 'https://ai.meta.com/blog' },
  { date: '2025-12-20', model: 'DeepSeek V3', provider: 'DeepSeek', type: 'flagship', link: 'https://deepseek.com' },
];

// Provider emoji mapping
const PROVIDER_EMOJI = {
  'Anthropic': '🟤',
  'OpenAI': '🟢',
  'Google': '🔵',
  'Meta': '🔷',
  'xAI': '⚫',
  'Mistral': '🟠',
  'DeepSeek': '🐋',
  'Cohere': '🟡',
  'Magic': '✨',
  'Poolside': '🏊',
};

// Type badge class mapping
const TYPE_CLASSES = {
  'flagship': 'flagship',
  'coding': 'coding',
  'reasoning': 'reasoning',
  'reasoning-fast': 'fast',
  'fast': 'fast',
  'lightweight': 'fast',
  'balanced': '',
  'efficient': 'fast',
  'general': 'flagship',
  'previous': '',
  'long-context': 'reasoning',
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isNew(dateStr) {
  const d = new Date(dateStr);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return d > weekAgo;
}

function generateRecentReleasesTable(releases) {
  const rows = releases.map(r => {
    const typeClass = TYPE_CLASSES[r.type] || '';
    const newBadge = isNew(r.date) ? '<span class="new">NEW</span>' : '';
    return `                    <tr>
                        <td class="date">${formatDate(r.date)}</td>
                        <td><strong>${r.model}</strong>${newBadge}</td>
                        <td>${r.provider}</td>
                        <td><span class="model-type ${typeClass}">${r.type.charAt(0).toUpperCase() + r.type.slice(1)}</span></td>
                        <td><a href="${r.link}" style="color:#3b82f6">${new URL(r.link).hostname.replace('www.', '')}</a></td>
                    </tr>`;
  }).join('\n');

  return `<table>
                <thead><tr><th>Date</th><th>Model</th><th>Provider</th><th>Type</th><th>Links</th></tr></thead>
                <tbody>
${rows}
                </tbody>
            </table>`;
}

function generateCompanyCard(company) {
  if (!company.products?.models || company.products.models.length === 0) {
    return '';
  }

  const emoji = PROVIDER_EMOJI[company.name] || '🔘';
  const models = company.products.models.map(m => {
    const typeClass = TYPE_CLASSES[m.type] || '';
    const typeLabel = m.type.charAt(0).toUpperCase() + m.type.slice(1);
    const newBadge = m.isNew ? '<span class="new">NEW</span>' : '';
    return `                        <li class="model-item">
                            <span class="model-name">${m.name}${newBadge}</span>
                            <span class="model-type ${typeClass}">${typeLabel}</span>
                        </li>`;
  }).join('\n');

  return `                <div class="company-card">
                    <div class="company-header">
                        <span class="company-logo">${emoji}</span>
                        <span class="company-name">${company.name}</span>
                        <span class="company-url"><a href="https://${company.website}">${company.website}</a></span>
                    </div>
                    <ul class="model-list">
${models}
                    </ul>
                </div>`;
}

function generateTrackingSourcesTable(companies) {
  const providers = companies.filter(c => c.category === 'model-provider' && c.products?.models);
  
  const rows = providers.map(c => {
    const sources = c.trackingSources || [];
    const news = sources.find(s => s.includes('blog') || s.includes('news'));
    const changelog = sources.find(s => s.includes('changelog') || s.includes('api'));
    const other = sources.find(s => !s.includes('blog') && !s.includes('news') && !s.includes('changelog') && !s.includes('api'));
    
    const newsLink = getProviderNewsLink(c.name);
    const changelogLink = getProviderChangelogLink(c.name);
    const otherLink = getProviderOtherLink(c.name);
    
    return `                    <tr>
                        <td><strong>${c.name}</strong></td>
                        <td>${newsLink || '—'}</td>
                        <td>${changelogLink || '—'}</td>
                        <td>${otherLink || '—'}</td>
                    </tr>`;
  }).join('\n');

  return `<table>
                <thead><tr><th>Provider</th><th>News</th><th>Changelog</th><th>Other</th></tr></thead>
                <tbody>
${rows}
                </tbody>
            </table>`;
}

function getProviderNewsLink(name) {
  const links = {
    'Anthropic': '<a href="https://anthropic.com/news" style="color:#3b82f6">News</a>',
    'OpenAI': '<a href="https://openai.com/blog" style="color:#3b82f6">Blog</a>',
    'Google': '<a href="https://deepmind.google/blog" style="color:#3b82f6">DeepMind Blog</a>',
    'Meta': '<a href="https://ai.meta.com/blog" style="color:#3b82f6">AI Blog</a>',
    'xAI': '<a href="https://x.ai" style="color:#3b82f6">x.ai</a>',
    'Mistral': '<a href="https://mistral.ai/news" style="color:#3b82f6">News</a>',
    'DeepSeek': '<a href="https://deepseek.com" style="color:#3b82f6">DeepSeek</a>',
    'Cohere': '<a href="https://cohere.com/blog" style="color:#3b82f6">Blog</a>',
  };
  return links[name];
}

function getProviderChangelogLink(name) {
  const links = {
    'Anthropic': '<a href="https://docs.anthropic.com/en/release-notes/overview" style="color:#3b82f6">API Release Notes</a>',
    'OpenAI': '<a href="https://platform.openai.com/docs/changelog" style="color:#3b82f6">Changelog</a>',
    'Google': '<a href="https://ai.google.dev/changelog" style="color:#3b82f6">AI Studio</a>',
  };
  return links[name];
}

function getProviderOtherLink(name) {
  const links = {
    'OpenAI': '<a href="https://status.openai.com" style="color:#3b82f6">Status</a>',
    'Google': '<a href="https://cloud.google.com/vertex-ai/docs/release-notes" style="color:#3b82f6">Vertex</a>',
    'Meta': '<a href="https://huggingface.co/meta-llama" style="color:#3b82f6">Hugging Face</a>',
    'xAI': 'X/Twitter',
    'Mistral': '<a href="https://huggingface.co/mistralai" style="color:#3b82f6">Hugging Face</a>',
    'DeepSeek': '<a href="https://huggingface.co/deepseek-ai" style="color:#3b82f6">Hugging Face</a>',
  };
  return links[name];
}

function generateHTML(data) {
  const modelProviders = data.companies.filter(c => c.products?.models && c.products.models.length > 0);
  
  // Mark recent releases as "new"
  const recentModelNames = new Set(RECENT_RELEASES.filter(r => isNew(r.date)).map(r => r.model));
  modelProviders.forEach(c => {
    c.products.models.forEach(m => {
      if (recentModelNames.has(m.name)) {
        m.isNew = true;
      }
    });
  });

  const companyCards = modelProviders.map(generateCompanyCard).filter(Boolean).join('\n\n');
  const recentReleasesTable = generateRecentReleasesTable(RECENT_RELEASES);
  const trackingSourcesTable = generateTrackingSourcesTable(data.companies);
  const updateDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Foundation Model Releases — Kell</title>
    <meta name="description" content="Track the latest AI foundation model releases from Anthropic, OpenAI, Google, Meta, xAI, Mistral, and DeepSeek. Updated daily.">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fafafa; min-height: 100vh; line-height: 1.6; }
        .container { max-width: 900px; margin: 0 auto; padding: 2rem; }
        
        nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .nav-logo { color: #fff; text-decoration: none; font-weight: 600; }
        .nav-links { display: flex; gap: 1.5rem; }
        .nav-links a { color: #888; text-decoration: none; font-size: 0.9rem; }
        .nav-links a:hover { color: #fff; }
        .nav-links a.active { color: #fff; }
        
        footer { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.08); text-align: center; color: #555; font-size: 0.85rem; }
        footer a { color: #888; text-decoration: none; }
        
        @media (max-width: 600px) { .container { padding: 1.5rem 1rem; } nav { flex-direction: column; gap: 1rem; text-align: center; } .nav-links { flex-wrap: wrap; justify-content: center; gap: 0.75rem 1.25rem; } .company-grid { grid-template-columns: 1fr; } table { font-size: 0.75rem; } th, td { padding: 0.5rem 0.25rem; } }
        
        .breadcrumb { font-size: 0.85rem; color: #666; margin-bottom: 1rem; }
        .breadcrumb a { color: #888; text-decoration: none; }
        h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
        .subtitle { color: #888; margin-bottom: 0.5rem; }
        .updated { color: #555; font-size: 0.8rem; margin-bottom: 2rem; }
        
        .section { margin-bottom: 2.5rem; }
        .section-title { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.08); }
        
        .company-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
        .company-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1.25rem; }
        .company-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .company-logo { font-size: 1.5rem; }
        .company-name { font-weight: 600; color: #fff; }
        .company-url { color: #555; font-size: 0.8rem; margin-left: auto; }
        .company-url a { color: #3b82f6; text-decoration: none; }
        
        .model-list { list-style: none; }
        .model-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .model-item:last-child { border-bottom: none; }
        .model-name { color: #eee; font-weight: 500; }
        .model-type { color: #666; font-size: 0.8rem; background: rgba(255,255,255,0.05); padding: 0.15rem 0.5rem; border-radius: 3px; }
        .model-type.flagship { background: rgba(251,191,36,0.15); color: #fbbf24; }
        .model-type.coding { background: rgba(59,130,246,0.15); color: #3b82f6; }
        .model-type.reasoning { background: rgba(168,85,247,0.15); color: #a855f7; }
        .model-type.fast { background: rgba(34,197,94,0.15); color: #22c55e; }
        .new { background: rgba(34,197,94,0.1); color: #22c55e; font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 3px; margin-left: 0.5rem; }
        
        table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        th, td { text-align: left; padding: 0.6rem 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
        th { color: #666; font-weight: 500; font-size: 0.7rem; text-transform: uppercase; }
        td { color: #ccc; }
        tr:hover td { background: rgba(255,255,255,0.02); }
        .date { color: #888; font-family: monospace; }
        
        .note { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 1rem; font-size: 0.85rem; color: #888; margin-top: 1rem; }
        .note a { color: #3b82f6; }
        
        /* Auto-generated: ${new Date().toISOString()} */
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
        
        <div class="breadcrumb"><a href="/data/">Data</a> → Foundation Models</div>
        <h1>Foundation Model Releases</h1>
        <p class="subtitle">Track the latest AI models from major providers</p>
        <p class="updated">Updated: ${updateDate}</p>
        
        <div class="section">
            <div class="section-title">Recent Releases</div>
            ${recentReleasesTable}
        </div>
        
        <div class="section">
            <div class="section-title">Current Models by Provider</div>
            <div class="company-grid">
${companyCards}
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Model Categories</div>
            <div class="note">
                <p style="margin-bottom:0.75rem;"><span class="model-type flagship">Flagship</span> — Highest capability, best quality, higher cost</p>
                <p style="margin-bottom:0.75rem;"><span class="model-type coding">Coding</span> — Optimized for code generation and editing</p>
                <p style="margin-bottom:0.75rem;"><span class="model-type reasoning">Reasoning</span> — Extended thinking, multi-step problem solving</p>
                <p><span class="model-type fast">Fast</span> — Lower latency, lower cost, good for real-time apps</p>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Tracking Sources</div>
            ${trackingSourcesTable}
        </div>
        
        <p style="color:#666;font-size:0.85rem;margin-top:2rem;"><a href="/data/" style="color:#3b82f6;">← Back to Data Dashboard</a></p>
        
        <footer>
            <p>Built by <a href="/about.html">Kell</a> · <a href="mailto:hi@kell.cx">hi@kell.cx</a></p>
        </footer>
    </div>
</body>
</html>`;
}

// Main
try {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const html = generateHTML(data);
  fs.writeFileSync(OUTPUT_PATH, html);
  console.log(`✅ Generated ${OUTPUT_PATH}`);
  console.log(`   ${data.companies.filter(c => c.products?.models).length} model providers`);
  console.log(`   ${RECENT_RELEASES.length} recent releases tracked`);
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
