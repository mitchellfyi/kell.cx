#!/usr/bin/env node
/**
 * YouTube Channel Monitoring for Competitor Intel
 * Fetches recent videos from competitor YouTube channels via RSS feeds
 * (No API key needed - uses public RSS feeds)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const YOUTUBE_STATE_FILE = path.join(DATA_DIR, 'youtube-state.json');

// YouTube channel IDs for competitors
// Format: RSS feed is https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
const CHANNELS = [
  { name: 'Cursor', channelId: 'UCSOxsxkZuwYCUSMLpJ3bqXg', slug: 'cursor' },
  { name: 'Replit', channelId: 'UCJVs8VrXkdN7MxPhPnSyahw', slug: 'replit' },
  { name: 'GitHub', channelId: 'UC7c3Kb6jYCRj4JOHHZTxKsQ', slug: 'copilot' },
  { name: 'Codeium', channelId: 'UCBEZePZb2qQ4YeP0dKrh8_A', slug: 'windsurf' },
  { name: 'Sourcegraph', channelId: 'UCOy2N25-AHqE43XupT9mwZQ', slug: 'cody' },
  { name: 'Tabnine', channelId: 'UCnKT8s5jQZQ8eW7JWPVFYpA', slug: 'tabnine' },
  { name: 'AWS Developers', channelId: 'UCraiFqWi0qSIxXxXN4IHFBQ', slug: 'amazonq' },
  { name: 'Continue.dev', channelId: 'UCmqVdcCPuC1Qj7Q_-1Zq6nA', slug: 'continue' },
];

// Keywords to identify relevant videos
const RELEVANT_KEYWORDS = [
  'copilot', 'ai', 'code', 'assistant', 'autocomplete', 'completion',
  'cursor', 'agent', 'dev', 'developer', 'coding', 'programming',
  'ide', 'editor', 'chat', 'llm', 'claude', 'gpt', 'model',
  'feature', 'launch', 'update', 'new', 'introducing', 'demo'
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Briefing/1.0)' },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function parseYouTubeFeed(xml) {
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = entry.match(/<title>([^<]+)<\/title>/)?.[1];
    const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
    const updated = entry.match(/<updated>([^<]+)<\/updated>/)?.[1];
    
    if (videoId && title) {
      entries.push({
        videoId,
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
        published: new Date(published),
        updated: new Date(updated),
        url: `https://www.youtube.com/watch?v=${videoId}`
      });
    }
  }
  
  return entries;
}

function isRelevantVideo(video) {
  const titleLower = video.title.toLowerCase();
  return RELEVANT_KEYWORDS.some(kw => titleLower.includes(kw));
}

function loadState() {
  try {
    if (fs.existsSync(YOUTUBE_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(YOUTUBE_STATE_FILE, 'utf8'));
    }
  } catch (e) {}
  return { lastSeen: {}, lastRun: null };
}

function saveState(state) {
  state.lastRun = new Date().toISOString();
  fs.writeFileSync(YOUTUBE_STATE_FILE, JSON.stringify(state, null, 2));
}

async function scrapeChannel(channel, state) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`;
  
  try {
    const xml = await fetch(feedUrl);
    const videos = parseYouTubeFeed(xml);
    
    // Get last seen video for this channel
    const lastSeenId = state.lastSeen[channel.slug];
    const newVideos = [];
    
    for (const video of videos) {
      // Check if we've seen this video before
      if (lastSeenId === video.videoId) break;
      
      // Only include videos from last 7 days
      const daysSince = (Date.now() - video.published) / (1000 * 60 * 60 * 24);
      if (daysSince > 7) continue;
      
      newVideos.push(video);
    }
    
    // Update last seen
    if (videos.length > 0) {
      state.lastSeen[channel.slug] = videos[0].videoId;
    }
    
    return {
      name: channel.name,
      slug: channel.slug,
      allRecent: videos.slice(0, 5),
      newVideos: newVideos,
      relevantVideos: videos.filter(isRelevantVideo).slice(0, 3)
    };
  } catch (e) {
    return {
      name: channel.name,
      slug: channel.slug,
      error: e.message,
      allRecent: [],
      newVideos: [],
      relevantVideos: []
    };
  }
}

async function scrapeYouTube() {
  const state = loadState();
  const isFirstRun = !state.lastRun;
  
  console.log('🎬 Scanning YouTube channels...');
  
  const results = {};
  const allNewVideos = [];
  const signals = [];
  
  for (const channel of CHANNELS) {
    console.log(`  → ${channel.name}`);
    const data = await scrapeChannel(channel, state);
    results[channel.slug] = data;
    
    if (data.newVideos.length > 0 && !isFirstRun) {
      data.newVideos.forEach(v => {
        allNewVideos.push({ ...v, competitor: channel.name, slug: channel.slug });
      });
    }
    
    // Generate signals for recent activity
    if (data.relevantVideos.length > 0) {
      const latest = data.relevantVideos[0];
      const daysSince = Math.floor((Date.now() - latest.published) / (1000 * 60 * 60 * 24));
      if (daysSince <= 3) {
        signals.push(`${channel.name} posted video ${daysSince === 0 ? 'today' : daysSince + 'd ago'}: "${latest.title}"`);
      }
    }
  }
  
  saveState(state);
  
  // Summary
  if (allNewVideos.length > 0) {
    console.log(`\n  🆕 ${allNewVideos.length} new video(s) since last check`);
  }
  
  return {
    results,
    newVideos: allNewVideos,
    signals,
    isFirstRun
  };
}

module.exports = { scrapeYouTube };

// CLI
if (require.main === module) {
  scrapeYouTube()
    .then(data => {
      console.log('\n📊 YouTube Summary:');
      
      Object.values(data.results).forEach(r => {
        if (r.error) {
          console.log(`  ${r.name}: Error - ${r.error}`);
        } else if (r.relevantVideos.length > 0) {
          console.log(`  ${r.name}: ${r.relevantVideos.length} relevant videos`);
          r.relevantVideos.forEach(v => {
            console.log(`    - ${v.title}`);
          });
        } else {
          console.log(`  ${r.name}: No relevant videos`);
        }
      });
      
      if (data.newVideos.length > 0) {
        console.log('\n🆕 New Videos:');
        data.newVideos.forEach(v => {
          console.log(`  - [${v.competitor}] ${v.title}`);
          console.log(`    ${v.url}`);
        });
      }
      
      if (data.signals.length > 0) {
        console.log('\n📌 Signals:');
        data.signals.forEach(s => console.log(`  - ${s}`));
      }
    })
    .catch(console.error);
}
