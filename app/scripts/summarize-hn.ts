#!/usr/bin/env node
/**
 * Summarize HN Stories Script
 * 
 * Reads HN stories from data files and generates AI summaries.
 * Run via: npx tsx scripts/summarize-hn.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { summarizeHNStories, HNSummary, isAIAvailable } from '../lib/ai';

const DATA_DIR = join(process.cwd(), '..', 'data');
const HN_DATA_PATH = join(DATA_DIR, 'hn-mentions.json');
const SUMMARIES_PATH = join(DATA_DIR, 'hn-summaries.json');

function log(msg: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`, meta ? JSON.stringify(meta) : '');
}

interface HNData {
  stories?: Array<{
    id: string;
    title: string;
    points: number;
    url: string;
    hnUrl: string;
  }>;
}

interface SummariesFile {
  generatedAt: string;
  summaryCount: number;
  summaries: HNSummary[];
}

async function main() {
  log('Starting HN summarization');

  if (!isAIAvailable()) {
    log('ERROR: OPENAI_API_KEY not set');
    process.exit(1);
  }

  // Load HN data
  if (!existsSync(HN_DATA_PATH)) {
    log('ERROR: HN data file not found', { path: HN_DATA_PATH });
    process.exit(1);
  }

  const hnData: HNData = JSON.parse(readFileSync(HN_DATA_PATH, 'utf8'));
  const stories = hnData.stories || [];

  log('Loaded HN stories', { count: stories.length });

  // Load existing summaries to avoid re-processing
  let existingSummaries: HNSummary[] = [];
  if (existsSync(SUMMARIES_PATH)) {
    try {
      const existing: SummariesFile = JSON.parse(readFileSync(SUMMARIES_PATH, 'utf8'));
      existingSummaries = existing.summaries || [];
      log('Loaded existing summaries', { count: existingSummaries.length });
    } catch {
      log('Could not load existing summaries, starting fresh');
    }
  }

  const existingIds = new Set(existingSummaries.map(s => s.storyId));

  // Filter to high-point stories not already summarized
  const toSummarize = stories
    .filter(s => s.points >= 50 && !existingIds.has(s.id))
    .map(s => ({
      id: s.id,
      title: s.title,
      points: s.points,
      url: s.url || s.hnUrl,
    }));

  log('Stories to summarize', { count: toSummarize.length });

  if (toSummarize.length === 0) {
    log('No new stories to summarize');
    return;
  }

  // Summarize stories
  const { summaries, errors } = await summarizeHNStories(toSummarize, 50);

  log('Summarization complete', {
    successful: summaries.length,
    errors: errors.length,
  });

  if (errors.length > 0) {
    log('Errors encountered', { errors });
  }

  // Merge with existing summaries
  const allSummaries = [...existingSummaries, ...summaries];

  // Keep only last 100 summaries
  const trimmedSummaries = allSummaries.slice(-100);

  // Save results
  const output: SummariesFile = {
    generatedAt: new Date().toISOString(),
    summaryCount: trimmedSummaries.length,
    summaries: trimmedSummaries,
  };

  writeFileSync(SUMMARIES_PATH, JSON.stringify(output, null, 2));
  log('Saved summaries', { path: SUMMARIES_PATH, count: trimmedSummaries.length });

  // Print summary
  console.log('\n--- NEW SUMMARIES ---');
  summaries.forEach((s, i) => {
    console.log(`\n${i + 1}. ${s.title}`);
    console.log(`   Sentiment: ${s.sentiment}`);
    console.log(`   ${s.summary}`);
  });
  console.log('---------------------\n');

  log('Done');
}

main().catch((error) => {
  log('Fatal error', { error: String(error) });
  process.exit(1);
});
