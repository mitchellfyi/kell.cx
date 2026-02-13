#!/usr/bin/env node
/**
 * kell.cx Site Audit Script
 * 
 * Checks all pages for consistency and issues.
 * Run: node audit-site.js
 */

const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, '..', 'site');
const SPEC = {
  requiredNavLinks: ['/about.html', '/blog.html', '/data/', '/pricing.html'],
  requiredClasses: ['nav-logo', 'nav-links'],
  requiredElements: ['<footer', '</footer>'],
  mobileBreakpoint: '@media',
  colors: {
    background: '#0a0a0a',
    text: '#fafafa'
  }
};

function getAllHtmlFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'archive') {
      getAllHtmlFiles(fullPath, files);
    } else if (item.endsWith('.html') && !item.startsWith('_')) {
      files.push(fullPath);
    }
  }
  return files;
}

function auditFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const relativePath = path.relative(SITE_DIR, filepath);
  const issues = [];
  const warnings = [];
  
  // Skip redirect pages
  if (content.includes('http-equiv="refresh"')) {
    return { path: relativePath, status: 'skip', reason: 'redirect page' };
  }
  
  // Check nav structure
  if (!content.includes('class="nav-logo"')) {
    issues.push('Missing nav-logo class');
  }
  if (!content.includes('class="nav-links"')) {
    issues.push('Missing nav-links class');
  }
  
  // Check nav links
  for (const link of SPEC.requiredNavLinks) {
    if (!content.includes(`href="${link}"`)) {
      issues.push(`Missing nav link: ${link}`);
    }
  }
  
  // Check footer
  if (!content.includes('<footer')) {
    issues.push('Missing footer element');
  }
  
  // Check mobile styles
  if (!content.includes('@media')) {
    warnings.push('No @media queries (may not be mobile responsive)');
  }
  
  // Check color consistency
  if (!content.includes('#0a0a0a') && !content.includes('background:#0a0a0a')) {
    warnings.push('May not use standard background color #0a0a0a');
  }
  
  // Check for broken links to old pages
  const oldLinks = ['/dashboard.html', '/leaderboard.html'];
  // These are now valid, so don't check
  
  // Check title
  if (!content.includes('<title>')) {
    issues.push('Missing <title> tag');
  }
  
  // Check meta description
  if (!content.includes('name="description"')) {
    warnings.push('Missing meta description');
  }
  
  return {
    path: relativePath,
    status: issues.length > 0 ? 'FAIL' : (warnings.length > 0 ? 'WARN' : 'PASS'),
    issues,
    warnings
  };
}

function runAudit() {
  console.log('🔍 kell.cx Site Audit\n');
  console.log('='.repeat(60));
  
  const files = getAllHtmlFiles(SITE_DIR);
  const results = files.map(auditFile);
  
  let passed = 0, failed = 0, warned = 0, skipped = 0;
  
  for (const result of results) {
    if (result.status === 'skip') {
      skipped++;
      continue;
    }
    
    const icon = result.status === 'PASS' ? '✅' : (result.status === 'WARN' ? '⚠️' : '❌');
    console.log(`\n${icon} ${result.path}`);
    
    if (result.status === 'PASS') {
      passed++;
    } else if (result.status === 'WARN') {
      warned++;
      result.warnings.forEach(w => console.log(`   ⚠️  ${w}`));
    } else {
      failed++;
      result.issues.forEach(i => console.log(`   ❌ ${i}`));
      result.warnings.forEach(w => console.log(`   ⚠️  ${w}`));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Summary: ${passed} passed, ${warned} warnings, ${failed} failed, ${skipped} skipped`);
  console.log(`   Total pages: ${files.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Audit FAILED - fix issues above');
    process.exit(1);
  } else if (warned > 0) {
    console.log('\n⚠️  Audit PASSED with warnings');
  } else {
    console.log('\n✅ Audit PASSED - all pages consistent');
  }
}

runAudit();
