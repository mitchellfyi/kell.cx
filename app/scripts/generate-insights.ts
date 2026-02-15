#!/usr/bin/env node
/**
 * Generate AI Insights Script
 * 
 * Reads data from scraped JSON files and generates AI-powered insights.
 * Run via: node --experimental-strip-types scripts/generate-insights.ts
 * 
 * Environment:
 *   OPENAI_API_KEY - Required
 *   OPENAI_MODEL - Optional (default: gpt-4o)
 *   AI_DEBUG - Optional (set to 'true' for verbose logging)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { generateDailyInsights, DataSources, isAIAvailable } from '../lib/ai/index.js';

const DATA_DIR = join(process.cwd(), '..', 'data');
const OUTPUT_PATH = join(DATA_DIR, 'ai-insights.json');

function log(msg: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`, meta ? JSON.stringify(meta) : '');
}

function loadJSON<T>(filename: string, defaultValue: T): T {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) {
    log(`File not found: ${filename}`);
    return defaultValue;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    log(`Failed to parse ${filename}`, { error: String(e) });
    return defaultValue;
  }
}

async function main() {
  log('Starting AI insights generation');
  
  // Check AI availability
  if (!isAIAvailable()) {
    log('ERROR: OPENAI_API_KEY not set');
    process.exit(1);
  }
  
  // Load data sources
  const hnData = loadJSON<{ stories?: Array<{ title: string; points: number; comments: number; url: string }> }>('hn-mentions.json', {});
  const releasesData = loadJSON<{ recentReleases?: Array<{ company: string; tag: string; publishedAt: string }> }>('github-releases.json', {});
  const hiringData = loadJSON<{ companies?: Array<{ company: string; openRoles: number; change?: number }> }>('hiring.json', {});
  const benchmarkData = loadJSON<{ leaderboard?: Array<{ model: string; score: number; rank: number }> }>('aider-benchmark.json', {});
  
  const dataSources: DataSources = {
    hnStories: hnData.stories?.slice(0, 20),
    releases: releasesData.recentReleases?.slice(0, 10),
    hiring: hiringData.companies?.slice(0, 10),
    benchmarks: benchmarkData.leaderboard?.slice(0, 10),
  };
  
  log('Loaded data sources', {
    hnStories: dataSources.hnStories?.length || 0,
    releases: dataSources.releases?.length || 0,
    hiring: dataSources.hiring?.length || 0,
    benchmarks: dataSources.benchmarks?.length || 0,
  });
  
  // Generate insights
  const result = await generateDailyInsights(dataSources);
  
  if (!result.success) {
    log('ERROR: Failed to generate insights', { error: result.error });
    process.exit(1);
  }
  
  log('Generated insights', {
    count: result.data?.insights.length || 0,
    usage: result.usage,
    latencyMs: result.latencyMs,
  });
  
  // Save results
  writeFileSync(OUTPUT_PATH, JSON.stringify(result.data, null, 2));
  log(`Saved insights to ${OUTPUT_PATH}`);
  
  // Print summary
  console.log('\n--- INSIGHTS SUMMARY ---');
  result.data?.insights.forEach((insight, i) => {
    console.log(`${i + 1}. [${insight.significance.toUpperCase()}] ${insight.headline}`);
    console.log(`   ${insight.summary}\n`);
  });
  console.log(`Market: ${result.data?.marketSummary}`);
  console.log('------------------------\n');
  
  log('Done');
}

main().catch((error) => {
  log('Fatal error', { error: String(error) });
  process.exit(1);
});
