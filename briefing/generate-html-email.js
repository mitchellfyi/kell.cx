#!/usr/bin/env node
/**
 * Generate beautiful HTML email from briefing data
 * Produces the clean, professional format Mitchell liked
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DIGEST_DIR = path.join(__dirname, 'digests');
const OUTPUT_DIR = path.join(__dirname, 'emails');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function loadData(filename) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function loadLatestData(prefix) {
  // Try dated file first (e.g., jobs-2026-02-13.json)
  const today = new Date().toISOString().split('T')[0];
  const datedFile = `${prefix}-${today}.json`;
  const latestFile = `${prefix}-latest.json`;
  const baseFile = `${prefix}.json`;
  
  return loadData(datedFile) || loadData(latestFile) || loadData(baseFile);
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(text, maxLen = 80) {
  if (!text || text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

function generateSignalsSection(signals) {
  if (!signals || signals.length === 0) {
    return '<p style="color:#999;margin:0;">No major signals today.</p>';
  }
  
  return signals.map(s => {
    const tagColors = {
      'PRICING': '#22c55e',
      'PRODUCT': '#3b82f6',
      'FEATURE': '#8b5cf6',
      'FUNDING': '#f59e0b',
      'HIRING': '#ec4899',
      'NEWS': '#6366f1'
    };
    const tagColor = tagColors[s.tag] || '#666';
    
    return `
      <div style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
        <div style="margin-bottom:4px;">
          <strong style="color:#111;">${escapeHtml(s.company)}</strong>
          ${s.tag ? `<span style="color:${tagColor};font-size:12px;margin-left:8px;">${s.tag}</span>` : ''}
        </div>
        <p style="margin:0;color:#666;font-size:14px;">${escapeHtml(s.description)}${s.implication ? ` <em>${escapeHtml(s.implication)}</em>` : ''}</p>
        ${s.link ? `<a href="${s.link}" style="color:#3b82f6;text-decoration:none;font-size:13px;">View details →</a>` : ''}
      </div>`;
  }).join('');
}

function generateMomentumSection(momentum) {
  if (!momentum || momentum.length === 0) return '';
  
  const rows = momentum.slice(0, 8).map((m, i) => {
    const arrow = m.change > 0 ? '↑' : m.change < 0 ? '↓' : '→';
    const color = m.change > 0 ? '#22c55e' : m.change < 0 ? '#ef4444' : '#888';
    const doubleArrow = Math.abs(m.change) > 5 ? arrow : '';
    
    return `
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td width="30" style="padding:8px 0;color:#666;">#${i + 1}</td>
        <td style="padding:8px 0;"><strong style="color:#111;">${escapeHtml(m.name)}</strong></td>
        <td width="60" style="padding:8px 0;color:${color};text-align:right;">${m.score} ${arrow}${doubleArrow}</td>
      </tr>`;
  }).join('');
  
  return `
    <tr>
      <td style="padding:24px 32px;border-bottom:1px solid #eee;">
        <h2 style="margin:0 0 16px;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;color:#666;">Momentum Rankings</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;">
          ${rows}
        </table>
        <p style="margin:12px 0 0;font-size:13px;color:#888;">
          <a href="https://kell.cx/leaderboard" style="color:#3b82f6;text-decoration:none;">Full leaderboard →</a>
        </p>
      </td>
    </tr>`;
}

function generateHiringSection(hiring) {
  if (!hiring || hiring.length === 0) return '';
  
  const rows = hiring.slice(0, 5).map(h => {
    const changeHtml = h.change > 0 ? ` <span style="color:#22c55e;">(+${h.change})</span>` : '';
    return `
      <tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:8px 0;"><a href="${h.link || '#'}" style="color:#111;text-decoration:none;">${escapeHtml(h.company)}</a></td>
        <td style="padding:8px 0;color:#666;text-align:right;">${h.roles} roles${changeHtml}</td>
      </tr>`;
  }).join('');
  
  return `
    <tr>
      <td style="padding:24px 32px;border-bottom:1px solid #eee;">
        <h2 style="margin:0 0 16px;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;color:#666;">Hiring</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;">
          ${rows}
        </table>
        <p style="margin:12px 0 0;font-size:13px;color:#888;">
          <a href="https://kell.cx/data/hiring" style="color:#3b82f6;text-decoration:none;">Full hiring data →</a>
        </p>
      </td>
    </tr>`;
}

function generateNewsSection(news) {
  if (!news || news.length === 0) return '';
  
  const items = news.slice(0, 4).map(n => `
    <div style="padding:8px 0;">
      <a href="${n.link}" style="color:#111;text-decoration:none;font-weight:500;">${escapeHtml(truncate(n.title, 70))}</a>
      <p style="margin:4px 0 0;color:#888;font-size:13px;">${escapeHtml(n.source)}</p>
    </div>`).join('');
  
  return `
    <tr>
      <td style="padding:24px 32px;border-bottom:1px solid #eee;">
        <h2 style="margin:0 0 16px;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;color:#666;">Press</h2>
        ${items}
      </td>
    </tr>`;
}

function generateLeadInsight(signals, momentum) {
  // Pick the most interesting signal as lead insight
  if (!signals || signals.length === 0) {
    return '';
  }
  
  // Prioritize: pricing > funding > major product > other
  const pricingSignal = signals.find(s => s.tag === 'PRICING');
  const fundingSignal = signals.find(s => s.tag === 'FUNDING');
  const leadSignal = pricingSignal || fundingSignal || signals[0];
  
  if (!leadSignal) return '';
  
  return `
    <tr>
      <td style="padding:24px 32px;background:#f8fafc;border-bottom:1px solid #eee;">
        <p style="margin:0 0 8px;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:0.5px;">Today's Insight</p>
        <p style="margin:0;font-size:16px;color:#111;line-height:1.5;">
          <strong>${escapeHtml(leadSignal.company)}</strong> — ${escapeHtml(leadSignal.description)}
          ${leadSignal.implication ? `<br><em style="color:#666;">${escapeHtml(leadSignal.implication)}</em>` : ''}
        </p>
      </td>
    </tr>`;
}

function generateEmail() {
  const today = new Date().toISOString().split('T')[0];
  
  // Collect all data sources
  const signals = [];
  const hiring = [];
  const news = [];
  let momentum = [];
  
  // Load momentum scores from history (last entry)
  const momentumHistory = loadData('momentum-history.json');
  if (momentumHistory && Array.isArray(momentumHistory) && momentumHistory.length > 0) {
    const latest = momentumHistory[momentumHistory.length - 1];
    if (latest.scores) {
      const previous = momentumHistory.length > 1 ? momentumHistory[momentumHistory.length - 2].scores : {};
      momentum = Object.entries(latest.scores)
        .map(([slug, score]) => ({
          name: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/([A-Z])/g, ' $1'),
          score: typeof score === 'object' ? score.total || 0 : score,
          change: previous[slug] ? (typeof score === 'object' ? score.total : score) - (typeof previous[slug] === 'object' ? previous[slug].total : previous[slug]) : 0
        }))
        .filter(m => m.score > 0 || m.change !== 0)
        .sort((a, b) => b.score - a.score);
    }
  }
  
  // Load pricing data
  const pricing = loadData('pricing-history.json') || loadData('pricing.json');
  if (pricing && typeof pricing === 'object') {
    const entries = Array.isArray(pricing) ? [] : Object.entries(pricing);
    entries.forEach(([company, data]) => {
      if (data && data.changed) {
        signals.push({
          company: data.name || company,
          tag: 'PRICING',
          description: data.changeDescription || 'Pricing page updated',
          implication: data.implication || null,
          link: data.pricingUrl || data.url
        });
      }
    });
  }
  
  // Load jobs data - try dated file first
  const jobs = loadLatestData('jobs');
  if (jobs && typeof jobs === 'object') {
    Object.entries(jobs)
      .filter(([_, data]) => data && (data.total > 0 || data.estimatedCount > 0))
      .sort((a, b) => (b[1].total || b[1].estimatedCount || 0) - (a[1].total || a[1].estimatedCount || 0))
      .forEach(([slug, data]) => {
        const roles = data.total || data.estimatedCount || 0;
        if (roles > 0) {
          hiring.push({
            company: data.company || data.name || slug,
            roles,
            change: data.change || null,
            link: data.careersUrl
          });
          
          // Add to signals if notably large
          if (roles >= 50) {
            signals.push({
              company: data.company || data.name || slug,
              tag: 'HIRING',
              description: `Aggressively hiring with ${roles}+ open roles`,
              link: data.careersUrl
            });
          }
        }
      });
  }
  
  // Load news data
  const newsData = loadData('news.json');
  if (newsData) {
    const articles = newsData.articles || newsData.newArticles || newsData.allRelevantArticles || [];
    articles.slice(0, 5).forEach(a => {
      // Decode HTML entities in title
      const title = (a.title || '')
        .replace(/&amp;/g, '&')
        .replace(/&#039;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      news.push({
        title,
        source: a.source,
        link: a.url || a.link
      });
    });
  }
  
  // Load funding data
  const fundingData = loadData('funding-latest.json');
  if (fundingData && fundingData.funding) {
    fundingData.funding.slice(0, 3).forEach(f => {
      signals.push({
        company: f.competitor,
        tag: 'FUNDING',
        description: truncate(f.title, 100),
        link: f.url
      });
    });
  }
  
  // Load HN mentions
  const hnData = loadData('hn-mentions.json');
  if (hnData && hnData.topStories) {
    hnData.topStories.filter(s => s.score > 50).slice(0, 2).forEach(story => {
      signals.push({
        company: story.tool || 'AI Coding',
        tag: 'NEWS',
        description: `Trending on HN: "${truncate(story.title, 60)}"`,
        link: `https://news.ycombinator.com/item?id=${story.id}`
      });
    });
  }
  
  // Load chrome/vscode marketplace changes
  const chromeData = loadData('chrome-webstore-latest.json');
  if (chromeData && chromeData.changes && chromeData.changes.length > 0) {
    chromeData.changes.slice(0, 2).forEach(c => {
      signals.push({
        company: c.extension || c.competitor,
        tag: 'PRODUCT',
        description: c.change,
        link: null
      });
    });
  }
  
  const vscodeData = loadData('vscode-marketplace-latest.json');
  if (vscodeData && vscodeData.changes && vscodeData.changes.length > 0) {
    vscodeData.changes.slice(0, 2).forEach(c => {
      signals.push({
        company: c.extension || c.name,
        tag: 'PRODUCT',
        description: c.change,
        link: null
      });
    });
  }
  
  // Build HTML
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background:#0a0a0a;padding:24px 32px;">
              <span style="color:#fff;font-size:18px;font-weight:600;">⚡ Briefing</span>
              <span style="color:#666;font-size:14px;float:right;">${formatDate()}</span>
            </td>
          </tr>
          
          <!-- Lead Insight -->
          ${generateLeadInsight(signals, momentum)}
          
          <!-- Key Signals -->
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #eee;">
              <h2 style="margin:0 0 16px;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;color:#666;">Signals</h2>
              ${generateSignalsSection(signals.slice(0, 6))}
            </td>
          </tr>
          
          <!-- Momentum Rankings -->
          ${generateMomentumSection(momentum)}
          
          <!-- Hiring -->
          ${generateHiringSection(hiring)}
          
          <!-- News -->
          ${generateNewsSection(news)}
          
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background:#fafafa;text-align:center;">
              <p style="margin:0 0 8px;color:#666;font-size:13px;">
                <a href="https://kell.cx/data/" style="color:#3b82f6;text-decoration:none;">All Data</a> · 
                <a href="https://kell.cx/leaderboard" style="color:#3b82f6;text-decoration:none;">Leaderboard</a> · 
                <a href="https://kell.cx/dashboard" style="color:#3b82f6;text-decoration:none;">Dashboard</a>
              </p>
              <p style="margin:0;color:#999;font-size:12px;">
                <a href="https://kell.cx" style="color:#999;text-decoration:none;">kell.cx</a> · 
                <a href="https://kell.cx/unsubscribe" style="color:#999;text-decoration:none;">Unsubscribe</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Generate plain text fallback
  const text = `Briefing - ${formatDate()}

${signals.length > 0 ? 'KEY SIGNALS:\n' + signals.slice(0, 5).map(s => `• ${s.company}: ${s.description}`).join('\n') + '\n\n' : ''}
${momentum.length > 0 ? 'MOMENTUM:\n' + momentum.slice(0, 5).map((m, i) => `${i + 1}. ${m.name} (${m.score})`).join('\n') + '\n\n' : ''}
${hiring.length > 0 ? 'HIRING:\n' + hiring.slice(0, 5).map(h => `• ${h.company}: ${h.roles} roles`).join('\n') + '\n\n' : ''}
${news.length > 0 ? 'NEWS:\n' + news.slice(0, 3).map(n => `• ${n.title} — ${n.source}`).join('\n') + '\n\n' : ''}
---
https://kell.cx`;

  // Save output
  const outputFile = path.join(OUTPUT_DIR, `briefing-${today}.html`);
  fs.writeFileSync(outputFile, html);
  
  console.log(`Generated: ${outputFile}`);
  console.log(`Signals: ${signals.length}`);
  console.log(`Momentum: ${momentum.length}`);
  console.log(`Hiring: ${hiring.length}`);
  console.log(`News: ${news.length}`);
  
  return { 
    html, 
    text,
    outputFile,
    subject: `Briefing - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    stats: { signals: signals.length, momentum: momentum.length, hiring: hiring.length, news: news.length }
  };
}

// Export for use by other scripts
module.exports = { generateEmail };

// CLI usage
if (require.main === module) {
  const result = generateEmail();
  if (process.argv.includes('--output')) {
    console.log('\n--- HTML ---');
    console.log(result.html);
  }
}
