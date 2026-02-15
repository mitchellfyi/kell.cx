#!/usr/bin/env node
/**
 * Competitive Analysis Script
 * 
 * Generates market analysis and competitive insights from scraped data.
 * Run via: npx tsx scripts/competitive-analysis.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { generateMarketAnalysis, MarketAnalysis, isAIAvailable } from '../lib/ai';

const DATA_DIR = join(process.cwd(), '..', 'data');
const OUTPUT_PATH = join(DATA_DIR, 'market-analysis.json');

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

interface AnalysisHistory {
  current: MarketAnalysis | null;
  history: MarketAnalysis[];
  generatedAt: string;
}

async function main() {
  log('Starting competitive analysis');

  if (!isAIAvailable()) {
    log('ERROR: OPENAI_API_KEY not set');
    process.exit(1);
  }

  // Load data
  const pricing = loadJSON<{ categories?: unknown[] }>('pricing.json', {});
  const releases = loadJSON<{ recentReleases?: unknown[] }>('github-releases.json', {});
  const hiring = loadJSON<{ companies?: unknown[] }>('hiring.json', {});

  log('Loaded data', {
    pricingCategories: pricing.categories?.length || 0,
    releases: releases.recentReleases?.length || 0,
    hiringCompanies: hiring.companies?.length || 0,
  });

  // Generate market analysis
  const result = await generateMarketAnalysis(
    pricing.categories?.slice(0, 5),
    releases.recentReleases?.slice(0, 20),
    hiring.companies?.slice(0, 10)
  );

  if (!result.success || !result.data) {
    log('ERROR: Failed to generate analysis', { error: result.error });
    process.exit(1);
  }

  log('Generated analysis', {
    marketLeaders: result.data.marketLeaders.length,
    emergingThreats: result.data.emergingThreats.length,
    usage: result.usage,
  });

  // Load existing history
  let history: MarketAnalysis[] = [];
  if (existsSync(OUTPUT_PATH)) {
    try {
      const existing: AnalysisHistory = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'));
      history = existing.history || [];
    } catch {
      log('Could not load existing history');
    }
  }

  // Add current to history (keep last 30 days)
  history.push(result.data);
  history = history.slice(-30);

  // Save output
  const output: AnalysisHistory = {
    current: result.data,
    history,
    generatedAt: new Date().toISOString(),
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  log('Saved analysis', { path: OUTPUT_PATH });

  // Print summary
  console.log('\n--- MARKET ANALYSIS ---');
  console.log(`\nMarket Leaders: ${result.data.marketLeaders.join(', ')}`);
  console.log(`\nEmerging Threats: ${result.data.emergingThreats.join(', ')}`);
  console.log(`\nPricing Trends: ${result.data.pricingTrends}`);
  console.log(`\nHiring Signals: ${result.data.hiringSignals}`);
  console.log(`\nStrategic Outlook: ${result.data.strategicOutlook}`);
  console.log('-----------------------\n');

  log('Done');
}

main().catch((error) => {
  log('Fatal error', { error: String(error) });
  process.exit(1);
});
