#!/usr/bin/env node
/**
 * Job Posting Detection
 * Scrapes careers pages to detect hiring signals
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CAREERS_PAGES = {
  cursor: {
    name: 'Cursor',
    careers: 'https://cursor.com/careers',
    fallback: 'https://www.cursor.com/careers'
  },
  cognition: {
    name: 'Cognition (Devin)',
    careers: 'https://cognition.ai/careers',
    fallback: 'https://www.cognition.ai/careers'
  },
  replit: {
    name: 'Replit',
    careers: 'https://replit.com/site/careers',
    fallback: 'https://replit.com/careers'
  },
  windsurf: {
    name: 'Codeium (Windsurf)',
    careers: 'https://codeium.com/careers',
    fallback: 'https://codeium.com/about'
  },
  copilot: {
    name: 'GitHub Copilot',
    careers: 'https://github.com/about/careers',
    fallback: 'https://www.github.careers'
  },
  tabnine: {
    name: 'Tabnine',
    careers: 'https://www.tabnine.com/careers',
    fallback: 'https://www.tabnine.com/about'
  },
  amazonq: {
    name: 'Amazon Q Developer',
    careers: 'https://www.amazon.jobs/en/teams/aws-ai',
    fallback: 'https://www.amazon.jobs/en/search?base_query=Q+Developer'
  },
  cody: {
    name: 'Sourcegraph (Cody)',
    careers: 'https://boards.greenhouse.io/sourcegraph91',
    fallback: 'https://sourcegraph.com/jobs'
  },
  continue: {
    name: 'Continue.dev',
    careers: 'https://continue.dev/careers',
    fallback: 'https://github.com/continuedev/continue' // Open source, check contributors
  },
  supermaven: {
    name: 'Supermaven',
    careers: 'https://supermaven.com/careers',
    fallback: 'https://supermaven.com/about'
  },
  augment: {
    name: 'Augment Code',
    careers: 'https://www.augmentcode.com/careers',
    fallback: 'https://www.augmentcode.com/about'
  },
  lovable: {
    name: 'Lovable',
    careers: 'https://lovable.dev/careers',
    fallback: 'https://lovable.dev/about'
  },
  poolside: {
    name: 'Poolside',
    careers: 'https://poolside.ai/careers',
    fallback: 'https://poolside.ai/about'
  },
  bolt: {
    name: 'Bolt (StackBlitz)',
    careers: 'https://stackblitz.com/careers',
    fallback: 'https://stackblitz.com/about'
  },
  v0: {
    name: 'v0 (Vercel)',
    careers: 'https://vercel.com/careers',
    fallback: 'https://vercel.com/about'
  }
};

// Common job-related keywords
const JOB_PATTERNS = [
  /engineer/gi,
  /developer/gi,
  /designer/gi,
  /product\s*manager/gi,
  /sales/gi,
  /marketing/gi,
  /research/gi,
  /ml|machine\s*learning/gi,
  /ai|artificial\s*intelligence/gi,
  /infrastructure/gi,
  /platform/gi,
  /senior/gi,
  /staff/gi,
  /lead/gi,
  /director/gi,
  /vp|vice\s*president/gi
];

// Categories to classify roles
const ROLE_CATEGORIES = {
  'Engineering': [/engineer/i, /developer/i, /swe/i, /infrastructure/i, /platform/i, /backend/i, /frontend/i, /fullstack/i],
  'AI/ML': [/ml\b/i, /machine\s*learning/i, /\bai\b/i, /research/i, /data\s*scientist/i],
  'Product': [/product/i, /design/i, /ux/i, /ui/i],
  'Go-to-Market': [/sales/i, /marketing/i, /growth/i, /business\s*dev/i, /partnerships/i],
  'Operations': [/operations/i, /people/i, /hr/i, /finance/i, /legal/i, /recruiting/i]
};

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : require('http');
    const req = client.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const newUrl = res.headers.location.startsWith('http') 
          ? res.headers.location 
          : new URL(res.headers.location, url).href;
        return fetchPage(newUrl).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function extractJobTitles(html) {
  const titles = new Set();
  
  // Common patterns for job listings
  const patterns = [
    // href with job-related paths
    /<a[^>]*href="[^"]*(?:job|career|position|role)[^"]*"[^>]*>([^<]+)</gi,
    // Common job list item patterns
    /<(?:h[1-6]|li|div|span)[^>]*class="[^"]*(?:job|role|position|opening)[^"]*"[^>]*>([^<]+)</gi,
    // Links with title attributes
    /<a[^>]*title="([^"]+)"[^>]*>.*?(?:apply|view|learn more)/gi,
    // List items that look like job titles
    /<li[^>]*>([^<]*(?:Engineer|Designer|Manager|Lead|Director|Specialist)[^<]*)</gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const title = match[1].trim().replace(/\s+/g, ' ');
      if (title.length > 3 && title.length < 100 && !title.includes('<')) {
        titles.add(title);
      }
    }
  }

  // Also try to find structured job data
  const structuredMatch = html.match(/application\/ld\+json[^>]*>([^<]+)</);
  if (structuredMatch) {
    try {
      const data = JSON.parse(structuredMatch[1]);
      if (data.jobPosting || data['@type'] === 'JobPosting') {
        titles.add(data.title || data.name);
      }
    } catch (e) {}
  }

  return Array.from(titles).filter(t => {
    // Filter to likely job titles
    return JOB_PATTERNS.some(p => p.test(t));
  });
}

function categorizeRoles(titles) {
  const categorized = {};
  
  for (const title of titles) {
    for (const [category, patterns] of Object.entries(ROLE_CATEGORIES)) {
      if (patterns.some(p => p.test(title))) {
        if (!categorized[category]) categorized[category] = [];
        categorized[category].push(title);
        break;
      }
    }
  }
  
  return categorized;
}

function estimateJobCount(html) {
  // Try to count job-related elements
  const jobElements = html.match(/<(?:li|div|article)[^>]*class="[^"]*(?:job|role|position|opening)[^"]*"/gi) || [];
  const applyButtons = html.match(/apply\s*(?:now|today)?/gi) || [];
  
  // Look for explicit counts
  const countMatch = html.match(/(\d+)\s*(?:open|available)?\s*(?:positions?|jobs?|roles?|openings?)/i);
  if (countMatch) {
    return parseInt(countMatch[1], 10);
  }
  
  return Math.max(jobElements.length, Math.floor(applyButtons.length / 2));
}

async function scrapeJobs(slug) {
  const config = CAREERS_PAGES[slug];
  if (!config) return null;

  const result = {
    company: config.name,
    scrapedAt: new Date().toISOString(),
    careersUrl: config.careers,
    status: 'unknown',
    estimatedCount: 0,
    roles: [],
    categories: {},
    signals: []
  };

  try {
    let html;
    try {
      html = await fetchPage(config.careers);
    } catch (e) {
      if (config.fallback) {
        html = await fetchPage(config.fallback);
        result.careersUrl = config.fallback;
      } else {
        throw e;
      }
    }

    result.status = 'active';
    result.roles = extractJobTitles(html);
    result.categories = categorizeRoles(result.roles);
    result.estimatedCount = Math.max(result.roles.length, estimateJobCount(html));

    // Generate signals
    if (result.estimatedCount > 10) {
      result.signals.push(`Heavy hiring: ${result.estimatedCount}+ open roles`);
    }
    
    const categoryKeys = Object.keys(result.categories);
    if (result.categories['AI/ML']?.length > 2) {
      result.signals.push('Ramping up AI/ML team');
    }
    if (result.categories['Go-to-Market']?.length > 2) {
      result.signals.push('Scaling go-to-market');
    }
    if (result.categories['Engineering']?.length > 5) {
      result.signals.push('Major engineering expansion');
    }

  } catch (e) {
    result.status = 'error';
    result.error = e.message;
  }

  return result;
}

async function scrapeAllJobs() {
  const results = {};
  
  for (const slug of Object.keys(CAREERS_PAGES)) {
    console.log(`📋 Checking ${CAREERS_PAGES[slug].name}...`);
    results[slug] = await scrapeJobs(slug);
    if (results[slug].status === 'active') {
      console.log(`   → ${results[slug].estimatedCount} roles detected`);
      if (results[slug].signals.length > 0) {
        results[slug].signals.forEach(s => console.log(`   🔔 ${s}`));
      }
    } else {
      console.log(`   → ${results[slug].error || 'No data'}`);
    }
  }

  // Save to data dir
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  
  const outPath = path.join(dataDir, `jobs-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  
  return results;
}

// Export for use in daily-briefing.js
module.exports = { scrapeJobs, scrapeAllJobs, CAREERS_PAGES };

// Run if called directly
if (require.main === module) {
  scrapeAllJobs()
    .then(results => {
      console.log('\n✅ Job scan complete');
    })
    .catch(console.error);
}
