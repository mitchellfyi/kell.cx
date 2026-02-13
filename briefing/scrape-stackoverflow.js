#!/usr/bin/env node
/**
 * Stack Overflow Monitoring
 * Tracks questions about competitor tools to gauge developer adoption/issues
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DATA_DIR = path.join(__dirname, 'data');

// Competitor tags and search terms for Stack Overflow
const TARGETS = {
  cursor: {
    name: 'Cursor',
    tags: ['cursor-ai'],
    search: ['cursor ai editor', 'cursor IDE']
  },
  cognition: {
    name: 'Devin',
    tags: [],
    search: ['devin ai', 'cognition devin']
  },
  replit: {
    name: 'Replit',
    tags: ['replit', 'repl.it'],
    search: ['replit agent', 'replit ai']
  },
  windsurf: {
    name: 'Windsurf',
    tags: ['codeium', 'windsurf'],
    search: ['windsurf editor', 'codeium ai']
  },
  copilot: {
    name: 'GitHub Copilot',
    tags: ['github-copilot'],
    search: ['github copilot']
  },
  tabnine: {
    name: 'Tabnine',
    tags: ['tabnine'],
    search: ['tabnine']
  },
  amazonq: {
    name: 'Amazon Q',
    tags: ['amazon-q'],
    search: ['amazon q developer', 'aws codewhisperer']
  },
  cody: {
    name: 'Sourcegraph Cody',
    tags: ['sourcegraph-cody', 'sourcegraph'],
    search: ['sourcegraph cody']
  },
  continue: {
    name: 'Continue',
    tags: ['continue-dev'],
    search: ['continue.dev']
  },
  supermaven: {
    name: 'Supermaven',
    tags: [],
    search: ['supermaven']
  },
  augment: {
    name: 'Augment Code',
    tags: [],
    search: ['augment code', 'augmentcode']
  }
};

function fetch(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 
        'User-Agent': 'Briefing/1.0',
        'Accept-Encoding': 'gzip'
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        // Stack Overflow API returns gzip
        if (res.headers['content-encoding'] === 'gzip') {
          zlib.gunzip(buffer, (err, decoded) => {
            if (err) reject(err);
            else resolve(decoded.toString());
          });
        } else {
          resolve(buffer.toString());
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function searchByTag(tag) {
  // Stack Exchange API - questions by tag from last 7 days
  const weekAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
  const url = `https://api.stackexchange.com/2.3/questions?order=desc&sort=activity&tagged=${encodeURIComponent(tag)}&site=stackoverflow&fromdate=${weekAgo}&pagesize=10&filter=withbody`;
  
  try {
    const json = await fetch(url);
    const data = JSON.parse(json);
    return {
      questions: (data.items || []).map(q => ({
        id: q.question_id,
        title: q.title,
        score: q.score,
        answers: q.answer_count,
        views: q.view_count,
        url: q.link,
        created: new Date(q.creation_date * 1000).toISOString(),
        tags: q.tags
      })),
      quota: data.quota_remaining
    };
  } catch (e) {
    console.log(`    Tag search error (${tag}): ${e.message}`);
    return { questions: [], quota: null };
  }
}

async function searchByText(query) {
  // Stack Exchange API - full text search
  const weekAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
  const url = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=activity&q=${encodeURIComponent(query)}&site=stackoverflow&fromdate=${weekAgo}&pagesize=5&filter=withbody`;
  
  try {
    const json = await fetch(url);
    const data = JSON.parse(json);
    return {
      questions: (data.items || []).map(q => ({
        id: q.question_id,
        title: q.title,
        score: q.score,
        answers: q.answer_count,
        views: q.view_count,
        url: q.link,
        created: new Date(q.creation_date * 1000).toISOString(),
        tags: q.tags
      })),
      quota: data.quota_remaining
    };
  } catch (e) {
    console.log(`    Text search error (${query}): ${e.message}`);
    return { questions: [], quota: null };
  }
}

async function scrapeStackOverflow() {
  const results = {};
  let remainingQuota = null;
  
  for (const [slug, target] of Object.entries(TARGETS)) {
    console.log(`  → ${target.name}`);
    
    const data = {
      name: target.name,
      scrapedAt: new Date().toISOString(),
      questions: [],
      signals: [],
      stats: {
        totalQuestions: 0,
        totalViews: 0,
        avgScore: 0,
        unanswered: 0
      }
    };
    
    const seenIds = new Set();
    
    // Search by tags first
    for (const tag of target.tags) {
      const result = await searchByTag(tag);
      remainingQuota = result.quota;
      
      for (const q of result.questions) {
        if (!seenIds.has(q.id)) {
          seenIds.add(q.id);
          data.questions.push(q);
        }
      }
      
      // Rate limit - Stack Exchange has strict limits
      await new Promise(r => setTimeout(r, 500));
    }
    
    // Then search by text terms
    for (const query of target.search) {
      const result = await searchByText(query);
      remainingQuota = result.quota;
      
      for (const q of result.questions) {
        if (!seenIds.has(q.id)) {
          seenIds.add(q.id);
          data.questions.push(q);
        }
      }
      
      await new Promise(r => setTimeout(r, 500));
    }
    
    // Calculate stats
    if (data.questions.length > 0) {
      data.stats.totalQuestions = data.questions.length;
      data.stats.totalViews = data.questions.reduce((sum, q) => sum + q.views, 0);
      data.stats.avgScore = Math.round(data.questions.reduce((sum, q) => sum + q.score, 0) / data.questions.length * 10) / 10;
      data.stats.unanswered = data.questions.filter(q => q.answers === 0).length;
      
      // Sort by score
      data.questions.sort((a, b) => b.score - a.score);
      
      // Generate signals
      if (data.stats.totalQuestions >= 10) {
        data.signals.push(`📚 High SO activity: ${data.stats.totalQuestions} questions this week`);
      } else if (data.stats.totalQuestions >= 5) {
        data.signals.push(`📝 Moderate SO activity: ${data.stats.totalQuestions} questions this week`);
      }
      
      // High-voted questions indicate feature requests or common issues
      const highVoted = data.questions.filter(q => q.score >= 5);
      if (highVoted.length > 0) {
        data.signals.push(`🔥 ${highVoted.length} highly-upvoted SO question(s) this week`);
      }
      
      // Many unanswered questions might indicate growing adoption faster than community support
      if (data.stats.unanswered >= 3) {
        data.signals.push(`❓ ${data.stats.unanswered} unanswered questions (adoption outpacing support?)`);
      }
    }
    
    results[slug] = data;
    
    // Log quota if available
    if (remainingQuota !== null && remainingQuota < 50) {
      console.log(`    ⚠️ Low API quota remaining: ${remainingQuota}`);
    }
  }
  
  return results;
}

// Export for use in daily-briefing.js
module.exports = { scrapeStackOverflow, TARGETS };

// Run standalone
if (require.main === module) {
  console.log('📚 Scanning Stack Overflow...\n');
  scrapeStackOverflow()
    .then(results => {
      console.log('\n📊 Results:\n');
      for (const [slug, data] of Object.entries(results)) {
        console.log(`${data.name}:`);
        console.log(`  Questions: ${data.stats.totalQuestions}`);
        console.log(`  Total views: ${data.stats.totalViews}`);
        console.log(`  Avg score: ${data.stats.avgScore}`);
        console.log(`  Unanswered: ${data.stats.unanswered}`);
        if (data.signals.length > 0) {
          data.signals.forEach(s => console.log(`  ${s}`));
        }
        if (data.questions.length > 0) {
          console.log(`  Top question: "${data.questions[0].title}" (${data.questions[0].score} pts)`);
        }
        console.log('');
      }
    })
    .catch(console.error);
}
