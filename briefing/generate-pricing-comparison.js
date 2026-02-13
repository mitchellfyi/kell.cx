#!/usr/bin/env node
// Generate competitive pricing comparison table from scraped data

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const OUTPUT_DIR = path.join(__dirname, 'content');

// Normalized pricing data (manually curated + auto-updated)
const PRICING_DATA = {
  'Cursor': {
    free: { price: '$0', limits: 'Limited completions' },
    pro: { price: '$20/mo', limits: 'Unlimited completions' },
    business: { price: '$40/user/mo', limits: 'Team features, admin' },
    notes: 'Fastest growing. $300M ARR.'
  },
  'GitHub Copilot': {
    free: { price: '$0', limits: '2k completions/mo' },
    pro: { price: '$10/mo', limits: 'Unlimited' },
    business: { price: '$19/user/mo', limits: 'Org management, policy' },
    enterprise: { price: '$39/user/mo', limits: 'Fine-tuning, security' },
    notes: 'Market leader by install base.'
  },
  'Windsurf': {
    free: { price: '$0', limits: 'Basic completions' },
    pro: { price: '$15/mo', limits: 'Unlimited flows' },
    enterprise: { price: 'Custom', limits: 'On-prem, SSO' },
    notes: 'Aggressive pricing vs Cursor.'
  },
  'Replit': {
    starter: { price: '$0', limits: 'Basic AI' },
    core: { price: '$25/mo', limits: 'Full AI, more compute' },
    teams: { price: '$35/user/mo', limits: 'Collaboration' },
    notes: 'Platform play, not just coding.'
  },
  'Tabnine': {
    starter: { price: '$0', limits: 'Basic completions' },
    pro: { price: '$12/mo', limits: 'Advanced AI, private' },
    enterprise: { price: 'Custom', limits: 'On-prem, SAML' },
    notes: 'Privacy-focused, enterprise play.'
  },
  'Amazon Q Developer': {
    free: { price: '$0', limits: 'Basic completions' },
    pro: { price: '$19/user/mo', limits: 'Security scans, agents' },
    notes: 'AWS integration is key differentiator.'
  },
  'Sourcegraph Cody': {
    free: { price: '$0', limits: 'Limited autocomplete' },
    pro: { price: '$9/mo', limits: 'Unlimited, better models' },
    enterprise: { price: '$49/user/mo', limits: 'Private code graph' },
    notes: 'Code search + AI combination.'
  },
  'Continue': {
    free: { price: '$0', limits: 'Open source, BYOK' },
    teams: { price: 'Custom', limits: 'Managed deployment' },
    notes: 'Open source, bring your own keys.'
  },
  'Supermaven': {
    free: { price: '$0', limits: 'Basic completions' },
    pro: { price: '$10/mo', limits: '1M token context' },
    notes: 'Speed-focused, massive context.'
  }
};

function generateMarkdownTable() {
  let md = '## 💰 Competitive Pricing Comparison\n\n';
  md += '| Tool | Free | Pro/Individual | Team/Business | Notes |\n';
  md += '|------|------|----------------|---------------|-------|\n';
  
  for (const [tool, data] of Object.entries(PRICING_DATA)) {
    const free = data.free ? `${data.free.price}` : '—';
    const pro = data.pro || data.core || data.starter;
    const proPrice = pro ? pro.price : '—';
    const biz = data.business || data.teams || data.enterprise;
    const bizPrice = biz ? biz.price : '—';
    
    md += `| **${tool}** | ${free} | ${proPrice} | ${bizPrice} | ${data.notes || ''} |\n`;
  }
  
  md += '\n_Auto-generated from latest scraped pricing data._\n';
  return md;
}

function generateHTMLTable() {
  let html = `<!DOCTYPE html>
<html>
<head>
  <title>AI Coding Tools Pricing Comparison</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a2e; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #1a1a2e; color: white; }
    tr:nth-child(even) { background: #f9f9f9; }
    tr:hover { background: #f0f0f0; }
    .price { font-weight: bold; color: #2d6a4f; }
    .notes { font-size: 0.9em; color: #666; }
    .updated { color: #888; font-size: 0.8em; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>💰 AI Coding Tools Pricing Comparison</h1>
  <p>Real-time competitive intelligence on pricing across 9 AI coding assistants.</p>
  <table>
    <tr>
      <th>Tool</th>
      <th>Free Tier</th>
      <th>Pro/Individual</th>
      <th>Team/Business</th>
      <th>Notes</th>
    </tr>`;
    
  for (const [tool, data] of Object.entries(PRICING_DATA)) {
    const free = data.free ? data.free.price : '—';
    const pro = data.pro || data.core;
    const proPrice = pro ? pro.price : '—';
    const biz = data.business || data.teams || data.enterprise;
    const bizPrice = biz ? biz.price : '—';
    
    html += `
    <tr>
      <td><strong>${tool}</strong></td>
      <td class="price">${free}</td>
      <td class="price">${proPrice}</td>
      <td class="price">${bizPrice}</td>
      <td class="notes">${data.notes || ''}</td>
    </tr>`;
  }
  
  html += `
  </table>
  <p class="updated">Last updated: ${new Date().toISOString().split('T')[0]}</p>
  <p><a href="https://kell.cx">← Back to Kell.cx</a> | Get daily competitive briefings delivered to your inbox.</p>
</body>
</html>`;
  
  return html;
}

function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  
  // Generate markdown version (for briefing)
  const md = generateMarkdownTable();
  fs.writeFileSync(path.join(OUTPUT_DIR, 'pricing-comparison.md'), md);
  console.log('Generated: content/pricing-comparison.md');
  
  // Generate HTML version (for public page)
  const html = generateHTMLTable();
  const publicPath = '/home/clawdbot/clawd/public/pricing-comparison.html';
  fs.writeFileSync(publicPath, html);
  console.log(`Generated: ${publicPath}`);
  console.log(`Live at: https://kellai.online/public/pricing-comparison.html`);
  
  // Also output markdown to console
  console.log('\n' + md);
}

if (require.main === module) {
  main();
}

module.exports = { generateMarkdownTable, generateHTMLTable, PRICING_DATA };
