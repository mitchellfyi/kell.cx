#!/usr/bin/env node
/**
 * Benchmark Leaderboard Scraper
 * Tracks AI coding tool performance on standard benchmarks:
 * - SWE-bench (software engineering)
 * - HumanEval (code generation)
 * - MBPP (basic Python)
 * - Aider leaderboard
 * 
 * Saves historical data to detect when competitors improve scores.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data', 'benchmarks');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load historical data
function loadHistory() {
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  } catch (e) {
    return { lastUpdate: null, scores: {}, changes: [] };
  }
}

// Save historical data
function saveHistory(data) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
}

// Tracked competitors and their known benchmark presence
const COMPETITORS = [
  { name: 'Cursor', aliases: ['cursor', 'cursor-ai'] },
  { name: 'Devin', aliases: ['devin', 'cognition'] },
  { name: 'GitHub Copilot', aliases: ['copilot', 'github-copilot'] },
  { name: 'Codeium', aliases: ['codeium', 'windsurf'] },
  { name: 'Claude Code', aliases: ['claude', 'anthropic'] },
  { name: 'GPT-4', aliases: ['gpt-4', 'openai'] },
  { name: 'Aider', aliases: ['aider'] },
  { name: 'Cody', aliases: ['cody', 'sourcegraph'] },
  { name: 'Amazon Q', aliases: ['amazon-q', 'aws-q'] },
  { name: 'Continue', aliases: ['continue'] },
];

// Fetch with user agent
async function fetchPage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/json',
      },
      timeout: 15000,
    });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('json')) {
      return { type: 'json', data: await response.json() };
    }
    return { type: 'html', data: await response.text() };
  } catch (e) {
    console.error(`  Error fetching ${url}: ${e.message}`);
    return null;
  }
}

// Scrape SWE-bench leaderboard
async function scrapeSWEBench() {
  console.log('Scraping SWE-bench leaderboard...');
  const results = [];
  
  // SWE-bench lite results page (swebench.com)
  const url = 'https://www.swebench.com/';
  const page = await fetchPage(url);
  
  if (page && page.type === 'html') {
    const html = page.data;
    
    // Parse leaderboard table - looking for model names and scores
    // SWE-bench shows % resolved on their leaderboard
    const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
    if (tableMatch) {
      for (const table of tableMatch) {
        // Extract rows
        const rows = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
        for (const row of rows) {
          // Extract cells
          const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
          if (cells.length >= 2) {
            const nameCell = cells[0].replace(/<[^>]*>/g, '').trim();
            const scoreCell = cells[1].replace(/<[^>]*>/g, '').trim();
            const score = parseFloat(scoreCell);
            
            if (nameCell && !isNaN(score)) {
              // Check if this is a competitor we track
              for (const comp of COMPETITORS) {
                const nameLower = nameCell.toLowerCase();
                if (comp.aliases.some(a => nameLower.includes(a))) {
                  results.push({
                    competitor: comp.name,
                    benchmark: 'SWE-bench',
                    score: score,
                    rawName: nameCell,
                  });
                  break;
                }
              }
            }
          }
        }
      }
    }
  }
  
  // Also try the GitHub page with results
  const ghUrl = 'https://raw.githubusercontent.com/princeton-nlp/SWE-bench/main/docs/leaderboard.md';
  const ghPage = await fetchPage(ghUrl);
  
  if (ghPage && ghPage.type === 'html') {
    const lines = ghPage.data.split('\n');
    for (const line of lines) {
      // Parse markdown table rows: | Model | Score |
      if (line.startsWith('|') && !line.includes('---')) {
        const parts = line.split('|').map(p => p.trim()).filter(p => p);
        if (parts.length >= 2) {
          const name = parts[0];
          const score = parseFloat(parts[1]);
          
          if (!isNaN(score)) {
            for (const comp of COMPETITORS) {
              const nameLower = name.toLowerCase();
              if (comp.aliases.some(a => nameLower.includes(a))) {
                // Avoid duplicates
                if (!results.find(r => r.competitor === comp.name && r.benchmark === 'SWE-bench')) {
                  results.push({
                    competitor: comp.name,
                    benchmark: 'SWE-bench',
                    score: score,
                    rawName: name,
                  });
                }
                break;
              }
            }
          }
        }
      }
    }
  }
  
  return results;
}

// Scrape Aider leaderboard (aider.chat/docs/leaderboards)
async function scrapeAiderLeaderboard() {
  console.log('Scraping Aider leaderboard...');
  const results = [];
  
  const url = 'https://aider.chat/docs/leaderboards/';
  const page = await fetchPage(url);
  
  if (page && page.type === 'html') {
    const text = page.data;
    
    // Parse the text format: "model name\n\n XX.X%\n\n $X.XX"
    // Split by lines and look for score patterns
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    let currentModel = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this line is a percentage score
      const scoreMatch = line.match(/^(\d+\.?\d*)\s*%$/);
      if (scoreMatch && currentModel) {
        const score = parseFloat(scoreMatch[1]);
        
        // Check if current model matches a competitor
        for (const comp of COMPETITORS) {
          const nameLower = currentModel.toLowerCase();
          if (comp.aliases.some(a => nameLower.includes(a))) {
            // Only add if not already present with higher score
            const existing = results.find(r => r.competitor === comp.name && r.benchmark === 'Aider Polyglot');
            if (!existing || score > existing.score) {
              if (existing) {
                existing.score = score;
                existing.rawName = currentModel;
              } else {
                results.push({
                  competitor: comp.name,
                  benchmark: 'Aider Polyglot',
                  score: score,
                  rawName: currentModel,
                });
              }
            }
            break;
          }
        }
        currentModel = null;
      } else if (!line.startsWith('$') && !line.startsWith('aider') && !line.match(/^diff|whole|architect$/)) {
        // This might be a model name
        currentModel = line;
      }
    }
  }
  
  return results;
}

// Scrape Papers With Code leaderboards
async function scrapePapersWithCode() {
  console.log('Scraping Papers With Code...');
  const results = [];
  
  // HumanEval leaderboard
  const humanEvalUrl = 'https://paperswithcode.com/sota/code-generation-on-humaneval';
  const page = await fetchPage(humanEvalUrl);
  
  if (page && page.type === 'html') {
    const html = page.data;
    
    // Parse the leaderboard table
    const rows = html.match(/<tr[^>]*class="[^"]*"[^>]*>[\s\S]*?<\/tr>/gi) || [];
    
    for (const row of rows) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      if (cells.length >= 2) {
        // Model name is usually in first cell with a link
        const nameMatch = cells[0].match(/>([^<]+)</);
        const name = nameMatch ? nameMatch[1].trim() : cells[0].replace(/<[^>]*>/g, '').trim();
        
        // Score - look for percentage
        const scoreMatch = cells.join(' ').match(/(\d+\.?\d*)\s*%?/);
        const score = scoreMatch ? parseFloat(scoreMatch[1]) : NaN;
        
        if (name && !isNaN(score)) {
          for (const comp of COMPETITORS) {
            const nameLower = name.toLowerCase();
            if (comp.aliases.some(a => nameLower.includes(a))) {
              results.push({
                competitor: comp.name,
                benchmark: 'HumanEval',
                score: score,
                rawName: name,
              });
              break;
            }
          }
        }
      }
    }
  }
  
  return results;
}

// Main scraper function
async function scrapeBenchmarks() {
  console.log('=== Benchmark Leaderboard Scraper ===\n');
  
  const history = loadHistory();
  const allResults = [];
  
  // Run all scrapers
  const sweResults = await scrapeSWEBench();
  allResults.push(...sweResults);
  
  const aiderResults = await scrapeAiderLeaderboard();
  allResults.push(...aiderResults);
  
  const pwcResults = await scrapePapersWithCode();
  allResults.push(...pwcResults);
  
  // Detect changes from previous run
  const changes = [];
  const today = new Date().toISOString().split('T')[0];
  
  for (const result of allResults) {
    const key = `${result.competitor}:${result.benchmark}`;
    const previous = history.scores[key];
    
    if (previous) {
      const delta = result.score - previous.score;
      if (Math.abs(delta) > 0.1) { // Significant change threshold
        changes.push({
          competitor: result.competitor,
          benchmark: result.benchmark,
          previousScore: previous.score,
          newScore: result.score,
          delta: delta,
          date: today,
        });
      }
    }
    
    // Update history
    history.scores[key] = {
      score: result.score,
      rawName: result.rawName,
      lastSeen: today,
    };
  }
  
  // Store changes
  if (changes.length > 0) {
    history.changes.push(...changes);
    // Keep last 100 changes
    if (history.changes.length > 100) {
      history.changes = history.changes.slice(-100);
    }
  }
  
  history.lastUpdate = today;
  saveHistory(history);
  
  // Output results
  console.log('\n=== Current Scores ===');
  const byBenchmark = {};
  for (const r of allResults) {
    if (!byBenchmark[r.benchmark]) byBenchmark[r.benchmark] = [];
    byBenchmark[r.benchmark].push(r);
  }
  
  for (const [benchmark, scores] of Object.entries(byBenchmark)) {
    console.log(`\n${benchmark}:`);
    scores.sort((a, b) => b.score - a.score);
    for (const s of scores) {
      console.log(`  ${s.competitor}: ${s.score}%`);
    }
  }
  
  if (changes.length > 0) {
    console.log('\n=== Changes Detected ===');
    for (const c of changes) {
      const direction = c.delta > 0 ? '📈' : '📉';
      console.log(`${direction} ${c.competitor} on ${c.benchmark}: ${c.previousScore}% → ${c.newScore}% (${c.delta > 0 ? '+' : ''}${c.delta.toFixed(1)}%)`);
    }
  } else {
    console.log('\nNo significant changes detected.');
  }
  
  return { results: allResults, changes };
}

// Export for use in daily briefing
module.exports = { scrapeBenchmarks };

// Run if called directly
if (require.main === module) {
  scrapeBenchmarks()
    .then(() => process.exit(0))
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
}
