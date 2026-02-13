#!/usr/bin/env node
/**
 * Stack Overflow Trends Collector for kell.cx
 * Tracks questions about AI coding tools to see what problems developers face
 * 
 * Usage: node collect-stackoverflow-trends.js [--output path]
 */

const https = require('https');
const zlib = require('zlib');
const fs = require('fs');

// AI coding tools to track on Stack Overflow
const TOOLS = [
  { query: 'github copilot', name: 'GitHub Copilot', category: 'ai-assistant' },
  { query: 'cursor ai', name: 'Cursor', category: 'ai-editor' },
  { query: 'claude code OR "claude coding"', name: 'Claude Code', category: 'ai-assistant' },
  { query: '"codeium"', name: 'Codeium', category: 'ai-assistant' },
  { query: 'aider ai OR "aider coding"', name: 'Aider', category: 'ai-assistant' },
  { query: 'tabnine', name: 'Tabnine', category: 'ai-assistant' },
  { query: 'sourcegraph cody', name: 'Cody', category: 'ai-assistant' },
  { query: 'amazon codewhisperer OR "codewhisperer"', name: 'CodeWhisperer', category: 'ai-assistant' },
  { query: 'replit ai OR "replit ghostwriter"', name: 'Replit AI', category: 'ai-ide' },
  { query: 'continue.dev', name: 'Continue', category: 'ai-assistant' },
];

// General AI coding topics
const TOPICS = [
  { query: 'ai code completion', name: 'AI Code Completion', category: 'concept' },
  { query: 'llm code generation', name: 'LLM Code Generation', category: 'concept' },
  { query: 'ai pair programming', name: 'AI Pair Programming', category: 'concept' },
  { query: 'chatgpt code', name: 'ChatGPT Coding', category: 'concept' },
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'kell-cx-trends/1.0',
        'Accept-Encoding': 'gzip',
      }
    };

    https.get(options, (res) => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (res.headers['content-encoding'] === 'gzip') {
          zlib.gunzip(buffer, (err, decoded) => {
            if (err) reject(err);
            else resolve({ status: res.statusCode, data: decoded.toString() });
          });
        } else {
          resolve({ status: res.statusCode, data: buffer.toString() });
        }
      });
    }).on('error', reject);
  });
}

async function searchQuestions(query, pageSize = 30) {
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const encodedQuery = encodeURIComponent(query);
  const url = `https://api.stackexchange.com/2.3/search/advanced?` +
    `order=desc&sort=creation&q=${encodedQuery}&fromdate=${thirtyDaysAgo}` +
    `&site=stackoverflow&pagesize=${pageSize}&filter=withbody`;
  
  const { status, data } = await fetch(url);
  
  if (status !== 200) {
    throw new Error(`HTTP ${status}`);
  }
  
  return JSON.parse(data);
}

async function getTagInfo(tag) {
  const url = `https://api.stackexchange.com/2.3/tags/${encodeURIComponent(tag)}/info?site=stackoverflow`;
  
  const { status, data } = await fetch(url);
  if (status !== 200) return null;
  
  const parsed = JSON.parse(data);
  return parsed.items?.[0] || null;
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function getActivityLevel(count) {
  if (count >= 50) return { level: 'high', emoji: '🔥' };
  if (count >= 20) return { level: 'medium', emoji: '📈' };
  if (count >= 5) return { level: 'low', emoji: '📊' };
  return { level: 'minimal', emoji: '🌱' };
}

function extractCommonIssues(questions) {
  // Look for common patterns in question titles
  const patterns = {
    setup: /install|setup|configure|config|enable|activate/i,
    performance: /slow|performance|latency|memory|cpu|resource/i,
    authentication: /auth|login|sign in|api key|token|credential/i,
    integration: /integrat|connect|work with|alongside|together/i,
    accuracy: /wrong|incorrect|bad|inaccurate|hallucin|mistake/i,
    cost: /cost|price|expensive|billing|quota|limit|free/i,
    compatibility: /not work|doesn't work|broken|issue|error|fail/i,
  };
  
  const counts = {};
  for (const [key, regex] of Object.entries(patterns)) {
    counts[key] = questions.filter(q => regex.test(q.title)).length;
  }
  
  // Sort by count
  return Object.entries(counts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue, count]) => ({ issue, count }));
}

async function collectTrends() {
  const results = [];
  const recentQuestions = [];
  const errors = [];
  
  console.error(`Collecting Stack Overflow trends for ${TOOLS.length} tools...`);
  
  // Collect tool-specific data
  for (const { query, name, category } of TOOLS) {
    try {
      const response = await searchQuestions(query, 50);
      const questions = response.items || [];
      const activity = getActivityLevel(questions.length);
      
      results.push({
        name,
        category,
        query,
        questionsLast30d: questions.length,
        questionsFormatted: formatNumber(questions.length),
        activityLevel: activity.level,
        emoji: activity.emoji,
        commonIssues: extractCommonIssues(questions),
        topQuestions: questions.slice(0, 3).map(q => ({
          title: q.title,
          url: q.link,
          score: q.score,
          answers: q.answer_count,
          views: q.view_count,
          createdAt: new Date(q.creation_date * 1000).toISOString(),
        })),
      });
      
      // Add to combined recent questions
      questions.forEach(q => {
        recentQuestions.push({
          tool: name,
          title: q.title,
          url: q.link,
          score: q.score,
          answers: q.answer_count,
          views: q.view_count,
          createdAt: new Date(q.creation_date * 1000).toISOString(),
        });
      });
      
      console.error(`  ✓ ${name}: ${questions.length} questions in last 30 days`);
      
      // API quota backoff
      if (response.quota_remaining < 50) {
        console.error(`  ⚠ Low quota: ${response.quota_remaining} remaining`);
      }
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
      console.error(`  ✗ ${name}: ${err.message}`);
    }
  }
  
  // Collect general topic data
  console.error(`\nCollecting ${TOPICS.length} general AI coding topics...`);
  const topicResults = [];
  
  for (const { query, name, category } of TOPICS) {
    try {
      const response = await searchQuestions(query, 30);
      const questions = response.items || [];
      const activity = getActivityLevel(questions.length);
      
      topicResults.push({
        name,
        category,
        questionsLast30d: questions.length,
        activityLevel: activity.level,
        emoji: activity.emoji,
      });
      
      console.error(`  ✓ ${name}: ${questions.length} questions`);
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`  ✗ ${name}: ${err.message}`);
    }
  }
  
  // Sort results by activity
  results.sort((a, b) => b.questionsLast30d - a.questionsLast30d);
  
  // Sort recent questions by score
  recentQuestions.sort((a, b) => b.score - a.score);
  
  // Calculate category breakdown
  const byCategory = {};
  for (const r of results) {
    if (!byCategory[r.category]) {
      byCategory[r.category] = { count: 0, totalQuestions: 0 };
    }
    byCategory[r.category].count++;
    byCategory[r.category].totalQuestions += r.questionsLast30d;
  }
  
  return {
    generatedAt: new Date().toISOString(),
    period: 'Last 30 days',
    toolCount: results.length,
    tools: results,
    topics: topicResults,
    byCategory,
    recentHighlights: recentQuestions.slice(0, 15),
    summary: {
      totalQuestions: results.reduce((sum, r) => sum + r.questionsLast30d, 0),
      mostActive: results[0]?.name || null,
      topIssues: extractCommonIssues(recentQuestions.map(q => ({ title: q.title }))),
    },
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : null;
  
  try {
    const trends = await collectTrends();
    const json = JSON.stringify(trends, null, 2);
    
    if (outputPath) {
      fs.writeFileSync(outputPath, json);
      console.error(`\nWritten to ${outputPath}`);
    } else {
      console.log(json);
    }
    
    console.error(`\n✓ Collected trends for ${trends.toolCount} tools, ${trends.summary.totalQuestions} total questions`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
