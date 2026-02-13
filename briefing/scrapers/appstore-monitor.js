#!/usr/bin/env node
/**
 * App Store Monitor - Tracks competitor mobile apps
 * Data source: iTunes Search API + Google Play Store
 * 
 * Usage: node appstore-monitor.js
 */

const fs = require('fs');
const path = require('path');

// Competitor mobile apps to track
// Using iTunes lookup API with exact app IDs where known
const MOBILE_APPS = {
  // iOS App Store (iTunes) - use app ID for precise lookup
  ios: [
    { competitor: 'GitHub', appId: 1477376905 },         // Main GitHub app (includes Copilot features)
    { competitor: 'Replit', appId: 1614022293 },         // Replit: Vibe Code Apps
    { competitor: 'ChatGPT', appId: 6448311069 },        // OpenAI ChatGPT (AI coding competitor)
    { competitor: 'AWS Console', appId: 580990573 },     // Amazon Q lives here
    { competitor: 'Mimo', appId: 1133960732 },           // Mimo - coding education (market context)
  ],
  // Google Play Store
  android: [
    { competitor: 'Replit', packageName: 'com.replit.app', url: 'https://play.google.com/store/apps/details?id=com.replit.app' },
    { competitor: 'GitHub', packageName: 'com.github.android', url: 'https://play.google.com/store/apps/details?id=com.github.android' },
    { competitor: 'Amazon Q', packageName: null, searchTerm: 'Amazon Q Developer' },
  ]
};

const DATA_DIR = path.join(__dirname, '../data');
const CACHE_FILE = path.join(DATA_DIR, 'appstore-cache.json');
const LATEST_FILE = path.join(DATA_DIR, 'appstore-latest.json');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

async function lookupItunesAppById(appId) {
  try {
    const url = `https://itunes.apple.com/lookup?id=${appId}&country=us`;
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data.results || data.results.length === 0) return null;
    
    return data.results[0];
  } catch (error) {
    console.error(`iTunes lookup error for ID ${appId}:`, error.message);
    return null;
  }
}

async function searchItunesApp(searchTerm, developerFilter = null) {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=software&limit=10&country=us`;
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data.results || data.results.length === 0) return null;
    
    // Find best match - filter by developer if specified
    let results = data.results;
    if (developerFilter) {
      results = results.filter(a => a.artistName.toLowerCase().includes(developerFilter.toLowerCase()));
    }
    
    const app = results.find(a => 
      a.trackName.toLowerCase().includes(searchTerm.toLowerCase().split(' ')[0])
    ) || results[0];
    return app;  // Return raw iTunes result
  } catch (error) {
    console.error(`iTunes search error for "${searchTerm}":`, error.message);
    return null;
  }
}

async function scrapeGooglePlayBasic(url) {
  // Google Play requires browser scraping for full data
  // For now, return a placeholder - can enhance with Puppeteer later
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Basic parsing
    const titleMatch = html.match(/<h1[^>]*>([^<]+)</);
    const ratingMatch = html.match(/(\d+\.\d+)<\/div>[^<]*star/i) || html.match(/aria-label="Rated (\d+\.\d+)/);
    const installsMatch = html.match(/>(\d+[KMB]?\+?)\s*downloads</i) || html.match(/>(\d+,\d+,\d+\+?)</);
    
    return {
      name: titleMatch ? titleMatch[1] : 'Unknown',
      rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
      installs: installsMatch ? installsMatch[1] : 'Unknown',
      url: url,
      platform: 'android'
    };
  } catch (error) {
    console.error(`Google Play scrape error for ${url}:`, error.message);
    return null;
  }
}

async function collectAppData() {
  const results = {
    timestamp: new Date().toISOString(),
    ios: [],
    android: [],
    summary: {}
  };
  
  console.log('📱 Collecting iOS App Store data...');
  
  for (const app of MOBILE_APPS.ios) {
    console.log(`  Checking: ${app.competitor}`);
    
    let rawApp = null;
    if (app.appId) {
      // Direct lookup by app ID
      rawApp = await lookupItunesAppById(app.appId);
    } else if (app.searchTerm) {
      // Search with optional developer filter
      rawApp = await searchItunesApp(app.searchTerm, app.developerFilter);
    }
    
    const data = rawApp ? {
      name: rawApp.trackName,
      developer: rawApp.artistName,
      appId: rawApp.trackId,
      bundleId: rawApp.bundleId,
      price: rawApp.formattedPrice || 'Free',
      rating: rawApp.averageUserRating || null,
      ratingCount: rawApp.userRatingCount || 0,
      version: rawApp.version,
      releaseDate: rawApp.releaseDate,
      currentVersionReleaseDate: rawApp.currentVersionReleaseDate,
      description: rawApp.description?.substring(0, 200) + '...',
      url: rawApp.trackViewUrl,
      iconUrl: rawApp.artworkUrl100,
      size: rawApp.fileSizeBytes ? Math.round(rawApp.fileSizeBytes / 1024 / 1024) + ' MB' : null,
    } : null;
    
    if (data) {
      results.ios.push({
        competitor: app.competitor,
        found: true,
        ...data
      });
      console.log(`    ✅ ${data.name} - ${data.rating ? data.rating.toFixed(1) + '★' : 'No rating'} (${data.ratingCount.toLocaleString()} reviews)`);
    } else {
      results.ios.push({
        competitor: app.competitor,
        found: false,
        note: app.appId ? `App ID ${app.appId}` : app.searchTerm
      });
      console.log(`    ❌ Not found`);
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n🤖 Collecting Google Play data...');
  
  for (const app of MOBILE_APPS.android) {
    if (app.url) {
      console.log(`  Checking: ${app.competitor}`);
      const data = await scrapeGooglePlayBasic(app.url);
      
      if (data) {
        results.android.push({
          competitor: app.competitor,
          found: true,
          packageName: app.packageName,
          ...data
        });
        console.log(`    ✅ Found: ${data.name}`);
      } else {
        results.android.push({
          competitor: app.competitor,
          found: false,
          url: app.url
        });
        console.log(`    ❌ Could not scrape`);
      }
      
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  // Generate summary
  const iosApps = results.ios.filter(a => a.found);
  const highestRated = iosApps.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  const mostReviewed = iosApps.sort((a, b) => (b.ratingCount || 0) - (a.ratingCount || 0))[0];
  
  results.summary = {
    iosAppsFound: iosApps.length,
    androidAppsFound: results.android.filter(a => a.found).length,
    highestRatedIos: highestRated ? `${highestRated.competitor}: ${highestRated.rating?.toFixed(1)}★` : null,
    mostReviewsIos: mostReviewed ? `${mostReviewed.competitor}: ${mostReviewed.ratingCount?.toLocaleString()} reviews` : null,
  };
  
  return results;
}

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  } catch (e) {}
  return null;
}

function saveData(data) {
  // Ensure directories exist
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
  
  // Save cache and latest
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  fs.writeFileSync(LATEST_FILE, JSON.stringify(data, null, 2));
  
  // Save to history
  const dateStr = new Date().toISOString().split('T')[0];
  const historyFile = path.join(HISTORY_DIR, `appstore-${dateStr}.json`);
  fs.writeFileSync(historyFile, JSON.stringify(data, null, 2));
  
  console.log(`\n💾 Saved to ${LATEST_FILE}`);
}

function detectChanges(current, previous) {
  if (!previous) return [];
  
  const changes = [];
  
  for (const app of current.ios) {
    if (!app.found) continue;
    
    const prevApp = previous.ios?.find(p => p.competitor === app.competitor && p.found);
    if (!prevApp) {
      changes.push(`🆕 ${app.competitor} iOS app newly detected`);
      continue;
    }
    
    // Version change
    if (app.version && prevApp.version && app.version !== prevApp.version) {
      changes.push(`📲 ${app.competitor} iOS updated: v${prevApp.version} → v${app.version}`);
    }
    
    // Rating change (significant)
    if (app.rating && prevApp.rating) {
      const diff = app.rating - prevApp.rating;
      if (Math.abs(diff) >= 0.2) {
        const emoji = diff > 0 ? '📈' : '📉';
        changes.push(`${emoji} ${app.competitor} iOS rating: ${prevApp.rating.toFixed(1)} → ${app.rating.toFixed(1)}`);
      }
    }
    
    // Review count growth
    if (app.ratingCount && prevApp.ratingCount) {
      const growth = app.ratingCount - prevApp.ratingCount;
      if (growth > 100) {
        changes.push(`💬 ${app.competitor} iOS: +${growth.toLocaleString()} new reviews`);
      }
    }
  }
  
  return changes;
}

async function main() {
  console.log('📱 App Store Monitor - Briefing\n');
  
  const cache = loadCache();
  const data = await collectAppData();
  
  // Detect changes
  const changes = detectChanges(data, cache);
  if (changes.length > 0) {
    console.log('\n🔔 Changes detected:');
    changes.forEach(c => console.log(`  ${c}`));
    data.changes = changes;
  }
  
  saveData(data);
  
  console.log('\n📊 Summary:');
  console.log(`  iOS apps found: ${data.summary.iosAppsFound}`);
  console.log(`  Android apps found: ${data.summary.androidAppsFound}`);
  if (data.summary.highestRatedIos) console.log(`  Highest rated (iOS): ${data.summary.highestRatedIos}`);
  if (data.summary.mostReviewsIos) console.log(`  Most reviews (iOS): ${data.summary.mostReviewsIos}`);
}

main().catch(console.error);
