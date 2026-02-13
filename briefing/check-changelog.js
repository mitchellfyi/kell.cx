#!/usr/bin/env node
/**
 * Check competitor changelogs for updates
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : require('http');
    client.get(url, { 
      headers: { 'User-Agent': 'Briefing/1.0' },
      timeout: 10000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function checkCursorChangelog() {
  console.log('Checking Cursor changelog...');
  try {
    const html = await fetchPage('https://cursor.com/changelog');
    
    // Extract changelog entries (look for date patterns and headings)
    const entries = [];
    const datePattern = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/gi;
    const dates = html.match(datePattern) || [];
    
    console.log(`Found ${dates.length} changelog dates`);
    if (dates.length > 0) {
      console.log(`Latest: ${dates[0]}`);
    }
    
    return { source: 'cursor', dates: dates.slice(0, 5) };
  } catch (e) {
    console.log(`Error: ${e.message}`);
    return { source: 'cursor', error: e.message };
  }
}

async function checkReplitBlog() {
  console.log('Checking Replit blog...');
  try {
    const html = await fetchPage('https://blog.replit.com');
    
    // Look for article titles
    const titles = html.match(/<h[23][^>]*>([^<]+)<\/h[23]>/gi) || [];
    console.log(`Found ${titles.length} blog headings`);
    
    return { source: 'replit', titles: titles.slice(0, 3) };
  } catch (e) {
    console.log(`Error: ${e.message}`);
    return { source: 'replit', error: e.message };
  }
}

async function main() {
  const results = await Promise.all([
    checkCursorChangelog(),
    checkReplitBlog()
  ]);
  
  console.log('\n--- Summary ---');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
