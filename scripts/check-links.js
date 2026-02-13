#!/usr/bin/env node
/**
 * Link checker for kell.cx static site
 * Validates all internal links before deploy
 */

const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, '..', 'site');

// Collect all HTML files
function getHtmlFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('_next')) {
      getHtmlFiles(fullPath, files);
    } else if (entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Extract internal links from HTML
function extractLinks(html) {
  const linkRegex = /href="(\/[^"#?]*)["#?]/g;
  const links = new Set();
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    links.add(match[1]);
  }
  return Array.from(links);
}

// Check if a path exists as file or directory with index
function pathExists(linkPath) {
  const fullPath = path.join(SITE_DIR, linkPath);
  
  // Direct file
  if (fs.existsSync(fullPath)) return true;
  
  // With .html extension
  if (fs.existsSync(fullPath + '.html')) return true;
  
  // Directory with index.html
  if (fs.existsSync(path.join(fullPath, 'index.html'))) return true;
  
  return false;
}

// Main
function main() {
  console.log('🔗 Checking internal links in', SITE_DIR);
  
  const htmlFiles = getHtmlFiles(SITE_DIR);
  console.log(`Found ${htmlFiles.length} HTML files\n`);
  
  const allLinks = new Map(); // link -> [source files]
  const brokenLinks = [];
  
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf-8');
    const links = extractLinks(html);
    const relPath = path.relative(SITE_DIR, file);
    
    for (const link of links) {
      if (!allLinks.has(link)) {
        allLinks.set(link, []);
      }
      allLinks.get(link).push(relPath);
    }
  }
  
  // Check each unique link
  for (const [link, sources] of allLinks) {
    if (!pathExists(link)) {
      brokenLinks.push({ link, sources });
    }
  }
  
  // Report
  if (brokenLinks.length === 0) {
    console.log('✅ All', allLinks.size, 'internal links are valid!\n');
    process.exit(0);
  } else {
    console.log('❌ Found', brokenLinks.length, 'broken links:\n');
    for (const { link, sources } of brokenLinks) {
      console.log(`  ${link}`);
      console.log(`    Referenced in: ${sources.slice(0, 3).join(', ')}${sources.length > 3 ? ` (+${sources.length - 3} more)` : ''}`);
    }
    console.log('\n');
    process.exit(1);
  }
}

main();
