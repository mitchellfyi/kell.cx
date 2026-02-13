#!/usr/bin/env node
/**
 * Twitter/X Profile Scraper using Browser Automation
 * 
 * Scrapes competitor Twitter profiles for:
 * - Follower counts
 * - Post counts
 * - Recent tweets (for engagement/announcement tracking)
 * 
 * Usage: node twitter-browser.js [handle]
 * If no handle provided, scrapes all configured competitors.
 */

const fs = require('fs');
const path = require('path');

// Competitor Twitter handles
const COMPETITORS = {
  'cursor': 'cursor_ai',
  'github-copilot': 'GitHubCopilot',
  'replit': 'Replit',
  'codeium': 'caborneium',  // Codeium/Windsurf
  'tabnine': 'taaborine',
  'amazon-q': 'awscloud',  // Amazon Q is under AWS
  'sourcegraph': 'sourcegraph',
  'codium': 'CodiumAI',  // Different from Codeium
  'continue': 'continuedev',
  'aider': 'aaborail',  // May not exist
  'bolt': 'stackblitz',  // Bolt is from StackBlitz
  'v0': 'v0',
};

const DATA_DIR = path.join(__dirname, '..', 'data', 'twitter');
const CONTROL_URL = 'http://127.0.0.1:18791';

// Parse follower count string like "308.1K" or "1.2M"
function parseFollowerCount(str) {
  if (!str) return null;
  const match = str.match(/([\d.]+)([KMB])?/i);
  if (!match) return null;
  
  let num = parseFloat(match[1]);
  const suffix = (match[2] || '').toUpperCase();
  
  if (suffix === 'K') num *= 1000;
  else if (suffix === 'M') num *= 1000000;
  else if (suffix === 'B') num *= 1000000000;
  
  return Math.round(num);
}

// Extract profile data from snapshot text
function extractProfileData(snapshotText, handle) {
  const data = {
    handle: handle,
    scrapedAt: new Date().toISOString(),
    followers: null,
    following: null,
    posts: null,
    bio: null,
    recentTweets: []
  };

  // Try to find followers
  const followersMatch = snapshotText.match(/(\d+(?:\.\d+)?[KMB]?)\s*Followers/i);
  if (followersMatch) {
    data.followers = parseFollowerCount(followersMatch[1]);
  }

  // Try to find following
  const followingMatch = snapshotText.match(/(\d+(?:\.\d+)?[KMB]?)\s*Following/i);
  if (followingMatch) {
    data.following = parseFollowerCount(followingMatch[1]);
  }

  // Try to find post count
  const postsMatch = snapshotText.match(/(\d+(?:\.\d+)?[KMB]?)\s*posts/i);
  if (postsMatch) {
    data.posts = parseFollowerCount(postsMatch[1]);
  }

  // Extract recent tweets from articles
  const tweetMatches = snapshotText.matchAll(/article\s+"[^"]*@\w+\s+(\w+\s+\d+)[^"]*"/g);
  for (const match of tweetMatches) {
    // Basic tweet info extraction
    const fullMatch = match[0];
    const date = match[1];
    
    // Try to extract engagement
    const repliesMatch = fullMatch.match(/(\d+)\s*repl/i);
    const repostsMatch = fullMatch.match(/(\d+)\s*repost/i);
    const likesMatch = fullMatch.match(/(\d+(?:\.\d+)?[KMB]?)\s*like/i);
    const viewsMatch = fullMatch.match(/(\d+(?:\.\d+)?[KMB]?)\s*view/i);
    
    data.recentTweets.push({
      date: date,
      replies: repliesMatch ? parseInt(repliesMatch[1]) : null,
      reposts: repostsMatch ? parseInt(repostsMatch[1]) : null,
      likes: likesMatch ? parseFollowerCount(likesMatch[1]) : null,
      views: viewsMatch ? parseFollowerCount(viewsMatch[1]) : null
    });
  }

  return data;
}

async function scrapeProfile(handle) {
  console.log(`Scraping @${handle}...`);
  
  try {
    // Navigate to profile
    const navResponse = await fetch(`${CONTROL_URL}/browser/navigate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: 'clawd',
        targetUrl: `https://twitter.com/${handle}`
      })
    });
    
    if (!navResponse.ok) {
      console.error(`  Navigation failed: ${navResponse.status}`);
      return null;
    }
    
    // Wait for page to load
    await new Promise(r => setTimeout(r, 2000));
    
    // Get snapshot
    const snapResponse = await fetch(`${CONTROL_URL}/browser/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: 'clawd',
        compact: true
      })
    });
    
    if (!snapResponse.ok) {
      console.error(`  Snapshot failed: ${snapResponse.status}`);
      return null;
    }
    
    const snapData = await snapResponse.json();
    const snapshotText = typeof snapData === 'string' ? snapData : JSON.stringify(snapData);
    
    // Check for "account doesn't exist"
    if (snapshotText.includes("account doesn't exist")) {
      console.log(`  Account @${handle} doesn't exist`);
      return { handle, error: 'not_found' };
    }
    
    const profileData = extractProfileData(snapshotText, handle);
    console.log(`  Followers: ${profileData.followers?.toLocaleString() || 'N/A'}`);
    console.log(`  Posts: ${profileData.posts?.toLocaleString() || 'N/A'}`);
    
    return profileData;
    
  } catch (err) {
    console.error(`  Error: ${err.message}`);
    return { handle, error: err.message };
  }
}

async function main() {
  const targetHandle = process.argv[2];
  
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  const results = {};
  const handles = targetHandle ? [targetHandle] : Object.values(COMPETITORS);
  
  for (const handle of handles) {
    const data = await scrapeProfile(handle);
    if (data) {
      results[handle] = data;
    }
    
    // Small delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Save results
  const outputPath = path.join(DATA_DIR, `twitter-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nSaved to ${outputPath}`);
  
  // Also save latest
  const latestPath = path.join(DATA_DIR, 'twitter-latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(results, null, 2));
  
  return results;
}

main().catch(console.error);
