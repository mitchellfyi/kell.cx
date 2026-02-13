#!/usr/bin/env node
/**
 * Model Releases Scraper
 * Tracks AI model releases from major providers
 * Sources: API changelogs, blogs, RSS feeds
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'model-releases.json');

// Model providers and their tracking sources
const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    apiChangelog: 'https://docs.anthropic.com/en/api/changelog',
    blog: 'https://www.anthropic.com/news',
  },
  openai: {
    name: 'OpenAI',
    apiChangelog: 'https://platform.openai.com/docs/changelog',
    blog: 'https://openai.com/blog',
  },
  google: {
    name: 'Google',
    blog: 'https://blog.google/technology/ai/',
    vertexChangelog: 'https://cloud.google.com/vertex-ai/docs/release-notes',
  },
  meta: {
    name: 'Meta',
    blog: 'https://ai.meta.com/blog/',
    huggingface: 'https://huggingface.co/meta-llama',
  },
  xai: {
    name: 'xAI',
    website: 'https://x.ai',
  },
  mistral: {
    name: 'Mistral',
    blog: 'https://mistral.ai/news/',
    huggingface: 'https://huggingface.co/mistralai',
  },
  deepseek: {
    name: 'DeepSeek',
    website: 'https://deepseek.com',
    huggingface: 'https://huggingface.co/deepseek-ai',
  },
};

// Current known models (canonical source of truth)
// This serves as baseline until we can scrape live data
const KNOWN_MODELS = [
  // Anthropic
  {
    provider: 'anthropic',
    name: 'Claude Opus 4.6',
    version: '4.6',
    family: 'Claude',
    type: 'flagship',
    released: '2026-02-10',
    status: 'current',
    highlights: ['Extended thinking', 'Computer use', 'MCP support'],
    apiId: 'claude-opus-4-6-20260210',
    pricingInput: 15.00,
    pricingOutput: 75.00,
    contextWindow: 200000,
  },
  {
    provider: 'anthropic',
    name: 'Claude Opus 4.5',
    version: '4.5',
    family: 'Claude',
    type: 'flagship',
    released: '2025-02-24',
    status: 'current',
    highlights: ['Extended thinking', 'Computer use', 'MCP support'],
    apiId: 'claude-opus-4-5-20250224',
    pricingInput: 15.00,
    pricingOutput: 75.00,
    contextWindow: 200000,
  },
  {
    provider: 'anthropic',
    name: 'Claude Sonnet 4',
    version: '4.0',
    family: 'Claude',
    type: 'balanced',
    released: '2025-05-22',
    status: 'current',
    highlights: ['Improved coding', 'Extended thinking optional'],
    apiId: 'claude-sonnet-4-20250514',
    pricingInput: 3.00,
    pricingOutput: 15.00,
    contextWindow: 200000,
  },
  {
    provider: 'anthropic',
    name: 'Claude Haiku 4',
    version: '4.0',
    family: 'Claude',
    type: 'fast',
    released: '2025-05-22',
    status: 'current',
    highlights: ['Fastest Claude', 'Low latency'],
    apiId: 'claude-haiku-4-20250514',
    pricingInput: 0.80,
    pricingOutput: 4.00,
    contextWindow: 200000,
  },
  // OpenAI
  {
    provider: 'openai',
    name: 'GPT-5.3-Codex',
    version: '5.3',
    family: 'GPT',
    type: 'coding',
    released: '2026-02-04',
    status: 'current',
    highlights: ['Coding-optimized', 'Codex product integration'],
    apiId: 'gpt-5.3-codex',
  },
  {
    provider: 'openai',
    name: 'GPT-5.2',
    version: '5.2',
    family: 'GPT',
    type: 'general',
    released: '2025-12-15',
    status: 'current',
    highlights: ['General purpose flagship'],
    apiId: 'gpt-5.2',
  },
  {
    provider: 'openai',
    name: 'o3',
    version: '3',
    family: 'o-series',
    type: 'reasoning',
    released: '2025-04-16',
    status: 'current',
    highlights: ['Deep reasoning', 'Multi-step planning'],
    apiId: 'o3',
  },
  {
    provider: 'openai',
    name: 'o3-mini',
    version: '3-mini',
    family: 'o-series',
    type: 'reasoning-fast',
    released: '2025-01-31',
    status: 'current',
    highlights: ['Fast reasoning', 'Cost effective'],
    apiId: 'o3-mini',
  },
  // Google
  {
    provider: 'google',
    name: 'Gemini 2.5 Pro',
    version: '2.5',
    family: 'Gemini',
    type: 'flagship',
    released: '2025-03-25',
    status: 'current',
    highlights: ['1M context', 'Multimodal', 'Deep Think mode'],
    apiId: 'gemini-2.5-pro',
    contextWindow: 1000000,
  },
  {
    provider: 'google',
    name: 'Gemini 2.5 Flash',
    version: '2.5',
    family: 'Gemini',
    type: 'fast',
    released: '2025-04-17',
    status: 'current',
    highlights: ['Fast multimodal', 'Cost effective'],
    apiId: 'gemini-2.5-flash',
    contextWindow: 1000000,
  },
  // Meta
  {
    provider: 'meta',
    name: 'Llama 4 Scout',
    version: '4',
    family: 'Llama',
    type: 'efficient',
    released: '2025-04-05',
    status: 'current',
    highlights: ['17B active params', '10M context', 'Open weights'],
    contextWindow: 10000000,
    openSource: true,
  },
  {
    provider: 'meta',
    name: 'Llama 4 Maverick',
    version: '4',
    family: 'Llama',
    type: 'flagship',
    released: '2025-04-05',
    status: 'current',
    highlights: ['400B MoE', '1M context', 'Open weights'],
    contextWindow: 1000000,
    openSource: true,
  },
  // xAI
  {
    provider: 'xai',
    name: 'Grok 4',
    version: '4',
    family: 'Grok',
    type: 'flagship',
    released: '2025-07-15',
    status: 'current',
    highlights: ['Real-time X data', 'Reasoning'],
  },
  // Mistral
  {
    provider: 'mistral',
    name: 'Mistral Large 2',
    version: '2',
    family: 'Mistral',
    type: 'flagship',
    released: '2024-07-24',
    status: 'current',
    highlights: ['128K context', 'Multilingual'],
    contextWindow: 128000,
  },
  {
    provider: 'mistral',
    name: 'Codestral',
    version: '1',
    family: 'Codestral',
    type: 'coding',
    released: '2024-05-29',
    status: 'current',
    highlights: ['80+ languages', '32K context'],
    contextWindow: 32000,
  },
  // DeepSeek
  {
    provider: 'deepseek',
    name: 'DeepSeek V3',
    version: '3',
    family: 'DeepSeek',
    type: 'flagship',
    released: '2024-12-26',
    status: 'current',
    highlights: ['671B MoE', 'Open weights', 'Cost efficient'],
    openSource: true,
  },
  {
    provider: 'deepseek',
    name: 'DeepSeek R1',
    version: '1',
    family: 'DeepSeek-R',
    type: 'reasoning',
    released: '2025-01-20',
    status: 'current',
    highlights: ['Chain-of-thought', 'MIT license'],
    openSource: true,
  },
];

function generateOutput() {
  const now = new Date().toISOString();
  
  // Sort by release date (newest first)
  const sortedModels = [...KNOWN_MODELS].sort((a, b) => 
    new Date(b.released) - new Date(a.released)
  );
  
  // Group by provider
  const byProvider = {};
  for (const model of sortedModels) {
    if (!byProvider[model.provider]) {
      byProvider[model.provider] = {
        name: PROVIDERS[model.provider].name,
        sources: PROVIDERS[model.provider],
        models: [],
      };
    }
    byProvider[model.provider].models.push(model);
  }
  
  // Recent releases (last 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const recentReleases = sortedModels.filter(m => 
    new Date(m.released) > ninetyDaysAgo
  );
  
  const output = {
    lastUpdated: now,
    description: 'AI model releases tracked by Briefing',
    summary: {
      totalModels: sortedModels.length,
      providers: Object.keys(byProvider).length,
      recentReleases: recentReleases.length,
      newestModel: sortedModels[0]?.name || null,
      newestRelease: sortedModels[0]?.released || null,
    },
    recentReleases: recentReleases.slice(0, 10),
    byProvider,
    allModels: sortedModels,
  };
  
  return output;
}

async function main() {
  console.log('Generating model releases data...');
  
  const output = generateOutput();
  
  fs.writeFileSync(DATA_PATH, JSON.stringify(output, null, 2));
  console.log(`Wrote ${output.summary.totalModels} models to ${DATA_PATH}`);
  console.log(`Recent releases (90 days): ${output.summary.recentReleases}`);
  console.log(`Newest: ${output.summary.newestModel} (${output.summary.newestRelease})`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
