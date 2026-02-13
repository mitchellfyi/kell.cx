#!/usr/bin/env node
/**
 * Aider Code Editing Benchmark Scraper
 * Tracks LLM performance on code editing tasks
 * Source: https://aider.chat/docs/leaderboards/
 */

const fs = require('fs');
const path = require('path');

const LEADERBOARD_URL = 'https://aider.chat/docs/leaderboards/';

async function fetchLeaderboard() {
  const res = await fetch(LEADERBOARD_URL);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return res.text();
}

function parseLeaderboard(html) {
  const results = [];
  
  // The leaderboard is in a table with class "leaderboard"
  // Each row has: Model, %, Cost, Command, Format %
  
  // Match table rows - looking for the data pattern
  const rowPattern = /<tr[^>]*>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
  
  // Alternative: Parse the structured data from script tags if available
  const jsonMatch = html.match(/const\s+leaderboardData\s*=\s*(\[[\s\S]*?\]);/);
  if (jsonMatch) {
    try {
      const data = eval(jsonMatch[1]);
      return data;
    } catch (e) {
      // Fall through to manual parsing
    }
  }
  
  // Manual parsing of visible table content
  // Look for model entries in the HTML
  const modelPattern = /class="[^"]*model[^"]*"[^>]*>([^<]+)<[\s\S]*?(\d+\.?\d*)%[\s\S]*?\$?([\d.]+)?/gi;
  
  let match;
  while ((match = modelPattern.exec(html)) !== null) {
    const [, model, score, cost] = match;
    if (model && score) {
      results.push({
        model: model.trim(),
        score: parseFloat(score),
        cost: cost ? parseFloat(cost) : null,
      });
    }
  }
  
  return results;
}

function parseFromText(text) {
  // Parse the markdown/text version of the leaderboard
  const lines = text.split('\n');
  const results = [];
  
  let currentModel = null;
  let currentScore = null;
  let currentCost = null;
  let currentCommand = null;
  let currentFormatScore = null;
  let currentFormat = null;
  
  // Patterns that indicate NOT a model name
  const notModelPatterns = [
    /^aider\s/i,
    /^OPENAI_API_BASE/i,
    /^ANTHROPIC/i,
    /^https?:/i,
    /--model/i,
    /^\$/,
    /^[\d.]+$/,
    /%$/,
    /^Total\s/i,
    /^Benchmark/i,
    /^Leaderboard/i,
    /^Code editing/i,
    /^Edit format/i,
    /^Model/i,
    /^Percent/i,
    /^Cost/i,
    /^Seconds/i,
    /^Average/i,
    /^per case/i,
    /^\d+\.\d+\.\d+/,  // Version numbers like 0.85.1.dev
    /^Versions?$/i,
    /^Notes?$/i,
    /^Data$/i,
    /^\d{4}-\d{2}-\d{2}$/,  // Dates like 2025-06-27
    /^Date:?$/i,
    /^Command:?$/i,
  ];
  
  const isModelName = (line) => {
    if (!line || line.length < 3 || line.length > 100) return false;
    return !notModelPatterns.some(p => p.test(line));
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Model name line (has text, not a percentage or command)
    if (isModelName(line)) {
      // Save previous entry if complete
      if (currentModel && currentScore !== null) {
        results.push({
          model: currentModel,
          score: currentScore,
          cost: currentCost,
          command: currentCommand,
          formatScore: currentFormatScore,
          format: currentFormat,
        });
      }
      currentModel = line;
      currentScore = null;
      currentCost = null;
      currentCommand = null;
      currentFormatScore = null;
      currentFormat = null;
      continue;
    }
    
    // Score line (percentage)
    const scoreMatch = line.match(/^(\d+\.?\d*)%$/);
    if (scoreMatch) {
      if (currentScore === null) {
        currentScore = parseFloat(scoreMatch[1]);
      } else {
        currentFormatScore = parseFloat(scoreMatch[1]);
      }
      continue;
    }
    
    // Cost line
    const costMatch = line.match(/^\$?([\d.]+)$/);
    if (costMatch && currentScore !== null) {
      currentCost = parseFloat(costMatch[1]);
      continue;
    }
    
    // Command line (may start with env vars like OPENAI_API_BASE=...)
    if (line.startsWith('aider ') || (line.includes('aider ') && line.includes('--model'))) {
      currentCommand = line;
      continue;
    }
    
    // Format line (diff, whole, architect, diff-fenced)
    if (['diff', 'whole', 'architect', 'diff-fenced'].includes(line)) {
      currentFormat = line;
      continue;
    }
  }
  
  // Don't forget last entry
  if (currentModel && currentScore !== null) {
    results.push({
      model: currentModel,
      score: currentScore,
      cost: currentCost,
      command: currentCommand,
      formatScore: currentFormatScore,
      format: currentFormat,
    });
  }
  
  return results;
}

async function main() {
  console.log('🔍 Fetching Aider Code Editing Benchmark...\n');
  
  try {
    const html = await fetchLeaderboard();
    
    // Try to extract text content for parsing
    // Remove script and style tags
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    const results = parseFromText(textContent);
    
    if (results.length === 0) {
      throw new Error('No results parsed from leaderboard');
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    // Add rankings
    results.forEach((r, i) => {
      r.rank = i + 1;
    });
    
    console.log(`  ✓ Parsed ${results.length} models\n`);
    console.log('  Top 10:');
    results.slice(0, 10).forEach(r => {
      const costStr = r.cost ? `$${r.cost.toFixed(2)}` : 'N/A';
      console.log(`    ${r.rank}. ${r.model}: ${r.score}% (${costStr})`);
    });
    
    // Categorize by provider
    const providers = {
      openai: results.filter(r => r.model.toLowerCase().includes('gpt') || r.model.toLowerCase().includes('o1') || r.model.toLowerCase().includes('o3') || r.model.toLowerCase().includes('o4')),
      anthropic: results.filter(r => r.model.toLowerCase().includes('claude')),
      google: results.filter(r => r.model.toLowerCase().includes('gemini') || r.model.toLowerCase().includes('gemma')),
      deepseek: results.filter(r => r.model.toLowerCase().includes('deepseek')),
      xai: results.filter(r => r.model.toLowerCase().includes('grok')),
      meta: results.filter(r => r.model.toLowerCase().includes('llama')),
      qwen: results.filter(r => r.model.toLowerCase().includes('qwen') || r.model.toLowerCase().includes('qwq')),
    };
    
    const output = {
      generatedAt: new Date().toISOString(),
      source: LEADERBOARD_URL,
      totalModels: results.length,
      topScore: results[0]?.score || 0,
      topModel: results[0]?.model || 'Unknown',
      leaderboard: results,
      byProvider: {
        openai: {
          count: providers.openai.length,
          topModel: providers.openai[0]?.model,
          topScore: providers.openai[0]?.score,
        },
        anthropic: {
          count: providers.anthropic.length,
          topModel: providers.anthropic[0]?.model,
          topScore: providers.anthropic[0]?.score,
        },
        google: {
          count: providers.google.length,
          topModel: providers.google[0]?.model,
          topScore: providers.google[0]?.score,
        },
        deepseek: {
          count: providers.deepseek.length,
          topModel: providers.deepseek[0]?.model,
          topScore: providers.deepseek[0]?.score,
        },
        xai: {
          count: providers.xai.length,
          topModel: providers.xai[0]?.model,
          topScore: providers.xai[0]?.score,
        },
      },
    };
    
    // Write to data directory
    const outDir = path.join(__dirname, '../data');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    
    const outPath = path.join(outDir, 'aider-benchmark.json');
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    
    console.log(`\n  📁 Written to: ${outPath}`);
    console.log(`  ⏰ Generated: ${output.generatedAt}`);
    
  } catch (err) {
    console.error(`\n  ✗ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
