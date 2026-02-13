#!/usr/bin/env node
/**
 * Product Hunt AI Scraper
 * 
 * Fetches recent product launches and filters for AI-related products.
 * Uses public RSS feed - no auth required.
 * 
 * Great for tracking:
 * - New AI tools and startups
 * - Agentic products
 * - Developer tools
 * - LLM-powered apps
 */

const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const RSS_URL = 'https://www.producthunt.com/feed';
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'producthunt-ai.json');

// Keywords that indicate AI-related products
const AI_KEYWORDS = [
  // Core AI terms
  'ai', 'artificial intelligence', 'machine learning', 'ml', 'llm',
  'neural', 'deep learning', 'nlp', 'natural language',
  
  // Models and providers
  'gpt', 'chatgpt', 'claude', 'anthropic', 'openai', 'gemini', 'google ai',
  'llama', 'mistral', 'groq', 'perplexity', 'cohere',
  
  // Agent/Automation
  'agent', 'agentic', 'autonomous', 'automation', 'workflow',
  'copilot', 'assistant', 'bot', 'chatbot',
  
  // Developer tools
  'prompt', 'embedding', 'vector', 'rag', 'fine-tune', 'finetune',
  'api', 'sdk', 'framework',
  
  // Use cases
  'code generation', 'coding assistant', 'ai writing', 'ai image',
  'text-to', 'speech-to', 'voice ai', 'transcription',
  'summariz', 'generat', 'automat'
];

// Keywords that suggest the product IS an AI tool (not just mentions AI)
const STRONG_AI_INDICATORS = [
  'ai-powered', 'ai powered', 'gpt', 'llm', 'chatgpt', 'claude',
  'agent', 'agentic', 'copilot', 'prompt', 'generative',
  'ai assistant', 'ai tool', 'artificial intelligence'
];

async function fetchFeed() {
  const response = await fetch(RSS_URL, {
    headers: {
      'User-Agent': 'Briefing/1.0 (AI Product Tracker; contact: hi@kell.cx)'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch RSS: ${response.status}`);
  }
  
  return response.text();
}

function parseEntry(entry) {
  // Extract link - could be string or object with #text
  let link = entry.link;
  if (Array.isArray(link)) {
    link = link.find(l => l['@_rel'] === 'alternate')?.['@_href'] || link[0]?.['@_href'] || link[0];
  } else if (typeof link === 'object') {
    link = link['@_href'];
  }
  
  // Parse HTML content to extract description
  const content = entry.content?.['#text'] || entry.content || '';
  const descMatch = content.match(/<p>\s*([^<]+)/);
  const description = descMatch ? descMatch[1].trim() : '';
  
  return {
    id: entry.id,
    title: entry.title,
    description,
    link,
    author: entry.author?.name || 'Unknown',
    published: entry.published,
    updated: entry.updated
  };
}

function isAIProduct(product) {
  const text = `${product.title} ${product.description}`.toLowerCase();
  
  // Check for strong indicators first
  for (const keyword of STRONG_AI_INDICATORS) {
    if (text.includes(keyword)) {
      return { isAI: true, confidence: 'high', matchedKeyword: keyword };
    }
  }
  
  // Check for general AI keywords
  for (const keyword of AI_KEYWORDS) {
    if (text.includes(keyword)) {
      return { isAI: true, confidence: 'medium', matchedKeyword: keyword };
    }
  }
  
  return { isAI: false, confidence: 'none', matchedKeyword: null };
}

function categorizeProduct(product) {
  const text = `${product.title} ${product.description}`.toLowerCase();
  
  if (text.includes('agent') || text.includes('automat') || text.includes('workflow')) {
    return 'agentic';
  }
  if (text.includes('code') || text.includes('developer') || text.includes('api') || text.includes('sdk')) {
    return 'developer-tools';
  }
  if (text.includes('writing') || text.includes('content') || text.includes('copy')) {
    return 'content';
  }
  if (text.includes('image') || text.includes('video') || text.includes('design')) {
    return 'creative';
  }
  if (text.includes('chat') || text.includes('support') || text.includes('customer')) {
    return 'customer-service';
  }
  if (text.includes('search') || text.includes('research') || text.includes('analysis')) {
    return 'research';
  }
  if (text.includes('productiv') || text.includes('assistant') || text.includes('copilot')) {
    return 'productivity';
  }
  return 'general';
}

async function main() {
  console.log('Product Hunt AI Scraper starting...');
  
  try {
    const xml = await fetchFeed();
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
    
    const feed = parser.parse(xml);
    const entries = feed.feed?.entry || [];
    
    console.log(`Fetched ${entries.length} products from Product Hunt`);
    
    // Parse and filter for AI products
    const products = entries.map(parseEntry);
    
    const aiProducts = [];
    const otherProducts = [];
    
    for (const product of products) {
      const aiCheck = isAIProduct(product);
      
      if (aiCheck.isAI) {
        aiProducts.push({
          ...product,
          ai_confidence: aiCheck.confidence,
          matched_keyword: aiCheck.matchedKeyword,
          category: categorizeProduct(product)
        });
      } else {
        otherProducts.push(product);
      }
    }
    
    // Sort AI products by confidence then date
    aiProducts.sort((a, b) => {
      if (a.ai_confidence === 'high' && b.ai_confidence !== 'high') return -1;
      if (b.ai_confidence === 'high' && a.ai_confidence !== 'high') return 1;
      return new Date(b.published) - new Date(a.published);
    });
    
    const output = {
      scraped_at: new Date().toISOString(),
      source: 'Product Hunt',
      stats: {
        total_fetched: products.length,
        ai_products: aiProducts.length,
        high_confidence: aiProducts.filter(p => p.ai_confidence === 'high').length,
        categories: {}
      },
      ai_products: aiProducts,
      other_products: otherProducts.slice(0, 10) // Keep a few non-AI for context
    };
    
    // Count categories
    for (const product of aiProducts) {
      output.stats.categories[product.category] = (output.stats.categories[product.category] || 0) + 1;
    }
    
    // Ensure data directory exists
    const dataDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`\nWrote ${aiProducts.length} AI products to ${OUTPUT_FILE}`);
    
    // Print summary
    console.log('\n=== AI Products Found ===');
    aiProducts.slice(0, 8).forEach((product, i) => {
      console.log(`${i + 1}. [${product.ai_confidence}] ${product.title}`);
      console.log(`   ${product.description.slice(0, 60)}...`);
      console.log(`   Category: ${product.category}`);
    });
    
    console.log('\n=== Category Breakdown ===');
    for (const [cat, count] of Object.entries(output.stats.categories)) {
      console.log(`  ${cat}: ${count}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
