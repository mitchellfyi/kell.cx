#!/usr/bin/env node
/**
 * arXiv AI Papers Scraper
 * 
 * Fetches recent papers from AI-related categories on arXiv.
 * Uses the public arXiv API (no authentication required).
 * 
 * Categories:
 * - cs.AI (Artificial Intelligence)
 * - cs.CL (Computation and Language / NLP)
 * - cs.LG (Machine Learning)
 * - cs.NE (Neural and Evolutionary Computing)
 * 
 * Focus: Papers relevant to LLMs, agents, coding assistants
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'arxiv-ai.json');
const ARXIV_API = 'http://export.arxiv.org/api/query';

// Categories to search
const CATEGORIES = ['cs.AI', 'cs.CL', 'cs.LG'];

// Keywords for filtering relevant papers
const RELEVANT_KEYWORDS = [
  'large language model', 'llm', 'language model',
  'gpt', 'claude', 'gemini', 'llama', 'mistral',
  'transformer', 'attention mechanism',
  'agent', 'agentic', 'tool use', 'function calling',
  'code generation', 'coding assistant', 'program synthesis',
  'instruction tuning', 'fine-tuning', 'rlhf', 'dpo',
  'prompt', 'in-context learning', 'few-shot',
  'benchmark', 'evaluation', 'reasoning',
  'chain of thought', 'cot', 'reasoning',
  'retrieval augmented', 'rag',
  'multimodal', 'vision language',
  'safety', 'alignment', 'hallucination'
];

// High-priority keywords (score boost)
const HIGH_PRIORITY_KEYWORDS = [
  'agent', 'code generation', 'benchmark', 'claude', 'gpt-4', 'gpt-5',
  'reasoning', 'tool use', 'function calling', 'coding'
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseArxivXml(xml) {
  // Simple XML parsing for arXiv entries
  const entries = [];
  const entryMatches = xml.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
  
  for (const entryXml of entryMatches) {
    const getId = (tag) => {
      const match = entryXml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
      return match ? match[1].trim() : null;
    };
    
    const getAttr = (tag, attr) => {
      const match = entryXml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]+)"`));
      return match ? match[1] : null;
    };
    
    const getAllAuthors = () => {
      const authorMatches = entryXml.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g) || [];
      return authorMatches.map(a => {
        const nameMatch = a.match(/<name>([\s\S]*?)<\/name>/);
        return nameMatch ? nameMatch[1].trim() : '';
      }).filter(Boolean);
    };
    
    const getAllCategories = () => {
      const catMatches = entryXml.match(/<category[^>]*term="([^"]+)"/g) || [];
      return catMatches.map(c => {
        const match = c.match(/term="([^"]+)"/);
        return match ? match[1] : '';
      }).filter(Boolean);
    };
    
    const id = getId('id');
    const arxivId = id ? id.replace('http://arxiv.org/abs/', '') : null;
    
    entries.push({
      id: arxivId,
      title: getId('title')?.replace(/\s+/g, ' '),
      summary: getId('summary')?.replace(/\s+/g, ' '),
      authors: getAllAuthors(),
      published: getId('published'),
      updated: getId('updated'),
      categories: getAllCategories(),
      pdf_url: `https://arxiv.org/pdf/${arxivId}`,
      abs_url: `https://arxiv.org/abs/${arxivId}`
    });
  }
  
  return entries;
}

function scoreRelevance(paper) {
  const text = `${paper.title} ${paper.summary}`.toLowerCase();
  let score = 0;
  let matchedKeywords = [];
  
  for (const kw of RELEVANT_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      score += 1;
      matchedKeywords.push(kw);
    }
  }
  
  for (const kw of HIGH_PRIORITY_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      score += 2;
    }
  }
  
  return { score, matchedKeywords };
}

function categorizePaper(paper) {
  const text = `${paper.title} ${paper.summary}`.toLowerCase();
  
  if (text.includes('agent') || text.includes('tool use') || text.includes('function call')) {
    return 'agents';
  }
  if (text.includes('code') || text.includes('program') || text.includes('coding')) {
    return 'code-generation';
  }
  if (text.includes('benchmark') || text.includes('evaluation') || text.includes('dataset')) {
    return 'benchmarks';
  }
  if (text.includes('safety') || text.includes('alignment') || text.includes('hallucin')) {
    return 'safety';
  }
  if (text.includes('reasoning') || text.includes('chain of thought')) {
    return 'reasoning';
  }
  if (text.includes('fine-tun') || text.includes('instruction') || text.includes('rlhf')) {
    return 'training';
  }
  if (text.includes('retrieval') || text.includes('rag')) {
    return 'retrieval';
  }
  return 'general';
}

async function fetchArxivPapers(query, maxResults = 100) {
  const params = new URLSearchParams({
    search_query: query,
    start: '0',
    max_results: maxResults.toString(),
    sortBy: 'submittedDate',
    sortOrder: 'descending'
  });
  
  const url = `${ARXIV_API}?${params}`;
  console.log(`Fetching: ${query}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BriefingBot/1.0 (kell.cx; competitive intelligence)'
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch arXiv: ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    return parseArxivXml(xml);
  } catch (error) {
    console.error(`Error fetching arXiv:`, error.message);
    return [];
  }
}

async function main() {
  console.log('arXiv AI Papers Scraper starting...');
  console.log(`Fetching from categories: ${CATEGORIES.join(', ')}\n`);
  
  // Build query: papers from last 7 days in target categories
  const categoryQuery = CATEGORIES.map(c => `cat:${c}`).join(' OR ');
  
  // Fetch recent papers
  const papers = await fetchArxivPapers(`(${categoryQuery})`, 200);
  
  console.log(`Fetched ${papers.length} papers total`);
  
  // Score and filter papers
  const scored = papers.map(paper => {
    const { score, matchedKeywords } = scoreRelevance(paper);
    return {
      ...paper,
      relevance_score: score,
      matched_keywords: matchedKeywords,
      category: categorizePaper(paper),
      // Truncate summary for storage
      summary: paper.summary?.slice(0, 800)
    };
  });
  
  // Filter to relevant papers only (score > 0)
  const relevant = scored
    .filter(p => p.relevance_score > 0)
    .sort((a, b) => {
      // Sort by relevance score, then by date
      if (b.relevance_score !== a.relevance_score) {
        return b.relevance_score - a.relevance_score;
      }
      return new Date(b.published) - new Date(a.published);
    })
    .slice(0, 50);
  
  // Get recent papers regardless of keywords (for general awareness)
  const recent = scored
    .filter(p => p.relevance_score === 0)
    .sort((a, b) => new Date(b.published) - new Date(a.published))
    .slice(0, 20);
  
  // Category breakdown
  const byCategory = {};
  for (const paper of relevant) {
    byCategory[paper.category] = (byCategory[paper.category] || 0) + 1;
  }
  
  const output = {
    scraped_at: new Date().toISOString(),
    categories_searched: CATEGORIES,
    stats: {
      total_fetched: papers.length,
      relevant_count: relevant.length,
      recent_count: recent.length,
      by_category: byCategory
    },
    relevant_papers: relevant,
    recent_papers: recent
  };
  
  // Ensure data directory exists
  const dataDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${relevant.length + recent.length} papers to ${OUTPUT_FILE}`);
  
  // Print summary
  console.log('\n=== Category Breakdown ===');
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }
  
  console.log('\n=== Top 5 Relevant Papers ===');
  relevant.slice(0, 5).forEach((paper, i) => {
    console.log(`${i + 1}. [score=${paper.relevance_score}] ${paper.title.slice(0, 70)}...`);
    console.log(`   ${paper.category} | ${paper.authors.slice(0, 2).join(', ')}${paper.authors.length > 2 ? ' et al.' : ''}`);
    console.log(`   Keywords: ${paper.matched_keywords.slice(0, 5).join(', ')}`);
  });
}

main().catch(console.error);
