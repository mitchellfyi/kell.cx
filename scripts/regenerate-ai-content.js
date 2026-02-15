#!/usr/bin/env node

/**
 * Regenerate AI Content Script
 * Run this via cron or GitHub Actions to keep content fresh
 */

import { regenerateAllContent } from '../app/lib/ai-content.js';

async function main() {
  console.log(`[${new Date().toISOString()}] Starting AI content regeneration...`);

  try {
    await regenerateAllContent();
    console.log(`[${new Date().toISOString()}] Content regeneration completed successfully`);
    process.exit(0);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Content regeneration failed:`, error);
    process.exit(1);
  }
}

main();