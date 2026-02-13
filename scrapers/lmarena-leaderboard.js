#!/usr/bin/env node
/**
 * LMArena (Chatbot Arena) Leaderboard Scraper
 * 
 * Scrapes the arena.ai leaderboard for model rankings.
 * This is one of the most referenced AI benchmarks (7M+ human votes).
 * 
 * Output: data/lmarena-leaderboard.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const LEADERBOARD_URL = 'https://arena.ai/leaderboard';
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'lmarena-leaderboard.json');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Briefing/1.0 (kell.cx)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function extractLeaderboardData(html) {
  const models = [];
  
  // The data is JSON-escaped in the HTML. Look for patterns like:
  // \"name\":\"model\",\"organization\":\"Org\",...\"overall\":1
  const pattern = /\\"name\\":\\"([^\\]+)\\",\\"organization\\":\\"([^\\]+)\\"([^\}]+)\\"overall\\":(\d+)/g;
  let match;
  
  const seen = new Set();
  
  while ((match = pattern.exec(html)) !== null) {
    const name = match[1];
    const org = match[2];
    const dataStr = match[3];
    const overall = parseInt(match[4], 10);
    
    // Skip duplicates
    if (seen.has(name)) continue;
    seen.add(name);
    
    // Extract other rankings from the data string
    const getNum = (key) => {
      const m = dataStr.match(new RegExp(`\\\\"${key}\\\\":(-?\\d+)`));
      return m ? parseInt(m[1], 10) : null;
    };
    
    models.push({
      name,
      organization: org,
      rank_overall: overall,
      rank_math: getNum('math'),
      rank_coding: getNum('coding'),
      rank_creative_writing: getNum('creative-writing'),
      rank_instruction_following: getNum('instruction-following'),
      rank_multi_turn: getNum('multi-turn'),
      rank_hard_prompts: getNum('hard-prompts'),
      rank_english: getNum('english'),
      rank_expert: getNum('expert'),
    });
  }
  
  return models;
}

async function main() {
  console.log('Fetching LMArena leaderboard...');
  
  try {
    const html = await fetch(LEADERBOARD_URL);
    const models = extractLeaderboardData(html);
    
    // Sort by overall rank
    models.sort((a, b) => a.rank_overall - b.rank_overall);
    
    const output = {
      source: 'arena.ai',
      description: 'LMArena Chatbot Arena - crowdsourced AI model rankings based on 7M+ human votes',
      fetched_at: new Date().toISOString(),
      total_models: models.length,
      categories: [
        'overall', 'math', 'coding', 'creative_writing',
        'instruction_following', 'multi_turn', 'hard_prompts', 'english', 'expert'
      ],
      models: models
    };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`Saved ${models.length} models to ${OUTPUT_FILE}`);
    
    // Print top 15
    console.log('\nTop 15 models (overall):');
    models.slice(0, 15).forEach((m) => {
      console.log(`  #${m.rank_overall} ${m.organization} ${m.name}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
