#!/usr/bin/env node
/**
 * Wikipedia Pageviews Monitoring
 * Tracks Wikipedia article views as proxy for public interest
 * Uses official Wikimedia REST API (no auth required)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Competitors with their Wikipedia articles (if they exist)
const COMPETITORS = [
  { name: 'GitHub Copilot', articles: ['GitHub_Copilot'] },
  { name: 'Tabnine', articles: ['Tabnine'] },
  { name: 'Replit', articles: ['Replit'] },
  { name: 'Cursor', articles: [] }, // No Wikipedia article yet
  { name: 'Devin', articles: ['Devin_(artificial_intelligence)'] },
  { name: 'Amazon Q', articles: ['Amazon_Q'] },
  { name: 'Codeium', articles: ['Codeium'] },
  { name: 'Sourcegraph', articles: ['Sourcegraph'] },
  // General AI coding articles for context
  { name: 'AI Coding (general)', articles: ['GitHub_Copilot', 'Tabnine', 'Codeium'] },
];

const DATA_DIR = path.join(__dirname, '..', 'data');
const PAGEVIEWS_FILE = path.join(DATA_DIR, 'wikipedia-pageviews.json');

// Get date range for last 30 days
function getDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  
  const format = d => d.toISOString().slice(0, 10).replace(/-/g, '');
  return { start: format(start), end: format(end) };
}

// Fetch pageviews for a Wikipedia article
async function fetchPageviews(article) {
  const { start, end } = getDateRange();
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(article)}/daily/${start}/${end}`;
  
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'BriefingBot/1.0 (hi@kell.cx) wikipedia pageview tracker',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.items && parsed.items.length > 0) {
            const views = parsed.items.map(i => i.views);
            const total = views.reduce((a, b) => a + b, 0);
            const avg = Math.round(total / views.length);
            const trend = views.slice(-7).reduce((a, b) => a + b, 0) / 7;
            const weekAgoAvg = views.slice(-14, -7).reduce((a, b) => a + b, 0) / 7;
            const weeklyChange = weekAgoAvg > 0 ? ((trend - weekAgoAvg) / weekAgoAvg * 100).toFixed(1) : 0;
            
            resolve({
              article,
              total,
              dailyAvg: avg,
              recentTrend: Math.round(trend),
              weeklyChange: parseFloat(weeklyChange),
              dataPoints: views.length
            });
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function collectPageviewData() {
  console.log('📚 Collecting Wikipedia pageview data...\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    period: getDateRange(),
    competitors: {}
  };

  for (const competitor of COMPETITORS) {
    if (competitor.articles.length === 0) {
      results.competitors[competitor.name] = {
        note: 'No Wikipedia article exists',
        totalViews: 0,
        dailyAvg: 0
      };
      console.log(`  ${competitor.name}: No Wikipedia article`);
      continue;
    }
    
    console.log(`  ${competitor.name}...`);
    
    let totalViews = 0;
    let articles = [];
    
    for (const article of competitor.articles) {
      const data = await fetchPageviews(article);
      if (data) {
        articles.push(data);
        totalViews += data.total;
      }
      // Rate limit
      await new Promise(r => setTimeout(r, 200));
    }
    
    const avgDaily = articles.length > 0 
      ? Math.round(articles.reduce((a, b) => a + b.dailyAvg, 0) / articles.length)
      : 0;
    
    const avgChange = articles.length > 0
      ? (articles.reduce((a, b) => a + b.weeklyChange, 0) / articles.length).toFixed(1)
      : 0;
    
    results.competitors[competitor.name] = {
      articles,
      totalViews,
      dailyAvg: avgDaily,
      weeklyChange: parseFloat(avgChange),
      checkedAt: new Date().toISOString()
    };
  }

  return results;
}

async function loadHistoricalData() {
  try {
    if (fs.existsSync(PAGEVIEWS_FILE)) {
      return JSON.parse(fs.readFileSync(PAGEVIEWS_FILE, 'utf8'));
    }
  } catch (e) {}
  return { history: [] };
}

async function saveData(data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  const historical = await loadHistoricalData();
  historical.history.push(data);
  
  // Keep last 30 snapshots
  if (historical.history.length > 30) {
    historical.history = historical.history.slice(-30);
  }
  
  historical.latest = data;
  historical.updatedAt = new Date().toISOString();
  
  fs.writeFileSync(PAGEVIEWS_FILE, JSON.stringify(historical, null, 2));
  console.log(`\n✅ Saved to ${PAGEVIEWS_FILE}`);
}

function generateReport(data) {
  console.log('\n📊 WIKIPEDIA PAGEVIEWS (Last 30 Days)\n');
  console.log('─'.repeat(60));
  
  const sorted = Object.entries(data.competitors)
    .filter(([_, info]) => info.totalViews > 0)
    .sort((a, b) => b[1].dailyAvg - a[1].dailyAvg);
  
  if (sorted.length === 0) {
    console.log('No pageview data available');
    return;
  }
  
  const maxViews = sorted[0][1].dailyAvg;
  
  sorted.forEach(([name, info], idx) => {
    const barLen = Math.floor((info.dailyAvg / maxViews) * 20);
    const bar = '█'.repeat(barLen);
    const trend = info.weeklyChange > 0 ? `+${info.weeklyChange}%` : `${info.weeklyChange}%`;
    const trendEmoji = info.weeklyChange > 5 ? '📈' : info.weeklyChange < -5 ? '📉' : '➡️';
    
    console.log(`${(idx + 1).toString().padStart(2)}. ${name.padEnd(22)} ${bar.padEnd(20)} ${info.dailyAvg.toLocaleString().padStart(6)}/day ${trendEmoji} ${trend}`);
  });
  
  console.log('─'.repeat(60));
  
  // Highlight interesting changes
  const risers = sorted.filter(([_, i]) => i.weeklyChange > 10);
  const fallers = sorted.filter(([_, i]) => i.weeklyChange < -10);
  
  if (risers.length > 0) {
    console.log('\n🚀 Rising interest:');
    risers.forEach(([name, info]) => {
      console.log(`   ${name}: +${info.weeklyChange}% week-over-week`);
    });
  }
  
  if (fallers.length > 0) {
    console.log('\n📉 Declining interest:');
    fallers.forEach(([name, info]) => {
      console.log(`   ${name}: ${info.weeklyChange}% week-over-week`);
    });
  }
}

async function main() {
  try {
    const data = await collectPageviewData();
    await saveData(data);
    generateReport(data);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { collectPageviewData, loadHistoricalData };
