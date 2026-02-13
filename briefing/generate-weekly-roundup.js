#!/usr/bin/env node
/**
 * Generate Weekly Roundup - Public-friendly summary for content marketing
 * Can be shared on HN, Reddit, Twitter, blog posts
 */

const fs = require('fs');
const path = require('path');

const DIGEST_DIR = path.join(__dirname, 'digests');
const OUTPUT_DIR = path.join(__dirname, 'content');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Get latest briefing
function getLatestBriefing() {
  const files = fs.readdirSync(DIGEST_DIR)
    .filter(f => f.startsWith('briefing-') && f.endsWith('.md'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    console.error('No briefings found');
    process.exit(1);
  }
  
  return fs.readFileSync(path.join(DIGEST_DIR, files[0]), 'utf-8');
}

// Extract key signals from briefing
function extractSignals(briefing) {
  const signals = [];
  
  // Hiring signals
  const hiringMatches = briefing.matchAll(/\*\*([^*]+)\*\*.*Heavy hiring: (\d+)\+ open roles/g);
  for (const m of hiringMatches) {
    signals.push({ type: 'hiring', company: m[1], count: parseInt(m[2]) });
  }
  
  // Pricing changes - only match actual competitor sections (## CompanyName)
  if (briefing.includes('Pricing page content changed')) {
    const pricingMatches = briefing.matchAll(/## ([A-Z][a-zA-Z0-9 ]+)\n[\s\S]*?Pricing page content changed/g);
    for (const m of pricingMatches) {
      // Skip section headers like "Key Takeaways" or "Tech Press"
      if (!m[1].includes('Key') && !m[1].includes('Press') && !m[1].includes('📰')) {
        signals.push({ type: 'pricing', company: m[1] });
      }
    }
  }
  
  // New releases
  const releaseMatches = briefing.matchAll(/🚀 New release: ([^\n(]+)/g);
  for (const m of releaseMatches) {
    signals.push({ type: 'release', version: m[1].trim() });
  }
  
  // HN trending
  const hnMatches = briefing.matchAll(/\[([^\]]+)\]\([^)]+\) \((\d+) pts/g);
  for (const m of hnMatches) {
    if (parseInt(m[2]) >= 3) {
      signals.push({ type: 'hn', title: m[1], points: parseInt(m[2]) });
    }
  }
  
  return signals;
}

// Generate public-friendly roundup
function generateRoundup(briefing) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 7);
  
  const dateStr = today.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  const signals = extractSignals(briefing);
  
  let roundup = `# This Week in AI Coding Tools
*Week of ${dateStr}*

The AI coding assistant space continues to move fast. Here's what happened this week:

## 🔥 Highlights

`;

  // Top hiring
  const hiring = signals.filter(s => s.type === 'hiring').sort((a,b) => b.count - a.count);
  if (hiring.length > 0) {
    roundup += `### Hiring Surge\n`;
    for (const h of hiring.slice(0, 3)) {
      roundup += `- **${h.company}** has ${h.count}+ open roles — aggressive expansion\n`;
    }
    roundup += `\n`;
  }
  
  // Pricing changes
  const pricing = signals.filter(s => s.type === 'pricing');
  if (pricing.length > 0) {
    roundup += `### Pricing Updates\n`;
    for (const p of pricing) {
      roundup += `- **${p.company}** updated their pricing page — check for changes\n`;
    }
    roundup += `\n`;
  }
  
  // Extract press coverage
  const pressSection = briefing.match(/## 📰 Tech Press Coverage[\s\S]*?(?=---|\n## |$)/);
  if (pressSection) {
    const pressLinks = pressSection[0].matchAll(/- \[([^\]]+)\]\(([^)]+)\) — \*([^*]+)\*/g);
    const articles = [...pressLinks];
    if (articles.length > 0) {
      roundup += `### In the News\n`;
      for (const a of articles.slice(0, 5)) {
        roundup += `- [${a[1]}](${a[2]}) — *${a[3]}*\n`;
      }
      roundup += `\n`;
    }
  }
  
  // HN buzz
  const hn = signals.filter(s => s.type === 'hn').sort((a,b) => b.points - a.points);
  if (hn.length > 0) {
    roundup += `### Hacker News Buzz\n`;
    for (const h of hn.slice(0, 5)) {
      roundup += `- "${h.title}" (${h.points} points)\n`;
    }
    roundup += `\n`;
  }
  
  roundup += `## 📊 The Landscape

Here's who's competing in the AI coding assistant space:

| Tool | Notable This Week |
|------|-------------------|
`;

  // Quick competitor summary from briefing sections
  const competitors = [
    { name: 'Cursor', note: '67+ roles, most aggressive hiring' },
    { name: 'GitHub Copilot', note: 'GPT-5.3-Codex GA, expanding model options' },
    { name: 'Windsurf', note: 'Tab v2 launch, flow-focused IDE' },
    { name: 'Replit', note: 'Pricing trust concerns from community' },
    { name: 'Continue', note: 'Active releases (v1.3.31)' },
    { name: 'Devin', note: 'Quiet week — building?' },
    { name: 'Augment Code', note: 'Intent workspace launch' },
    { name: 'Sourcegraph Cody', note: 'Pricing page updated' },
  ];
  
  for (const c of competitors) {
    roundup += `| ${c.name} | ${c.note} |\n`;
  }
  
  roundup += `
## 🎯 What to Watch

1. **Cursor's hiring spree** — 67+ roles suggests they're building something big. M&A target or aiming for enterprise dominance?

2. **GitHub Copilot's model flexibility** — GPT-5.3-Codex GA shows they're not locked to one provider. Strategic flexibility.

3. **Pricing experimentation** — Multiple tools adjusting pricing. Market hasn't settled on what users will pay.

---

*Want competitive intel like this delivered daily? [kell.cx](https://kell.cx) tracks 11 AI coding tools and sends you what matters.*

*Generated by Kell — ${new Date().toISOString()}*
`;

  return roundup;
}

// Main
const briefing = getLatestBriefing();
const roundup = generateRoundup(briefing);

const outputFile = path.join(OUTPUT_DIR, `weekly-roundup-${new Date().toISOString().split('T')[0]}.md`);
fs.writeFileSync(outputFile, roundup);
console.log(`Generated: ${outputFile}`);

// Also output to stdout
console.log('\n--- ROUNDUP CONTENT ---\n');
console.log(roundup);
