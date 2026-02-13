#!/usr/bin/env node
/**
 * Hiring Trends Tracker
 * Tracks job counts over time to identify hiring velocity changes
 * Run daily after job scraping to build historical data
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'hiring-history.json');

/**
 * Load or create history file
 */
function loadHistory() {
  try {
    const data = fs.readFileSync(HISTORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { entries: [], lastUpdate: null };
  }
}

/**
 * Save history file
 */
function saveHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

/**
 * Get today's job data
 */
function getTodayJobs() {
  const today = new Date().toISOString().split('T')[0];
  const jobsFile = path.join(DATA_DIR, `jobs-${today}.json`);
  
  try {
    const data = fs.readFileSync(jobsFile, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('No job data for today. Run scrape-jobs.js first.');
    return null;
  }
}

/**
 * Calculate trend (% change from previous entry)
 */
function calculateTrend(current, previous) {
  if (!previous || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  return Math.round(change * 10) / 10; // 1 decimal place
}

/**
 * Record today's data
 */
function recordToday() {
  const jobs = getTodayJobs();
  if (!jobs) return;
  
  const history = loadHistory();
  const today = new Date().toISOString().split('T')[0];
  
  // Check if we already have an entry for today
  const existingEntry = history.entries.find(e => e.date === today);
  if (existingEntry) {
    console.log(`Already recorded data for ${today}`);
    return history;
  }
  
  // Create today's entry
  const entry = {
    date: today,
    companies: {}
  };
  
  // Get previous entry for trend calculation
  const prevEntry = history.entries[history.entries.length - 1];
  
  for (const [slug, data] of Object.entries(jobs)) {
    const count = data.estimatedCount || 0;
    const prevCount = prevEntry?.companies?.[slug]?.count;
    
    entry.companies[slug] = {
      name: data.company,
      count,
      trend: calculateTrend(count, prevCount)
    };
  }
  
  history.entries.push(entry);
  history.lastUpdate = new Date().toISOString();
  
  // Keep last 90 days of data
  if (history.entries.length > 90) {
    history.entries = history.entries.slice(-90);
  }
  
  saveHistory(history);
  console.log(`✅ Recorded hiring data for ${today}`);
  
  return history;
}

/**
 * Generate hiring trends report
 */
function generateReport(history) {
  if (!history || history.entries.length < 2) {
    console.log('Not enough data for trends. Need at least 2 days.');
    return null;
  }
  
  const latest = history.entries[history.entries.length - 1];
  const weekAgo = history.entries[Math.max(0, history.entries.length - 7)];
  
  const report = {
    date: latest.date,
    summary: [],
    byCompany: {},
    insights: []
  };
  
  // Calculate week-over-week changes
  for (const [slug, data] of Object.entries(latest.companies)) {
    const weekData = weekAgo?.companies?.[slug];
    const weekChange = calculateTrend(data.count, weekData?.count);
    
    report.byCompany[slug] = {
      name: data.name,
      currentJobs: data.count,
      dayChange: data.trend,
      weekChange
    };
    
    // Generate insights
    if (data.count >= 50 && weekChange > 20) {
      report.insights.push(`🚀 ${data.name} is on a hiring spree (+${weekChange}% this week, ${data.count} open roles)`);
    } else if (data.count >= 20 && weekChange > 10) {
      report.insights.push(`📈 ${data.name} ramping up hiring (+${weekChange}% this week)`);
    } else if (weekChange && weekChange < -20 && data.count > 0) {
      report.insights.push(`📉 ${data.name} slowing down hiring (${weekChange}% this week)`);
    }
  }
  
  // Sort by job count
  const sorted = Object.entries(report.byCompany)
    .sort((a, b) => b[1].currentJobs - a[1].currentJobs);
  
  // Summary
  report.summary.push(`**Top Hirers Today:**`);
  for (const [slug, data] of sorted.slice(0, 5)) {
    if (data.currentJobs > 0) {
      const trend = data.weekChange ? ` (${data.weekChange > 0 ? '+' : ''}${data.weekChange}% this week)` : '';
      report.summary.push(`• ${data.name}: ${data.currentJobs} open roles${trend}`);
    }
  }
  
  // Total market
  const totalJobs = sorted.reduce((sum, [_, d]) => sum + d.currentJobs, 0);
  const prevTotal = Object.values(weekAgo?.companies || {}).reduce((sum, d) => sum + (d.count || 0), 0);
  const totalChange = calculateTrend(totalJobs, prevTotal);
  
  report.marketTotal = totalJobs;
  report.marketTrend = totalChange;
  
  if (totalChange) {
    report.summary.push(`\n**Market Total:** ${totalJobs} open roles (${totalChange > 0 ? '+' : ''}${totalChange}% this week)`);
  }
  
  return report;
}

/**
 * Format report as markdown
 */
function formatReportMd(report) {
  if (!report) return 'Insufficient data for hiring trends.';
  
  let md = `## 📊 Hiring Trends\n\n`;
  md += report.summary.join('\n') + '\n';
  
  if (report.insights.length > 0) {
    md += `\n### Strategic Signals\n`;
    md += report.insights.join('\n') + '\n';
  }
  
  return md;
}

// Export for use in daily-briefing.js
module.exports = { recordToday, generateReport, formatReportMd, loadHistory };

// Run standalone
if (require.main === module) {
  const history = recordToday();
  if (history) {
    const report = generateReport(history);
    console.log('\n' + formatReportMd(report));
  }
}
