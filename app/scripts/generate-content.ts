#!/usr/bin/env node
/**
 * Generate Evergreen Content Script
 * 
 * Generates tool guides, comparisons, and trend reports.
 * Run via: npx tsx scripts/generate-content.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { 
  generateTrendReport, 
  generateComparison,
  TrendReport,
  ComparisonPage,
  isAIAvailable 
} from '../lib/ai';

const DATA_DIR = join(process.cwd(), '..', 'data');
const CONTENT_DIR = join(DATA_DIR, 'generated');

function log(msg: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`, meta ? JSON.stringify(meta) : '');
}

function loadJSON<T>(filename: string, defaultValue: T): T {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) return defaultValue;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return defaultValue;
  }
}

// Key tool comparisons to generate
const COMPARISONS = [
  ['Cursor', 'GitHub Copilot', 'Windsurf'],
  ['Claude Code', 'Aider', 'Codex CLI'],
  ['Cline', 'Continue', 'Roo Code'],
];

interface ContentIndex {
  trendReport: TrendReport | null;
  comparisons: ComparisonPage[];
  generatedAt: string;
}

async function main() {
  log('Starting content generation');

  if (!isAIAvailable()) {
    log('ERROR: OPENAI_API_KEY not set');
    process.exit(1);
  }

  // Ensure content directory exists
  if (!existsSync(CONTENT_DIR)) {
    mkdirSync(CONTENT_DIR, { recursive: true });
  }

  // Load data
  const pricing = loadJSON<{ categories?: unknown[] }>('pricing.json', {});
  const releases = loadJSON<{ recentReleases?: unknown[] }>('github-releases.json', {});
  const hn = loadJSON<{ stories?: unknown[] }>('hn-mentions.json', {});
  const news = loadJSON<{ stories?: unknown[] }>('news-aggregated.json', {});

  const combinedData = {
    pricing: pricing.categories?.slice(0, 10),
    releases: releases.recentReleases?.slice(0, 20),
    hnStories: hn.stories?.slice(0, 15),
    news: news.stories?.slice(0, 20),
  };

  const content: ContentIndex = {
    trendReport: null,
    comparisons: [],
    generatedAt: new Date().toISOString(),
  };

  // Generate trend report
  const period = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  log('Generating trend report', { period });
  
  const trendResult = await generateTrendReport(period, combinedData);
  if (trendResult.success && trendResult.data) {
    content.trendReport = trendResult.data;
    log('Trend report generated', { leaders: trendResult.data.leaders.length });
  } else {
    log('Failed to generate trend report', { error: trendResult.error });
  }

  // Generate comparisons
  for (const tools of COMPARISONS) {
    log('Generating comparison', { tools });
    
    // Filter pricing data for these tools
    const toolData = {
      ...combinedData,
      tools: tools,
    };

    const compResult = await generateComparison(tools, toolData);
    if (compResult.success && compResult.data) {
      content.comparisons.push(compResult.data);
      log('Comparison generated', { tools: tools.join(' vs ') });
    } else {
      log('Failed to generate comparison', { tools, error: compResult.error });
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Save content index
  const indexPath = join(CONTENT_DIR, 'index.json');
  writeFileSync(indexPath, JSON.stringify(content, null, 2));
  log('Content saved', { path: indexPath });

  // Print summary
  console.log('\n--- GENERATED CONTENT ---');
  if (content.trendReport) {
    console.log(`\nTrend Report: ${content.trendReport.title}`);
    console.log(`Leaders: ${content.trendReport.leaders.join(', ')}`);
  }
  console.log(`\nComparisons: ${content.comparisons.length}`);
  content.comparisons.forEach(c => {
    console.log(`  - ${c.tools.join(' vs ')}`);
  });
  console.log('-------------------------\n');

  log('Done');
}

main().catch((error) => {
  log('Fatal error', { error: String(error) });
  process.exit(1);
});
