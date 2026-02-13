#!/usr/bin/env node
/**
 * Momentum Score Generator
 * Aggregates signals across all sources to rank competitors by momentum
 * 
 * Signals weighted:
 * - Funding news: +50 (major), +20 (minor)
 * - Hiring velocity: +2 per net new job
 * - VS Code installs: +1 per 10k weekly growth
 * - Chrome installs: +1 per 5k weekly growth
 * - npm downloads: +1 per 50k weekly growth
 * - News mentions: +5 per mention
 * - Social mentions (HN, Reddit, PH): +3 per mention
 * - Changelog updates: +10 per update
 * - YouTube activity: +5 per new video
 * - Stack Overflow growth: +2 per 10 new questions
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

// Ensure history dir exists
if (!fs.existsSync(HISTORY_DIR)) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

const COMPETITORS = [
  { slug: 'cursor', name: 'Cursor' },
  { slug: 'cognition', name: 'Devin' },
  { slug: 'replit', name: 'Replit' },
  { slug: 'windsurf', name: 'Windsurf' },
  { slug: 'copilot', name: 'GitHub Copilot' },
  { slug: 'tabnine', name: 'Tabnine' },
  { slug: 'amazonq', name: 'Amazon Q' },
  { slug: 'cody', name: 'Sourcegraph Cody' },
  { slug: 'continue', name: 'Continue' },
  { slug: 'supermaven', name: 'Supermaven' },
  { slug: 'augment', name: 'Augment Code' },
  { slug: 'lovable', name: 'Lovable' },
  { slug: 'poolside', name: 'Poolside' },
  { slug: 'bolt', name: 'Bolt' },
  { slug: 'v0', name: 'v0' }
];

function loadJSON(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function calculateMomentumScores(briefingData) {
  const scores = {};
  const signals = {};
  
  // Initialize
  COMPETITORS.forEach(c => {
    scores[c.slug] = 0;
    signals[c.slug] = [];
  });
  
  // 1. Funding news (highest weight - this is major)
  if (briefingData.funding) {
    briefingData.funding.forEach(item => {
      const slug = matchCompetitor(item.company || item.title);
      if (slug) {
        const isMajor = /\$\d+[MB]|\braises\b|acquisition|acquired/i.test(item.title);
        const points = isMajor ? 50 : 20;
        scores[slug] += points;
        signals[slug].push(`💰 Funding news (+${points})`);
      }
    });
  }
  
  // 2. Hiring velocity
  if (briefingData.hiringReport) {
    const velocityMatch = briefingData.hiringReport.match(/(\w+):\s*(\d+)\s*jobs?\s*\(([+-]\d+)/g) || [];
    velocityMatch.forEach(match => {
      const parts = match.match(/(\w+):\s*(\d+)\s*jobs?\s*\(([+-]?\d+)/);
      if (parts) {
        const name = parts[1];
        const velocity = parseInt(parts[3]);
        const slug = matchCompetitor(name);
        if (slug && velocity > 0) {
          const points = velocity * 2;
          scores[slug] += points;
          signals[slug].push(`👥 +${velocity} jobs (+${points})`);
        }
      }
    });
  }
  
  // 3. VS Code marketplace growth
  if (briefingData.vscodeData) {
    Object.entries(briefingData.vscodeData).forEach(([ext, data]) => {
      const slug = matchCompetitorFromExtension(ext);
      if (slug && data.weeklyGrowth) {
        const growth = parseInt(data.weeklyGrowth.replace(/[^0-9-]/g, ''));
        if (growth > 0) {
          const points = Math.floor(growth / 10000);
          if (points > 0) {
            scores[slug] += points;
            signals[slug].push(`📦 VS Code +${data.weeklyGrowth} (+${points})`);
          }
        }
      }
    });
  }
  
  // 4. Chrome extension growth
  if (briefingData.chromeData) {
    Object.entries(briefingData.chromeData).forEach(([ext, data]) => {
      const slug = matchCompetitorFromExtension(ext);
      if (slug && data.weeklyGrowth) {
        const growth = parseInt(data.weeklyGrowth.replace(/[^0-9-]/g, ''));
        if (growth > 0) {
          const points = Math.floor(growth / 5000);
          if (points > 0) {
            scores[slug] += points;
            signals[slug].push(`🌐 Chrome +${data.weeklyGrowth} (+${points})`);
          }
        }
      }
    });
  }
  
  // 5. News mentions
  if (briefingData.news) {
    briefingData.news.forEach(item => {
      const slug = matchCompetitor(item.title);
      if (slug) {
        scores[slug] += 5;
        signals[slug].push(`📰 News mention (+5)`);
      }
    });
  }
  
  // 6. Social mentions (HN, Reddit, Product Hunt)
  if (briefingData.social) {
    if (briefingData.social.hackerNews) {
      briefingData.social.hackerNews.forEach(item => {
        const slug = matchCompetitor(item.title);
        if (slug) {
          scores[slug] += 3;
          signals[slug].push(`🔶 HN mention (+3)`);
        }
      });
    }
    if (briefingData.social.reddit) {
      briefingData.social.reddit.forEach(item => {
        const slug = matchCompetitor(item.title);
        if (slug) {
          scores[slug] += 3;
          signals[slug].push(`🔴 Reddit mention (+3)`);
        }
      });
    }
  }
  
  if (briefingData.productHunt) {
    briefingData.productHunt.forEach(item => {
      const slug = matchCompetitor(item.name);
      if (slug) {
        scores[slug] += 3;
        signals[slug].push(`🚀 Product Hunt (+3)`);
      }
    });
  }
  
  // 7. Changelog updates
  if (briefingData.competitors) {
    briefingData.competitors.forEach(comp => {
      if (comp.changelog && comp.changelog.length > 0) {
        const slug = matchCompetitor(comp.name);
        if (slug) {
          // Check if changelog entry is from last 7 days
          const recentUpdate = comp.changelog.find(date => {
            const parsed = new Date(date);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return parsed > weekAgo;
          });
          if (recentUpdate) {
            scores[slug] += 10;
            signals[slug].push(`📝 Recent changelog (+10)`);
          }
        }
      }
    });
  }
  
  // 8. YouTube activity
  if (briefingData.youtube) {
    Object.entries(briefingData.youtube).forEach(([name, videos]) => {
      const slug = matchCompetitor(name);
      if (slug && Array.isArray(videos)) {
        const recentVideos = videos.filter(v => {
          if (!v.publishedAt) return false;
          const pubDate = new Date(v.publishedAt);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return pubDate > weekAgo;
        });
        if (recentVideos.length > 0) {
          const points = recentVideos.length * 5;
          scores[slug] += points;
          signals[slug].push(`🎬 ${recentVideos.length} new video(s) (+${points})`);
        }
      }
    });
  }
  
  return { scores, signals };
}

function matchCompetitor(text) {
  if (!text) return null;
  text = text.toLowerCase();
  
  const mappings = {
    'cursor': 'cursor',
    'devin': 'cognition',
    'cognition': 'cognition',
    'replit': 'replit',
    'windsurf': 'windsurf',
    'codeium': 'windsurf',
    'copilot': 'copilot',
    'github copilot': 'copilot',
    'tabnine': 'tabnine',
    'amazon q': 'amazonq',
    'aws q': 'amazonq',
    'sourcegraph': 'cody',
    'cody': 'cody',
    'continue': 'continue',
    'continue.dev': 'continue',
    'supermaven': 'supermaven',
    'augment': 'augment',
    'lovable': 'lovable',
    'poolside': 'poolside'
  };
  
  for (const [keyword, slug] of Object.entries(mappings)) {
    if (text.includes(keyword)) {
      return slug;
    }
  }
  return null;
}

function matchCompetitorFromExtension(extName) {
  const lower = extName.toLowerCase();
  if (lower.includes('cursor')) return 'cursor';
  if (lower.includes('codeium') || lower.includes('windsurf')) return 'windsurf';
  if (lower.includes('copilot')) return 'copilot';
  if (lower.includes('tabnine')) return 'tabnine';
  if (lower.includes('cody')) return 'cody';
  if (lower.includes('continue')) return 'continue';
  if (lower.includes('supermaven')) return 'supermaven';
  if (lower.includes('replit')) return 'replit';
  return null;
}

function generateMomentumReport(scores, signals) {
  const today = new Date().toISOString().split('T')[0];
  
  // Sort by score descending
  const ranked = Object.entries(scores)
    .map(([slug, score]) => ({
      slug,
      name: COMPETITORS.find(c => c.slug === slug)?.name || slug,
      score,
      signals: signals[slug] || []
    }))
    .sort((a, b) => b.score - a.score);
  
  // Generate markdown
  let md = `## 🔥 Momentum Scores (${today})\n\n`;
  md += `| Rank | Competitor | Score | Top Signals |\n`;
  md += `|------|------------|-------|-------------|\n`;
  
  ranked.forEach((item, idx) => {
    const topSignals = item.signals.slice(0, 3).join(', ') || '-';
    const trend = item.score > 20 ? '🔥' : item.score > 10 ? '📈' : item.score > 0 ? '→' : '💤';
    md += `| ${idx + 1} | ${trend} ${item.name} | ${item.score} | ${topSignals} |\n`;
  });
  
  // Hot takes
  md += `\n### Key Insights\n`;
  
  const hottest = ranked[0];
  if (hottest.score > 20) {
    md += `- 🔥 **${hottest.name}** is on fire this week with ${hottest.score} momentum points\n`;
  }
  
  const active = ranked.filter(r => r.score > 0);
  const dormant = ranked.filter(r => r.score === 0);
  
  if (dormant.length > 0) {
    md += `- 💤 Quiet week for: ${dormant.map(d => d.name).join(', ')}\n`;
  }
  
  if (active.length > 5) {
    md += `- 📊 ${active.length} competitors showed activity this week\n`;
  }
  
  return { ranked, markdown: md };
}

// Save historical data for trend analysis
function saveHistory(scores) {
  const today = new Date().toISOString().split('T')[0];
  const historyFile = path.join(HISTORY_DIR, 'momentum.json');
  
  let history = loadJSON(historyFile) || {};
  history[today] = scores;
  
  // Keep last 30 days
  const dates = Object.keys(history).sort().slice(-30);
  const trimmed = {};
  dates.forEach(d => trimmed[d] = history[d]);
  
  fs.writeFileSync(historyFile, JSON.stringify(trimmed, null, 2));
  return history;
}

// Get week-over-week changes
function getWeeklyTrends(history) {
  const dates = Object.keys(history).sort();
  if (dates.length < 2) return null;
  
  const today = dates[dates.length - 1];
  const weekAgo = dates.find(d => {
    const diff = new Date(today) - new Date(d);
    return diff >= 6 * 24 * 60 * 60 * 1000; // At least 6 days ago
  }) || dates[0];
  
  const current = history[today];
  const previous = history[weekAgo];
  
  const changes = {};
  Object.keys(current).forEach(slug => {
    changes[slug] = {
      current: current[slug],
      previous: previous[slug] || 0,
      change: current[slug] - (previous[slug] || 0)
    };
  });
  
  return changes;
}

// Export for use in daily-briefing.js
module.exports = {
  calculateMomentumScores,
  generateMomentumReport,
  saveHistory,
  getWeeklyTrends
};

// CLI mode
if (require.main === module) {
  console.log('Running momentum score analysis...\n');
  
  // Load latest briefing data
  const briefingFiles = fs.readdirSync(DATA_DIR)
    .filter(f => f.startsWith('briefing-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (briefingFiles.length === 0) {
    console.log('No briefing data found. Run daily-briefing.js first.');
    process.exit(1);
  }
  
  const latestBriefing = loadJSON(path.join(DATA_DIR, briefingFiles[0]));
  if (!latestBriefing) {
    console.log('Could not load briefing data.');
    process.exit(1);
  }
  
  const { scores, signals } = calculateMomentumScores(latestBriefing);
  const history = saveHistory(scores);
  const { ranked, markdown } = generateMomentumReport(scores, signals);
  
  console.log(markdown);
  
  // Show detailed signals for top 3
  console.log('\n### Detailed Signals (Top 3)\n');
  ranked.slice(0, 3).forEach(item => {
    if (item.signals.length > 0) {
      console.log(`**${item.name}:**`);
      item.signals.forEach(s => console.log(`  - ${s}`));
      console.log();
    }
  });
}
