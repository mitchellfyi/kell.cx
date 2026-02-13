#!/usr/bin/env node
/**
 * Trend Anomaly Detector for Briefing
 * Spots unusual changes that warrant attention
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

function loadJSON(file) {
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function detectHiringTrends() {
  const history = loadJSON('hiring-history.json');
  if (!history || !history.history || history.history.length < 2) return [];
  
  const alerts = [];
  const latest = history.history[history.history.length - 1];
  const previous = history.history[history.history.length - 2];
  
  for (const [company, count] of Object.entries(latest.counts || {})) {
    const prevCount = previous.counts?.[company] || 0;
    const change = count - prevCount;
    const pctChange = prevCount > 0 ? (change / prevCount) * 100 : (count > 5 ? 100 : 0);
    
    // Alert on significant changes
    if (change >= 10 || (pctChange >= 50 && count > 5)) {
      alerts.push({
        type: 'hiring_surge',
        company,
        severity: change >= 20 ? 'high' : 'medium',
        message: `${company} added ${change} jobs (${prevCount} → ${count})`,
        delta: change,
        percent: Math.round(pctChange)
      });
    } else if (change <= -10 || (pctChange <= -30 && prevCount > 10)) {
      alerts.push({
        type: 'hiring_drop',
        company,
        severity: Math.abs(change) >= 20 ? 'high' : 'medium',
        message: `${company} removed ${Math.abs(change)} jobs (${prevCount} → ${count})`,
        delta: change,
        percent: Math.round(pctChange)
      });
    }
  }
  
  return alerts;
}

function detectVSCodeTrends() {
  const current = loadJSON('vscode-marketplace.json');
  const historyDir = path.join(DATA_DIR, 'history');
  
  if (!current || !fs.existsSync(historyDir)) return [];
  
  // Look for previous day's data
  const files = fs.readdirSync(historyDir).filter(f => f.startsWith('vscode-'));
  if (files.length === 0) return [];
  
  files.sort().reverse();
  const prevFile = files[0];
  const previous = JSON.parse(fs.readFileSync(path.join(historyDir, prevFile), 'utf8'));
  
  const alerts = [];
  
  for (const ext of current) {
    const prevExt = previous.find(p => p.name === ext.name);
    if (!prevExt) continue;
    
    const installDelta = ext.installs - prevExt.installs;
    const dailyVelocity = installDelta;
    
    // Alert on unusual install velocity (more than 100k/day for big extensions, 10k for smaller)
    const threshold = ext.installs > 1000000 ? 100000 : 10000;
    
    if (dailyVelocity > threshold) {
      alerts.push({
        type: 'install_spike',
        company: ext.publisher,
        severity: dailyVelocity > threshold * 2 ? 'high' : 'medium',
        message: `${ext.name} gained ${dailyVelocity.toLocaleString()} installs in 24h`,
        delta: dailyVelocity
      });
    }
  }
  
  return alerts;
}

function detectMomentumShifts() {
  const history = loadJSON('momentum-history.json');
  if (!history || !history.history || history.history.length < 2) return [];
  
  const alerts = [];
  const latest = history.history[history.history.length - 1];
  const previous = history.history[history.history.length - 2];
  
  // Build rank maps
  const latestRanks = {};
  const prevRanks = {};
  
  latest.rankings?.forEach((r, i) => latestRanks[r.company] = i + 1);
  previous.rankings?.forEach((r, i) => prevRanks[r.company] = i + 1);
  
  for (const [company, rank] of Object.entries(latestRanks)) {
    const prevRank = prevRanks[company];
    if (!prevRank) continue;
    
    const change = prevRank - rank; // Positive = moved up
    
    if (change >= 3) {
      alerts.push({
        type: 'momentum_surge',
        company,
        severity: change >= 5 ? 'high' : 'medium',
        message: `${company} jumped ${change} positions in momentum ranking (#${prevRank} → #${rank})`,
        delta: change
      });
    } else if (change <= -3) {
      alerts.push({
        type: 'momentum_drop',
        company,
        severity: Math.abs(change) >= 5 ? 'high' : 'medium',
        message: `${company} dropped ${Math.abs(change)} positions in momentum ranking (#${prevRank} → #${rank})`,
        delta: change
      });
    }
  }
  
  return alerts;
}

function detectPricingChanges() {
  const history = loadJSON('pricing-history.json');
  if (!history || !history.changes || history.changes.length === 0) return [];
  
  const alerts = [];
  const recent = history.changes.filter(c => {
    const changeDate = new Date(c.date);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return changeDate > dayAgo;
  });
  
  for (const change of recent) {
    alerts.push({
      type: 'pricing_change',
      company: change.company,
      severity: 'high', // Pricing changes are always important
      message: `${change.company} updated their pricing page`,
      details: change
    });
  }
  
  return alerts;
}

function detectFundingNews() {
  const news = loadJSON('news.json');
  if (!news || !news.articles) return [];
  
  const alerts = [];
  const fundingKeywords = ['funding', 'raised', 'series', 'valuation', 'acquired', 'acquisition', 'ipo'];
  
  for (const article of news.articles) {
    const title = (article.title || '').toLowerCase();
    const isFunding = fundingKeywords.some(kw => title.includes(kw));
    
    if (isFunding) {
      alerts.push({
        type: 'funding_news',
        company: article.source || 'Unknown',
        severity: 'high',
        message: article.title,
        url: article.url
      });
    }
  }
  
  return alerts;
}

function getAllAlerts() {
  const allAlerts = [
    ...detectHiringTrends(),
    ...detectVSCodeTrends(),
    ...detectMomentumShifts(),
    ...detectPricingChanges(),
    ...detectFundingNews()
  ];
  
  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  allAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return allAlerts;
}

function formatAlertsMd(alerts) {
  if (alerts.length === 0) return '';
  
  let md = '## 🚨 Trend Alerts\n';
  md += '*Unusual competitive signals detected:*\n\n';
  
  const highAlerts = alerts.filter(a => a.severity === 'high');
  const mediumAlerts = alerts.filter(a => a.severity === 'medium');
  
  if (highAlerts.length > 0) {
    highAlerts.forEach(a => md += `🔴 ${a.message}\n`);
  }
  
  if (mediumAlerts.length > 0) {
    mediumAlerts.forEach(a => md += `🟡 ${a.message}\n`);
  }
  
  md += '\n---\n\n';
  return md;
}

async function main() {
  console.log('🔍 Trend Anomaly Detection\n');
  
  const allAlerts = getAllAlerts();
  
  if (allAlerts.length === 0) {
    console.log('✅ No significant anomalies detected');
  } else {
    console.log(`⚠️  ${allAlerts.length} signals detected:\n`);
    
    const highAlerts = allAlerts.filter(a => a.severity === 'high');
    const mediumAlerts = allAlerts.filter(a => a.severity === 'medium');
    
    if (highAlerts.length > 0) {
      console.log('🔴 HIGH PRIORITY:');
      highAlerts.forEach(a => console.log(`   • ${a.message}`));
      console.log();
    }
    
    if (mediumAlerts.length > 0) {
      console.log('🟡 NOTABLE:');
      mediumAlerts.forEach(a => console.log(`   • ${a.message}`));
      console.log();
    }
  }
  
  // Save alerts
  const alertFile = path.join(DATA_DIR, 'trend-alerts.json');
  fs.writeFileSync(alertFile, JSON.stringify({
    generated: new Date().toISOString(),
    alerts: allAlerts
  }, null, 2));
  
  console.log(`📁 Saved to ${alertFile}`);
  
  return allAlerts;
}

// Export for use as module
module.exports = { getAllAlerts, formatAlertsMd };

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
