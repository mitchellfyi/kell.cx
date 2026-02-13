#!/usr/bin/env node
/**
 * Google Trends Monitoring
 * Tracks search interest over time for competitor keywords
 * Uses Google Trends embed API (no auth required)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const COMPETITORS = [
  { name: 'Cursor', keywords: ['cursor ai', 'cursor editor', 'cursor ide'] },
  { name: 'Devin', keywords: ['devin ai', 'cognition ai', 'devin coding'] },
  { name: 'Replit', keywords: ['replit ai', 'replit ghostwriter'] },
  { name: 'Windsurf', keywords: ['windsurf ai', 'codeium windsurf'] },
  { name: 'GitHub Copilot', keywords: ['github copilot', 'copilot ai'] },
  { name: 'Tabnine', keywords: ['tabnine', 'tabnine ai'] },
  { name: 'Amazon Q', keywords: ['amazon q developer', 'aws codewhisperer'] },
  { name: 'Sourcegraph Cody', keywords: ['sourcegraph cody', 'cody ai'] },
  { name: 'Claude Code', keywords: ['claude code', 'anthropic claude code'] },
  { name: 'Lovable', keywords: ['lovable ai', 'lovable dev'] },
  { name: 'Bolt', keywords: ['bolt new', 'bolt ai', 'stackblitz bolt'] },
  { name: 'v0', keywords: ['v0 dev', 'vercel v0'] },
  { name: 'Aider', keywords: ['aider ai', 'aider coding'] },
  { name: 'Continue', keywords: ['continue dev ai', 'continue ai coding'] },
];

const DATA_DIR = path.join(__dirname, '..', 'data');
const TRENDS_FILE = path.join(DATA_DIR, 'google-trends.json');

// Fetch Google Trends data via their public embed API
async function fetchTrendsData(keyword, timeRange = 'today 3-m') {
  return new Promise((resolve, reject) => {
    // Use Google Trends explore URL pattern
    const encodedKeyword = encodeURIComponent(keyword);
    const url = `https://trends.google.com/trends/api/explore?hl=en-US&tz=0&req=${encodeURIComponent(JSON.stringify({
      comparisonItem: [{ keyword, geo: '', time: timeRange }],
      category: 0,
      property: ''
    }))}&token=`;

    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          // Google Trends returns garbage chars before JSON
          const jsonStr = data.substring(data.indexOf('{'));
          const parsed = JSON.parse(jsonStr);
          resolve(parsed);
        } catch (e) {
          resolve(null); // Graceful fail
        }
      });
    }).on('error', () => resolve(null));
  });
}

// Alternative: use SerpAPI-style scraping of public pages
async function fetchTrendsViaScrape(keyword) {
  return new Promise((resolve, reject) => {
    const url = `https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}&geo=US`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Look for trend data in page
        const interestMatch = data.match(/interest_over_time.*?"averages":\[(\d+)\]/);
        if (interestMatch) {
          resolve({ interest: parseInt(interestMatch[1]) });
        } else {
          // Try to get any numeric signal
          const numMatch = data.match(/"value":(\d+)/g);
          if (numMatch && numMatch.length > 0) {
            const values = numMatch.map(m => parseInt(m.split(':')[1])).filter(v => v > 0);
            if (values.length > 0) {
              resolve({ interest: Math.round(values.reduce((a,b) => a+b, 0) / values.length) });
            }
          }
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

// Generate relative interest scores using Bing search as proxy
async function fetchSearchInterest(keyword) {
  return new Promise((resolve, reject) => {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(keyword)}&count=50`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Count organic results
        const resultCount = (data.match(/<li class="b_algo"/gi) || []).length;
        // Check for result count estimate (e.g., "About 1,234,000 results")
        const countMatch = data.match(/(\d[\d,]+)\s*results/i);
        const estimatedResults = countMatch ? parseInt(countMatch[1].replace(/,/g, '')) : 0;
        // Check for news/article indicators
        const newsCount = (data.match(/news|article|blog|techcrunch|verge|wired/gi) || []).length;
        // Combine into score (log scale for estimated results)
        const logEstimate = estimatedResults > 0 ? Math.log10(estimatedResults) : 0;
        resolve({ 
          resultCount,
          estimatedResults,
          newsWeight: Math.min(newsCount / 10, 1),
          score: (resultCount * 2) + (logEstimate * 5) + (newsCount * 0.3)
        });
      });
    }).on('error', () => resolve({ resultCount: 0, estimatedResults: 0, newsWeight: 0, score: 0 }));
  });
}

async function collectTrendsData() {
  console.log('📈 Collecting search interest data...\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    competitors: {}
  };

  for (const competitor of COMPETITORS) {
    console.log(`  ${competitor.name}...`);
    
    let totalScore = 0;
    let keywordScores = [];
    
    for (const keyword of competitor.keywords) {
      const data = await fetchSearchInterest(keyword);
      if (data) {
        keywordScores.push({ keyword, ...data });
        totalScore += data.score;
      }
      // Rate limit
      await new Promise(r => setTimeout(r, 500));
    }
    
    results.competitors[competitor.name] = {
      keywords: keywordScores,
      totalScore: Math.round(totalScore),
      avgScore: Math.round(totalScore / competitor.keywords.length),
      checkedAt: new Date().toISOString()
    };
  }

  // Normalize scores to 0-100 scale
  const maxScore = Math.max(...Object.values(results.competitors).map(c => c.totalScore));
  if (maxScore > 0) {
    for (const name of Object.keys(results.competitors)) {
      results.competitors[name].normalizedScore = Math.round(
        (results.competitors[name].totalScore / maxScore) * 100
      );
    }
  }

  return results;
}

async function loadHistoricalData() {
  try {
    if (fs.existsSync(TRENDS_FILE)) {
      return JSON.parse(fs.readFileSync(TRENDS_FILE, 'utf8'));
    }
  } catch (e) {}
  return { history: [] };
}

async function saveTrendsData(data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  const historical = await loadHistoricalData();
  historical.history.push(data);
  
  // Keep last 30 days
  if (historical.history.length > 30) {
    historical.history = historical.history.slice(-30);
  }
  
  historical.latest = data;
  historical.updatedAt = new Date().toISOString();
  
  fs.writeFileSync(TRENDS_FILE, JSON.stringify(historical, null, 2));
  console.log(`\n✅ Saved to ${TRENDS_FILE}`);
}

function generateReport(data) {
  console.log('\n📊 SEARCH INTEREST RANKINGS\n');
  console.log('─'.repeat(50));
  
  const sorted = Object.entries(data.competitors)
    .sort((a, b) => b[1].normalizedScore - a[1].normalizedScore);
  
  sorted.forEach(([name, info], idx) => {
    const bar = '█'.repeat(Math.floor(info.normalizedScore / 5));
    console.log(`${(idx + 1).toString().padStart(2)}. ${name.padEnd(20)} ${bar} ${info.normalizedScore}`);
  });
  
  console.log('─'.repeat(50));
  console.log(`\nTop 3 by search visibility:`);
  sorted.slice(0, 3).forEach(([name, info], idx) => {
    console.log(`  ${idx + 1}. ${name} (score: ${info.normalizedScore})`);
  });
}

async function main() {
  try {
    const data = await collectTrendsData();
    await saveTrendsData(data);
    generateReport(data);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { collectTrendsData, loadHistoricalData };
