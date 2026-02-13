#!/usr/bin/env node
/**
 * Inject Recent Signals into Data Dashboard
 * 
 * Reads latest-news.json and injects the top signals into the dashboard HTML
 * as a "Recent Signals" section. Shows real-time activity across all sources.
 */

const fs = require('fs');
const path = require('path');

const LATEST_NEWS = path.join(__dirname, '..', 'data', 'latest-news.json');
const DASHBOARD_HTML = path.join(__dirname, '..', 'site', 'data', 'index.html');
const MAX_SIGNALS = 10;

function formatTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getSourceIcon(source) {
  const icons = {
    'hackernews': '🔶',
    'github-releases': '📦',
    'anthropic-news': '🤖',
    'producthunt': '🚀',
    'rss': '📰'
  };
  return icons[source] || '📌';
}

function buildSignalsHtml(signals) {
  const rows = signals.slice(0, MAX_SIGNALS).map(signal => {
    const icon = getSourceIcon(signal.source);
    const title = escapeHtml(signal.title.slice(0, 80) + (signal.title.length > 80 ? '...' : ''));
    const time = formatTimeAgo(signal.date);
    const source = signal.source.replace('-', ' ');
    
    return `
                    <tr>
                        <td>${icon}</td>
                        <td><a href="${signal.url}" style="color:#ccc;text-decoration:none;" target="_blank">${title}</a></td>
                        <td style="color:#666;font-size:0.75rem;">${source}</td>
                        <td style="color:#888;font-size:0.75rem;text-align:right;">${time}</td>
                    </tr>`;
  }).join('\n');

  return `
        <div class="section">
            <div class="section-header">
                <span class="section-title">Recent Signals</span>
                <span style="color:#666;font-size:0.75rem;">Live activity across all sources</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width:2rem;"></th>
                        <th>Signal</th>
                        <th>Source</th>
                        <th style="text-align:right;">When</th>
                    </tr>
                </thead>
                <tbody>
${rows}
                </tbody>
            </table>
        </div>
`;
}

async function main() {
  console.log('Injecting Recent Signals into dashboard...');
  
  // Read latest news
  if (!fs.existsSync(LATEST_NEWS)) {
    console.error('latest-news.json not found');
    process.exit(1);
  }
  
  const newsData = JSON.parse(fs.readFileSync(LATEST_NEWS, 'utf-8'));
  const signals = newsData.recent || [];
  
  if (signals.length === 0) {
    console.log('No signals to inject');
    return;
  }
  
  // Read dashboard HTML
  let html = fs.readFileSync(DASHBOARD_HTML, 'utf-8');
  
  // Remove existing signals section if present
  html = html.replace(/<!-- SIGNALS_START -->[\s\S]*?<!-- SIGNALS_END -->/g, '');
  
  // Build signals HTML
  const signalsHtml = `<!-- SIGNALS_START -->\n${buildSignalsHtml(signals)}\n        <!-- SIGNALS_END -->`;
  
  // Insert before the drill-down grid section
  const insertPoint = html.indexOf('<div class="data-grid">');
  if (insertPoint === -1) {
    console.error('Could not find insertion point in dashboard');
    process.exit(1);
  }
  
  html = html.slice(0, insertPoint) + signalsHtml + '\n        ' + html.slice(insertPoint);
  
  // Update timestamp
  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  html = html.replace(/Last refresh: .*?</, `Last refresh: ${dateStr}<`);
  
  fs.writeFileSync(DASHBOARD_HTML, html);
  console.log(`Injected ${Math.min(signals.length, MAX_SIGNALS)} signals into dashboard`);
}

main().catch(console.error);
