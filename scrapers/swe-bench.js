#!/usr/bin/env node
/**
 * SWE-bench Leaderboard Scraper
 * Fetches latest benchmark results from SWE-bench GitHub
 * 
 * Source: https://github.com/SWE-bench/swe-bench.github.io
 * Data: data/leaderboards.json
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'swe-bench.json');
const SOURCE_URL = 'https://raw.githubusercontent.com/SWE-bench/swe-bench.github.io/master/data/leaderboards.json';

async function fetchLeaderboards() {
  console.log('Fetching SWE-bench leaderboard data...');
  
  const res = await fetch(SOURCE_URL, {
    headers: {
      'User-Agent': 'Briefing/1.0 (+https://kell.cx)',
      'Accept': 'application/json'
    }
  });
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  
  return res.json();
}

function processLeaderboard(leaderboard) {
  // Extract relevant fields, skip per_instance_details for size
  // Note: 'resolved' is already a percentage (e.g., 74.4 means 74.4%)
  return leaderboard.results.map(entry => ({
    name: entry.name,
    date: entry.date,
    resolved_pct: entry.resolved, // 'resolved' field is the percentage
    cost: entry.cost,
    instance_cost: entry.instance_cost,
    logo: entry.logo?.[0] || null,
    os_model: entry.os_model,
    os_system: entry.os_system,
    site: entry.site || null,
    tags: entry.tags || []
  })).filter(e => e.resolved_pct !== undefined && e.resolved_pct !== null);
}

function rankByResolved(entries) {
  return entries
    .sort((a, b) => (b.resolved_pct || 0) - (a.resolved_pct || 0))
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

async function main() {
  try {
    const data = await fetchLeaderboards();
    
    // Find key leaderboards
    const leaderboards = {};
    const targetBoards = ['lite', 'verified', 'test', 'bash-only'];
    
    for (const board of data.leaderboards) {
      const name = board.name?.toLowerCase() || '';
      
      for (const target of targetBoards) {
        if (name === target || name.includes(target)) {
          const processed = processLeaderboard(board);
          const ranked = rankByResolved(processed);
          
          leaderboards[target] = {
            name: board.name,
            entry_count: ranked.length,
            top_10: ranked.slice(0, 10),
            updated: ranked[0]?.date || null
          };
          break;
        }
      }
    }
    
    // Summary stats
    const summary = {
      scraped_at: new Date().toISOString(),
      source: 'https://www.swebench.com/',
      source_repo: 'https://github.com/SWE-bench/swe-bench.github.io',
      leaderboard_count: Object.keys(leaderboards).length,
      leaderboards
    };
    
    // Print summary
    console.log('\nLeaderboard Summary:');
    for (const [key, board] of Object.entries(leaderboards)) {
      console.log(`\n${board.name} (${board.entry_count} entries):`);
      const top3 = board.top_10.slice(0, 3);
      top3.forEach((e, i) => {
        const pct = e.resolved_pct?.toFixed(1) || 'N/A';
        const cost = e.cost ? `$${e.cost.toFixed(2)}` : 'N/A';
        console.log(`  ${i + 1}. ${e.name}: ${pct}% (cost: ${cost})`);
      });
    }
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(summary, null, 2));
    console.log(`\n✓ Saved to ${OUTPUT_FILE}`);
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
