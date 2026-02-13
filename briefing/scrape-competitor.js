#!/usr/bin/env node
/**
 * Scrape competitor data for Briefing MVP
 * Usage: node scrape-competitor.js <company-slug>
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const COMPETITORS = {
  cursor: {
    name: 'Cursor',
    website: 'https://cursor.com',
    twitter: 'cursor_ai',
    github: 'getcursor',
    changelog: 'https://cursor.com/changelog',
  },
  cognition: {
    name: 'Devin (Cognition)',
    website: 'https://cognition.ai',
    twitter: 'cognaboratory',
    linkedin: 'cognition-ai',
  },
  replit: {
    name: 'Replit',
    website: 'https://replit.com',
    twitter: 'relorit',
    github: 'replit',
    blog: 'https://blog.replit.com',
  }
};

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Briefing/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function scrapeCompetitor(slug) {
  const competitor = COMPETITORS[slug];
  if (!competitor) {
    console.error(`Unknown competitor: ${slug}`);
    process.exit(1);
  }

  console.log(`Scraping ${competitor.name}...`);
  
  const result = {
    slug,
    name: competitor.name,
    scrapedAt: new Date().toISOString(),
    website: {},
    social: {},
    changes: []
  };

  // Fetch main website
  try {
    const html = await fetchPage(competitor.website);
    result.website.title = html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
    result.website.description = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i)?.[1] || '';
    console.log(`  Website: ${result.website.title}`);
  } catch (e) {
    console.log(`  Website fetch failed: ${e.message}`);
  }

  // Save result
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  
  const outPath = path.join(dataDir, `${slug}-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Saved to ${outPath}`);
  
  return result;
}

const slug = process.argv[2] || 'cursor';
scrapeCompetitor(slug).catch(console.error);
