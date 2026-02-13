#!/usr/bin/env node
/**
 * AI Company Announcements Scraper
 * Fetches latest posts from official AI company blogs
 * 
 * Sources:
 * - Anthropic: anthropic.com/news
 * - OpenAI: openai.com/blog
 * - Google DeepMind: deepmind.google/blog
 * - Meta AI: ai.meta.com/blog
 * - Mistral: mistral.ai/news
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'company-announcements.json');

// RSS/Atom feeds for AI company blogs and research
// Working sources first, then fallback options
const COMPANY_FEEDS = [
  // Working direct feeds
  {
    company: 'Google DeepMind',
    feed: 'https://deepmind.google/blog/rss.xml',
    fallback: 'https://deepmind.google/blog',
    logo: '🔷'
  },
  {
    company: 'Cohere',
    feed: 'https://cohere.com/blog/rss.xml',
    fallback: 'https://cohere.com/blog',
    logo: '🧲'
  },
  {
    company: 'Hugging Face',
    feed: 'https://huggingface.co/blog/feed.xml',
    fallback: 'https://huggingface.co/blog',
    logo: '🤗'
  },
  {
    company: 'Together AI',
    feed: 'https://www.together.ai/blog/rss.xml',
    fallback: 'https://www.together.ai/blog',
    logo: '🤝'
  },
  {
    company: 'Groq',
    feed: 'https://groq.com/blog/feed/',
    fallback: 'https://groq.com/blog',
    logo: '⚡'
  },
  {
    company: 'Stability AI',
    feed: 'https://stability.ai/blog/rss.xml',
    fallback: 'https://stability.ai/blog',
    logo: '🎨'
  },
  {
    company: 'Perplexity',
    feed: 'https://blog.perplexity.ai/feed',
    fallback: 'https://blog.perplexity.ai',
    logo: '🔍'
  },
  // Major labs - check manually (no public RSS)
  {
    company: 'Anthropic',
    feed: null,
    fallback: 'https://www.anthropic.com/news',
    logo: '🅰️'
  },
  {
    company: 'OpenAI',
    feed: null,
    fallback: 'https://openai.com/blog',
    logo: '⬡'
  }
];

async function fetchFeed(feedUrl) {
  const res = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'Briefing/1.0 (+https://kell.cx)',
      'Accept': 'application/rss+xml, application/xml, text/xml'
    }
  });
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  
  return res.text();
}

function parseRSS(xml) {
  const items = [];
  
  // Simple RSS/Atom parser - handles both formats
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) || [];
  
  for (const itemXml of itemMatches.slice(0, 10)) {
    // Title
    const titleMatch = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const title = titleMatch ? decodeEntities(titleMatch[1].trim()) : null;
    
    // Link (handle both RSS and Atom formats)
    let link = null;
    const linkMatch = itemXml.match(/<link[^>]*href=["']([^"']+)["']/i);
    if (linkMatch) {
      link = linkMatch[1];
    } else {
      const linkTextMatch = itemXml.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      if (linkTextMatch) link = linkTextMatch[1].trim();
    }
    
    // Date (pubDate for RSS, published/updated for Atom)
    const dateMatch = itemXml.match(/<(?:pubDate|published|updated)>([^<]+)<\//i);
    const date = dateMatch ? new Date(dateMatch[1].trim()).toISOString() : null;
    
    // Description/Summary
    const descMatch = itemXml.match(/<(?:description|summary|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary|content)>/i);
    let description = descMatch ? decodeEntities(descMatch[1].trim()) : null;
    if (description) {
      // Strip HTML tags and truncate
      description = description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (description.length > 300) {
        description = description.slice(0, 297) + '...';
      }
    }
    
    if (title && link) {
      items.push({ title, link, date, description });
    }
  }
  
  return items;
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

async function fetchCompanyAnnouncements(company) {
  if (!company.feed) {
    return { company: company.company, logo: company.logo, url: company.fallback, posts: [], error: 'No RSS feed available' };
  }
  
  try {
    console.log(`Fetching ${company.company} feed...`);
    const xml = await fetchFeed(company.feed);
    const posts = parseRSS(xml);
    
    return {
      company: company.company,
      logo: company.logo,
      url: company.fallback,
      posts,
      fetched_at: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Failed to fetch ${company.company}: ${error.message}`);
    return {
      company: company.company,
      logo: company.logo,
      url: company.fallback,
      posts: [],
      error: error.message
    };
  }
}

async function main() {
  console.log('Fetching AI company announcements...\n');
  
  const results = await Promise.all(
    COMPANY_FEEDS.map(fetchCompanyAnnouncements)
  );
  
  // Aggregate all posts and sort by date
  const allPosts = [];
  for (const result of results) {
    for (const post of result.posts) {
      allPosts.push({
        ...post,
        company: result.company,
        logo: result.logo
      });
    }
  }
  
  // Sort by date (newest first)
  allPosts.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });
  
  const output = {
    meta: {
      collected_at: new Date().toISOString(),
      sources: COMPANY_FEEDS.length,
      total_posts: allPosts.length
    },
    companies: results,
    recent: allPosts.slice(0, 30) // Last 30 posts across all companies
  };
  
  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  
  console.log(`\n✓ Saved ${allPosts.length} posts from ${results.filter(r => !r.error).length}/${COMPANY_FEEDS.length} sources`);
  console.log(`  Output: ${OUTPUT_FILE}`);
  
  // Show latest few
  console.log('\nLatest announcements:');
  for (const post of allPosts.slice(0, 5)) {
    const date = post.date ? new Date(post.date).toLocaleDateString() : '???';
    console.log(`  ${post.logo} [${date}] ${post.title.slice(0, 60)}...`);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
