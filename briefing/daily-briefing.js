#!/usr/bin/env node
/**
 * Daily Briefing - Full pipeline
 * Scrape competitors, generate digest, send email
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { scrapeAllJobs } = require('./scrape-jobs');
const { scrapePricing } = require('./scrape-pricing');
const { scrapeAllSocial } = require('./scrape-social');
const { scrapeProductHunt } = require('./scrape-producthunt');
const { scrapeNews } = require('./scrape-news');
const { scrapeYouTube } = require('./scrape-youtube');
const { scrapeStackOverflow } = require('./scrape-stackoverflow');
const { recordToday, generateReport, formatReportMd, loadHistory } = require('./track-hiring-trends');
const { scrapeFunding } = require('./scrape-funding');
const { scrapeVSCodeMarketplace, generateBriefingSection: generateVSCodeSection } = require('./scrape-vscode-marketplace');
const { scrapeChromeWebStore, generateBriefingSection: generateChromeSection } = require('./scrape-chrome-webstore');
const { scrapeAllPackages, generateBriefingSection: generatePackagesSection, savePackageHistory } = require('./scrape-packages');
const { calculateMomentumScores, generateMomentumReport, saveHistory: saveMomentumHistory } = require('./generate-momentum-score');
const { scrapeDiscordCommunities, formatDiscordSection } = require('./scrape-discord');

// Wikipedia pageviews tracking
let wikiPageviews = null;
try {
  wikiPageviews = require('./scrapers/wikipedia-pageviews');
} catch (e) {
  console.log('Wikipedia pageviews module not available');
}

// Trend detection for anomalies
let trendDetector = null;
try {
  trendDetector = require('./detect-trends');
} catch (e) {
  console.log('Trend detection module not available');
}

// App Store monitoring
async function scrapeAppStore() {
  const DATA_FILE = path.join(__dirname, 'data/appstore-latest.json');
  const SCRAPER = path.join(__dirname, 'scrapers/appstore-monitor.js');
  
  // Run the scraper
  try {
    execSync(`node ${SCRAPER}`, { cwd: __dirname, stdio: 'pipe' });
  } catch (e) {
    console.log(`  App Store scraper error: ${e.message}`);
  }
  
  // Load results
  if (fs.existsSync(DATA_FILE)) {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return data;
  }
  return null;
}

function formatAppStoreSection(data) {
  if (!data || !data.ios || data.ios.length === 0) return '';
  
  const found = data.ios.filter(a => a.found);
  if (found.length === 0) return '';
  
  let md = `## 📱 Mobile App Tracking\n`;
  md += `*iOS App Store data for competitor mobile presence*\n\n`;
  
  found.forEach(app => {
    md += `**${app.competitor}** (${app.name})\n`;
    if (app.rating) {
      md += `⭐ ${app.rating.toFixed(1)}/5 (${app.ratingCount?.toLocaleString() || 0} reviews)`;
    }
    if (app.version) {
      md += ` | v${app.version}`;
    }
    md += `\n`;
  });
  
  if (data.changes && data.changes.length > 0) {
    md += `\n📊 **Changes detected:**\n`;
    data.changes.forEach(c => md += `- ${c}\n`);
  }
  
  md += `\n`;
  return md;
}

const DATA_DIR = path.join(__dirname, 'data');
const DIGEST_DIR = path.join(__dirname, 'digests');

// Ensure dirs exist
[DATA_DIR, DIGEST_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : require('http');
    const req = client.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Briefing/1.0)' },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function scrapeCompetitor(config) {
  const result = {
    name: config.name,
    scrapedAt: new Date().toISOString(),
    website: {},
    changelog: [],
    signals: []
  };

  // Fetch website
  try {
    const html = await fetchPage(config.website);
    result.website.title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || '';
    result.website.description = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i)?.[1] || '';
  } catch (e) {
    result.website.error = e.message;
  }

  // Fetch changelog if available
  if (config.changelog) {
    try {
      const html = await fetchPage(config.changelog);
      const dates = html.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/gi) || [];
      result.changelog = dates.slice(0, 5);
      if (dates[0]) {
        result.signals.push(`Latest changelog: ${dates[0]}`);
      }
    } catch (e) {
      // Changelog not critical
    }
  }

  return result;
}

async function generateBriefing() {
  const competitors = [
    { name: 'Cursor', website: 'https://cursor.com', changelog: 'https://cursor.com/changelog', slug: 'cursor' },
    { name: 'Devin', website: 'https://cognition.ai', slug: 'cognition' },
    { name: 'Replit', website: 'https://replit.com', blog: 'https://blog.replit.com', slug: 'replit' },
    { name: 'Windsurf', website: 'https://codeium.com', changelog: 'https://codeium.com/changelog', slug: 'windsurf' },
    { name: 'GitHub Copilot', website: 'https://github.com/features/copilot', slug: 'copilot' },
    { name: 'Tabnine', website: 'https://www.tabnine.com', slug: 'tabnine' },
    { name: 'Amazon Q', website: 'https://aws.amazon.com/q/developer/', slug: 'amazonq' },
    { name: 'Sourcegraph Cody', website: 'https://sourcegraph.com/cody', changelog: 'https://sourcegraph.com/changelog', slug: 'cody' },
    { name: 'Continue', website: 'https://continue.dev', slug: 'continue' },
    { name: 'Supermaven', website: 'https://supermaven.com', slug: 'supermaven' },
    { name: 'Augment Code', website: 'https://www.augmentcode.com', slug: 'augment' },
    { name: 'Lovable', website: 'https://lovable.dev', changelog: 'https://lovable.dev/changelog', slug: 'lovable' },
    { name: 'Poolside', website: 'https://poolside.ai', slug: 'poolside' },
    { name: 'Bolt', website: 'https://bolt.new', slug: 'bolt' },
    { name: 'v0', website: 'https://v0.dev', slug: 'v0' }
  ];

  console.log('🔍 Scraping competitors...');
  const results = [];
  for (const c of competitors) {
    console.log(`  → ${c.name}`);
    results.push(await scrapeCompetitor(c));
  }

  // Scrape job postings
  console.log('\n💼 Scanning job postings...');
  let jobData = {};
  let hiringTrendsReport = null;
  try {
    jobData = await scrapeAllJobs();
    // Track hiring trends after scraping
    const hiringHistory = recordToday();
    hiringTrendsReport = generateReport(hiringHistory);
    if (hiringTrendsReport?.insights?.length > 0) {
      console.log(`  📊 Generated hiring trends (${hiringTrendsReport.insights.length} insights)`);
    }
  } catch (e) {
    console.log(`  Job scrape error: ${e.message}`);
  }

  // Scrape pricing pages
  console.log('\n💰 Scanning pricing pages...');
  let pricingData = [];
  try {
    pricingData = await scrapePricing();
    pricingData.forEach(p => {
      if (p.changed) console.log(`  ⚠️ ${p.name}: pricing changed!`);
      else if (p.isBaseline) console.log(`  📊 ${p.name}: baseline established`);
      else console.log(`  ✓ ${p.name}: no changes`);
    });
  } catch (e) {
    console.log(`  Pricing scrape error: ${e.message}`);
  }

  // Scrape social/news sources
  console.log('\n📡 Scanning social/news...');
  let socialData = {};
  try {
    socialData = await scrapeAllSocial();
  } catch (e) {
    console.log(`  Social scrape error: ${e.message}`);
  }

  // Scrape Product Hunt
  console.log('\n🚀 Scanning Product Hunt...');
  let phData = { launches: [], signals: [] };
  try {
    phData = await scrapeProductHunt();
    if (phData.launches.length > 0) {
      console.log(`  Found ${phData.launches.length} potential AI coding tools`);
    }
  } catch (e) {
    console.log(`  Product Hunt scrape error: ${e.message}`);
  }

  // Scrape tech news
  console.log('\n📰 Scanning tech news...');
  let newsData = { newArticles: [], allRelevantArticles: [], signals: [] };
  try {
    newsData = await scrapeNews();
    if (newsData.newArticles.length > 0) {
      console.log(`  Found ${newsData.newArticles.length} new relevant articles`);
    }
  } catch (e) {
    console.log(`  News scrape error: ${e.message}`);
  }

  // Scrape YouTube channels
  console.log('\n🎬 Scanning YouTube channels...');
  let youtubeData = { results: {}, newVideos: [], signals: [] };
  try {
    youtubeData = await scrapeYouTube();
    if (youtubeData.newVideos.length > 0) {
      console.log(`  Found ${youtubeData.newVideos.length} new video(s)`);
    }
  } catch (e) {
    console.log(`  YouTube scrape error: ${e.message}`);
  }

  // Scrape Stack Overflow
  console.log('\n📚 Scanning Stack Overflow...');
  let soData = {};
  try {
    soData = await scrapeStackOverflow();
    const totalQuestions = Object.values(soData).reduce((sum, d) => sum + d.stats.totalQuestions, 0);
    if (totalQuestions > 0) {
      console.log(`  Found ${totalQuestions} total questions this week`);
    }
  } catch (e) {
    console.log(`  Stack Overflow scrape error: ${e.message}`);
  }

  // Scrape funding news
  console.log('\n💵 Scanning funding news...');
  let fundingData = { funding: [], sources: [] };
  try {
    fundingData = await scrapeFunding();
    if (fundingData.funding.length > 0) {
      console.log(`  Found ${fundingData.funding.length} funding news item(s)`);
    }
  } catch (e) {
    console.log(`  Funding scrape error: ${e.message}`);
  }

  // Scrape VS Code Marketplace
  console.log('\n🔌 Scanning VS Code Marketplace...');
  let vscodeData = { results: [], changes: [] };
  try {
    vscodeData = await scrapeVSCodeMarketplace();
    const foundCount = vscodeData.results.filter(r => r.found).length;
    console.log(`  Found ${foundCount}/${vscodeData.results.length} extensions`);
    if (vscodeData.changes.length > 0) {
      console.log(`  Detected ${vscodeData.changes.length} change(s)`);
    }
  } catch (e) {
    console.log(`  VS Code Marketplace scrape error: ${e.message}`);
  }

  // Scrape Chrome Web Store
  console.log('\n🌐 Scanning Chrome Web Store...');
  let chromeData = { results: [], changes: [] };
  try {
    chromeData = await scrapeChromeWebStore();
    const foundCount = chromeData.results.filter(r => r.found && r.users).length;
    console.log(`  Found data for ${foundCount}/${chromeData.results.length} extensions`);
    if (chromeData.changes.length > 0) {
      console.log(`  Detected ${chromeData.changes.length} change(s)`);
    }
  } catch (e) {
    console.log(`  Chrome Web Store scrape error: ${e.message}`);
  }

  // Scrape npm/PyPI packages
  console.log('\n📦 Scanning package registries (npm/PyPI)...');
  let packagesData = { npm: [], pypi: [] };
  try {
    packagesData = await scrapeAllPackages();
    const npmCount = packagesData.npm?.filter(p => p.weeklyDownloads).length || 0;
    const pypiCount = packagesData.pypi?.filter(p => p.version).length || 0;
    console.log(`  Found ${npmCount} npm packages, ${pypiCount} PyPI packages`);
    savePackageHistory(packagesData);
  } catch (e) {
    console.log(`  Package registry scrape error: ${e.message}`);
  }

  // Scrape Discord communities
  console.log('\n🎮 Scanning Discord communities...');
  let discordData = { servers: {}, changes: [] };
  try {
    discordData = await scrapeDiscordCommunities();
    const foundCount = Object.values(discordData.servers).filter(s => s.memberCount).length;
    console.log(`  Found data for ${foundCount}/${Object.keys(discordData.servers).length} Discord servers`);
    if (discordData.changes?.length > 0) {
      console.log(`  Detected ${discordData.changes.length} notable change(s)`);
    }
  } catch (e) {
    console.log(`  Discord scrape error: ${e.message}`);
  }

  // Scrape App Store
  console.log('\n📱 Scanning App Store...');
  let appStoreData = null;
  try {
    appStoreData = await scrapeAppStore();
    if (appStoreData?.ios) {
      const foundCount = appStoreData.ios.filter(a => a.found).length;
      console.log(`  Found data for ${foundCount}/${appStoreData.ios.length} apps`);
      if (appStoreData.changes?.length > 0) {
        console.log(`  Detected ${appStoreData.changes.length} change(s)`);
      }
    }
  } catch (e) {
    console.log(`  App Store scrape error: ${e.message}`);
  }

  // Scrape Wikipedia pageviews
  console.log('\n📚 Scanning Wikipedia pageviews...');
  let wikiData = { competitors: {} };
  try {
    if (wikiPageviews) {
      wikiData = await wikiPageviews.collectPageviewData();
      const withData = Object.values(wikiData.competitors).filter(c => c.totalViews > 0).length;
      console.log(`  Found pageview data for ${withData} competitors`);
    }
  } catch (e) {
    console.log(`  Wikipedia scrape error: ${e.message}`);
  }

  // Generate executive summary
  const keyTakeaways = [];
  
  // Find significant signals
  for (const r of results) {
    const c = competitors.find(x => x.name === r.name);
    const jobs = c?.slug ? jobData[c.slug] : null;
    const pricing = pricingData.find(p => p.slug === c?.slug);
    const social = c?.slug ? socialData[c.slug] : null;
    
    // Heavy hiring = scaling up
    if (jobs?.estimatedCount >= 50) {
      keyTakeaways.push(`🔥 **${r.name}** is aggressively hiring (${jobs.estimatedCount}+ roles)`);
    } else if (jobs?.estimatedCount >= 20) {
      keyTakeaways.push(`📈 **${r.name}** is scaling up (${jobs.estimatedCount}+ roles)`);
    }
    
    // Pricing changes
    if (pricing?.changed) {
      keyTakeaways.push(`💰 **${r.name}** pricing page changed — review for updates`);
    }
    
    // Recent changelog = active development
    if (r.changelog[0]) {
      const latestDate = new Date(r.changelog[0]);
      const daysSince = Math.floor((Date.now() - latestDate) / (1000 * 60 * 60 * 24));
      if (daysSince <= 7) {
        keyTakeaways.push(`🚀 **${r.name}** released updates ${daysSince === 0 ? 'today' : daysSince + ' days ago'}`);
      }
    }
    
    // High HN engagement
    if (social?.hnMentions?.some(m => m.points > 100)) {
      const top = social.hnMentions.find(m => m.points > 100);
      keyTakeaways.push(`📰 **${r.name}** trending on HN: "${top.title}" (${top.points} pts)`);
    }
  }
  
  // Product Hunt launches
  if (phData.launches.length > 0) {
    keyTakeaways.push(`🆕 ${phData.launches.length} new AI coding tool(s) on Product Hunt today`);
  }
  
  // Tech news coverage
  if (newsData.newArticles.length > 0) {
    const topArticle = newsData.newArticles[0];
    keyTakeaways.push(`📰 Press coverage: "${topArticle.title}" (${topArticle.source})`);
  }
  
  // YouTube video activity
  if (youtubeData.newVideos.length > 0) {
    const topVideo = youtubeData.newVideos[0];
    keyTakeaways.push(`🎬 New video from **${topVideo.competitor}**: "${topVideo.title}"`);
  }
  
  // Stack Overflow activity (high question volume indicates adoption/issues)
  const soLeader = Object.entries(soData)
    .filter(([_, d]) => d.stats.totalQuestions >= 10)
    .sort((a, b) => b[1].stats.totalQuestions - a[1].stats.totalQuestions)[0];
  if (soLeader) {
    keyTakeaways.push(`📚 **${soLeader[1].name}** leading SO activity (${soLeader[1].stats.totalQuestions} questions this week)`);
  }

  // Funding news alerts
  if (fundingData.funding.length > 0) {
    const topFunding = fundingData.funding[0];
    keyTakeaways.push(`💵 **${topFunding.competitor}** funding news: "${topFunding.title.slice(0, 60)}..."`);
  }

  // VS Code Marketplace changes
  if (vscodeData.changes.length > 0) {
    const topChange = vscodeData.changes[0];
    keyTakeaways.push(`🔌 **${topChange.extension}**: ${topChange.change}`);
  }

  // Chrome Web Store changes
  if (chromeData.changes.length > 0) {
    chromeData.changes.forEach(c => {
      keyTakeaways.push(`🌐 **${c.extension}** Chrome: ${c.change}`);
    });
  }

  // Generate markdown
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  let md = `# Daily Competitive Briefing\n${date}\n\n`;

  // Add trend alerts if available
  if (trendDetector) {
    try {
      const alerts = trendDetector.getAllAlerts();
      if (alerts.length > 0) {
        md += trendDetector.formatAlertsMd(alerts);
        console.log(`  🚨 ${alerts.length} trend alert(s) detected`);
      }
    } catch (e) {
      console.log(`  Trend detection error: ${e.message}`);
    }
  }

  // Add executive summary if there are takeaways
  if (keyTakeaways.length > 0) {
    md += `## ⚡ Key Takeaways\n`;
    keyTakeaways.forEach(t => md += `${t}\n`);
    md += `\n---\n\n`;
  } else {
    md += `*No significant changes detected today. Full details below.*\n\n---\n\n`;
  }

  for (const r of results) {
    const c = competitors.find(x => x.name === r.name);
    const jobs = c?.slug ? jobData[c.slug] : null;
    const pricing = pricingData.find(p => p.slug === c?.slug);
    const social = c?.slug ? socialData[c.slug] : null;
    const youtube = c?.slug ? youtubeData.results[c.slug] : null;
    const stackoverflow = c?.slug ? soData[c.slug] : null;
    const chromeExt = chromeData.results.find(x => x.competitor === c?.slug);
    
    md += `## ${r.name}\n`;
    md += `**${r.website.description || 'No description available'}**\n\n`;
    
    // Combine signals from website scrape, job scrape, pricing, and social
    const allSignals = [...r.signals];
    if (jobs?.signals) {
      allSignals.push(...jobs.signals);
    }
    if (pricing?.signals?.length > 0 && !pricing.isBaseline) {
      allSignals.push(...pricing.signals);
    }
    if (social?.signals?.length > 0) {
      allSignals.push(...social.signals);
    }
    if (stackoverflow?.signals?.length > 0) {
      allSignals.push(...stackoverflow.signals);
    }
    
    if (allSignals.length > 0) {
      md += `📌 **Signals:**\n`;
      allSignals.forEach(s => md += `- ${s}\n`);
      md += '\n';
    }
    
    if (r.changelog.length > 0) {
      md += `📅 **Recent updates:** ${r.changelog.slice(0, 3).join(', ')}\n\n`;
    }
    
    // Add job summary
    if (jobs?.status === 'active' && jobs.estimatedCount > 0) {
      md += `💼 **Hiring:** ~${jobs.estimatedCount} open roles`;
      const cats = Object.keys(jobs.categories || {});
      if (cats.length > 0) {
        md += ` (${cats.join(', ')})`;
      }
      md += `\n\n`;
    }
    
    // Add pricing info (only show if prices detected)
    if (pricing?.prices?.length > 0) {
      md += `💰 **Pricing:** ${pricing.prices.slice(0, 5).join(', ')}\n`;
      if (pricing.tiers?.length > 0) {
        md += `📦 **Tiers:** ${pricing.tiers.join(', ')}\n`;
      }
      md += '\n';
    }
    
    // Add HN mentions (top 3)
    if (social?.hnMentions?.length > 0) {
      md += `📰 **Hacker News:**\n`;
      social.hnMentions.slice(0, 3).forEach(m => {
        md += `- [${m.title}](${m.url}) (${m.points} pts, ${m.comments} comments)\n`;
      });
      md += '\n';
    }
    
    // Add GitHub stats (only if stars data is available)
    if (social?.github && typeof social.github.stars === 'number') {
      md += `⭐ **GitHub:** ${social.github.stars.toLocaleString()} stars`;
      if (social.github.releases?.length > 0) {
        md += ` | Latest: ${social.github.releases[0].tag}`;
      }
      md += '\n\n';
    }
    
    // Add YouTube videos (top 2 relevant)
    if (youtube?.relevantVideos?.length > 0) {
      md += `🎬 **YouTube:**\n`;
      youtube.relevantVideos.slice(0, 2).forEach(v => {
        const daysSince = Math.floor((Date.now() - new Date(v.published)) / (1000 * 60 * 60 * 24));
        md += `- [${v.title}](${v.url}) (${daysSince}d ago)\n`;
      });
      md += '\n';
    }
    
    // Add Stack Overflow activity
    if (stackoverflow?.questions?.length > 0) {
      md += `📚 **Stack Overflow:** ${stackoverflow.stats.totalQuestions} questions`;
      if (stackoverflow.stats.unanswered > 0) {
        md += ` (${stackoverflow.stats.unanswered} unanswered)`;
      }
      md += `\n`;
      // Show top question if noteworthy
      const topQ = stackoverflow.questions[0];
      if (topQ && topQ.score >= 1) {
        md += `- [${topQ.title}](${topQ.url}) (${topQ.score} pts)\n`;
      }
      md += '\n';
    }
    
    // Add Chrome Web Store extension info
    if (chromeExt?.found && (chromeExt.users || chromeExt.rating)) {
      md += `🌐 **Chrome Extension:** `;
      if (chromeExt.users) {
        md += `${chromeExt.users.toLocaleString()} users`;
      }
      if (chromeExt.rating) {
        md += chromeExt.users ? `, ${chromeExt.rating}/5 rating` : `${chromeExt.rating}/5 rating`;
      }
      if (chromeExt.version) {
        md += ` (v${chromeExt.version})`;
      }
      md += `\n`;
      if (chromeExt.changes?.length > 0) {
        chromeExt.changes.forEach(c => md += `  ${c.change}\n`);
      }
      md += '\n';
    }
  }

  // Add Product Hunt section if there are launches
  if (phData.launches.length > 0) {
    md += `## 🚀 Product Hunt Watch\n`;
    md += `*New AI coding tools on Product Hunt today:*\n\n`;
    phData.launches.forEach(l => {
      md += `- **${l.name}** (${l.source}) — matched: "${l.matchedKeyword}"\n`;
    });
    md += '\n';
  }

  // Add tech news section if there are relevant articles
  if (newsData.allRelevantArticles.length > 0) {
    md += `## 📰 Tech Press Coverage\n`;
    md += `*Recent AI coding coverage from tech news:*\n\n`;
    newsData.allRelevantArticles.slice(0, 5).forEach(a => {
      md += `- [${a.title}](${a.link}) — *${a.source}*\n`;
    });
    md += '\n';
  }

  // Add YouTube section if there are new videos
  if (youtubeData.newVideos.length > 0) {
    md += `## 🎬 New Videos\n`;
    md += `*Recent videos from competitor channels:*\n\n`;
    youtubeData.newVideos.slice(0, 5).forEach(v => {
      md += `- **${v.competitor}**: [${v.title}](${v.url})\n`;
    });
    md += '\n';
  }

  // Add funding news section
  if (fundingData.funding.length > 0) {
    md += `## 💵 Funding & Investment News\n`;
    md += `*Recent funding, acquisitions, and partnerships:*\n\n`;
    fundingData.funding.slice(0, 5).forEach(f => {
      md += `- **${f.competitor}**: [${f.title}](${f.url}) — *${f.source}*\n`;
    });
    md += '\n';
  }

  // Add hiring trends section
  if (hiringTrendsReport && hiringTrendsReport.insights?.length > 0) {
    md += '\n---\n\n';
    md += formatReportMd(hiringTrendsReport);
  }

  // Add VS Code Marketplace section
  if (vscodeData.results.some(r => r.found)) {
    md += '\n---\n';
    md += generateVSCodeSection(vscodeData.results, vscodeData.changes);
  }

  // Add Chrome Web Store section
  const chromeFound = chromeData.results.filter(r => r.found && (r.users || r.rating));
  if (chromeFound.length > 0) {
    md += '\n---\n';
    md += generateChromeSection(chromeData.results, chromeData.changes);
  }

  // Add package registries section
  if (packagesData.npm?.length > 0 || packagesData.pypi?.length > 0) {
    md += '\n---\n';
    md += generatePackagesSection(packagesData);
  }

  // Add Discord community section
  if (Object.keys(discordData.servers || {}).length > 0) {
    md += '\n---\n';
    md += formatDiscordSection(discordData);
  }

  // Add App Store section
  if (appStoreData) {
    const appStoreSection = formatAppStoreSection(appStoreData);
    if (appStoreSection) {
      md += '\n---\n\n';
      md += appStoreSection;
    }
  }

  // Add Wikipedia pageviews section (public interest indicator)
  if (Object.keys(wikiData.competitors || {}).length > 0) {
    const sorted = Object.entries(wikiData.competitors)
      .filter(([_, info]) => info.totalViews > 0)
      .sort((a, b) => b[1].dailyAvg - a[1].dailyAvg);
    
    if (sorted.length > 0) {
      md += '\n---\n\n## 📚 Wikipedia Pageviews (Public Interest)\n\n';
      md += 'Wikipedia views as proxy for general public awareness:\n\n';
      md += '| Competitor | Daily Views | Weekly Trend |\n';
      md += '|------------|-------------|---------------|\n';
      
      sorted.forEach(([name, info]) => {
        const trend = info.weeklyChange > 0 ? `📈 +${info.weeklyChange}%` : 
                      info.weeklyChange < 0 ? `📉 ${info.weeklyChange}%` : '➡️ 0%';
        md += `| ${name} | ${info.dailyAvg.toLocaleString()}/day | ${trend} |\n`;
      });
      
      // Highlight significant changes
      const risers = sorted.filter(([_, i]) => i.weeklyChange > 15);
      if (risers.length > 0) {
        md += '\n**🚀 Rising Interest:**\n';
        risers.forEach(([name, info]) => {
          md += `- ${name}: +${info.weeklyChange}% week-over-week\n`;
        });
      }
    }
  }

  // Add pricing comparison table
  try {
    const { generateMarkdownTable } = require('./generate-pricing-comparison');
    md += '\n---\n\n';
    md += generateMarkdownTable();
  } catch (e) {
    // Pricing comparison not available
  }

  // Add momentum scores - the competitive ranking that matters
  try {
    const briefingData = {
      funding: fundingData.funding,
      hiringReport: hiringTrendsReport?.raw || '',
      vscodeData: vscodeData.results?.reduce((acc, r) => { acc[r.name] = r; return acc; }, {}),
      chromeData: chromeData.results?.reduce((acc, r) => { acc[r.name] = r; return acc; }, {}),
      news: newsData.allRelevantArticles,
      social: socialData,
      productHunt: phData.launches,
      competitors: results,
      youtube: youtubeData
    };
    const { scores, signals } = calculateMomentumScores(briefingData);
    saveMomentumHistory(scores);
    const { markdown: momentumMd } = generateMomentumReport(scores, signals);
    md += '\n---\n\n';
    md += momentumMd;
  } catch (e) {
    console.log(`  Momentum score error: ${e.message}`);
  }

  md += `\n---\n*Generated by Briefing at ${new Date().toISOString()}*\n`;
  md += `*https://kell.cx*\n`;

  // Save digest
  const filename = `briefing-${new Date().toISOString().split('T')[0]}.md`;
  const outPath = path.join(DIGEST_DIR, filename);
  fs.writeFileSync(outPath, md);
  
  console.log('\n📋 Briefing generated:\n');
  console.log(md);
  
  return { markdown: md, path: outPath };
}

// Run
generateBriefing()
  .then(result => {
    console.log(`\n✅ Saved to ${result.path}`);
  })
  .catch(console.error);
