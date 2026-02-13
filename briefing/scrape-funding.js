#!/usr/bin/env node

/**
 * Funding & Investment News Scraper
 * Tracks competitor funding rounds, acquisitions, and major partnerships
 * Sources: TechCrunch funding API, press release aggregators, company newsrooms
 */

const https = require('https');
const http = require('http');

// Competitor companies and their known funding keywords
const COMPETITORS = [
  { name: 'Cursor', company: 'Anysphere', aliases: ['cursor ai', 'cursor ide'] },
  { name: 'Devin', company: 'Cognition AI', aliases: ['cognition labs', 'devin ai'] },
  { name: 'Replit', company: 'Replit', aliases: ['replit ai'] },
  { name: 'Windsurf', company: 'Codeium', aliases: ['codeium ai', 'windsurf editor'] },
  { name: 'GitHub Copilot', company: 'GitHub', aliases: ['copilot'] },
  { name: 'Tabnine', company: 'Tabnine', aliases: ['tabnine ai'] },
  { name: 'Amazon Q', company: 'Amazon', aliases: ['amazon q developer', 'aws q'] },
  { name: 'Sourcegraph Cody', company: 'Sourcegraph', aliases: ['cody ai'] },
  { name: 'Supermaven', company: 'Supermaven', aliases: [] },
  { name: 'Augment Code', company: 'Augment', aliases: ['augment ai'] },
  { name: 'Lovable', company: 'Lovable', aliases: ['lovable ai', 'lovable.dev'] },
  { name: 'Poolside', company: 'Poolside AI', aliases: ['poolside ml'] },
  { name: 'Continue', company: 'Continue', aliases: ['continue.dev'] },
];

// Funding-related keywords
const FUNDING_KEYWORDS = [
  'raises', 'raised', 'funding', 'series a', 'series b', 'series c', 'series d',
  'seed round', 'investment', 'valuation', 'acquired', 'acquisition', 'merger',
  'partnership', 'strategic investment', 'funding round', 'million', 'billion',
  'led by', 'participated', 'venture', 'capital'
];

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KellBot/1.0; +https://kell.cx)',
        ...options.headers
      },
      timeout: 15000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetch(res.headers.location, options));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function searchTechCrunchFunding() {
  const results = [];
  
  // Search TechCrunch for recent funding news about AI coding tools
  const searchTerms = ['ai coding', 'code assistant', 'developer tools ai', 'copilot funding'];
  
  for (const term of searchTerms) {
    try {
      const url = `https://techcrunch.com/tag/${encodeURIComponent(term.replace(/ /g, '-'))}/feed/`;
      const res = await fetch(url);
      
      if (res.status === 200 && res.data) {
        // Parse RSS feed for funding-related articles
        const items = res.data.match(/<item>[\s\S]*?<\/item>/g) || [];
        
        for (const item of items.slice(0, 10)) {
          const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || 
                        item.match(/<title>(.*?)<\/title>/) || [])[1] || '';
          const link = (item.match(/<link>(.*?)<\/link>/) || [])[1] || '';
          const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
          const description = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || [])[1] || '';
          
          // Check if it's funding-related and about a competitor
          const fullText = `${title} ${description}`.toLowerCase();
          const hasFundingKeyword = FUNDING_KEYWORDS.some(kw => fullText.includes(kw));
          
          const matchedCompetitor = COMPETITORS.find(c => {
            const searchTerms = [c.name.toLowerCase(), c.company.toLowerCase(), ...c.aliases.map(a => a.toLowerCase())];
            return searchTerms.some(term => fullText.includes(term));
          });
          
          if (hasFundingKeyword && matchedCompetitor) {
            results.push({
              source: 'TechCrunch',
              competitor: matchedCompetitor.name,
              title: title.replace(/<[^>]*>/g, '').trim(),
              url: link,
              date: pubDate,
              type: 'funding_news'
            });
          }
        }
      }
    } catch (e) {
      // Continue on error
    }
  }
  
  return results;
}

async function searchVentureBeatFunding() {
  const results = [];
  
  try {
    const url = 'https://venturebeat.com/category/ai/feed/';
    const res = await fetch(url);
    
    if (res.status === 200 && res.data) {
      const items = res.data.match(/<item>[\s\S]*?<\/item>/g) || [];
      
      for (const item of items.slice(0, 20)) {
        const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || 
                      item.match(/<title>(.*?)<\/title>/) || [])[1] || '';
        const link = (item.match(/<link>(.*?)<\/link>/) || [])[1] || '';
        const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
        const description = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || [])[1] || '';
        
        const fullText = `${title} ${description}`.toLowerCase();
        const hasFundingKeyword = FUNDING_KEYWORDS.some(kw => fullText.includes(kw));
        
        const matchedCompetitor = COMPETITORS.find(c => {
          const searchTerms = [c.name.toLowerCase(), c.company.toLowerCase(), ...c.aliases.map(a => a.toLowerCase())];
          return searchTerms.some(term => fullText.includes(term));
        });
        
        if (hasFundingKeyword && matchedCompetitor) {
          results.push({
            source: 'VentureBeat',
            competitor: matchedCompetitor.name,
            title: title.replace(/<[^>]*>/g, '').trim(),
            url: link,
            date: pubDate,
            type: 'funding_news'
          });
        }
      }
    }
  } catch (e) {
    // Continue on error
  }
  
  return results;
}

async function searchBusinessWire() {
  const results = [];
  
  // Check Business Wire / PR Newswire for press releases
  for (const competitor of COMPETITORS) {
    try {
      const searchTerm = encodeURIComponent(`${competitor.company} funding OR investment OR raises`);
      const url = `https://www.businesswire.com/portal/site/home/news/?searchKey=${searchTerm}`;
      
      const res = await fetch(url);
      if (res.status === 200) {
        // Look for press release titles mentioning funding
        const titleMatches = res.data.match(/<h3[^>]*class="bwTitleLink"[^>]*>[\s\S]*?<\/h3>/g) || [];
        
        for (const match of titleMatches.slice(0, 5)) {
          const title = match.replace(/<[^>]*>/g, '').trim();
          const fullText = title.toLowerCase();
          
          if (FUNDING_KEYWORDS.some(kw => fullText.includes(kw))) {
            results.push({
              source: 'BusinessWire',
              competitor: competitor.name,
              title: title,
              url: url,
              date: new Date().toISOString(),
              type: 'press_release'
            });
          }
        }
      }
    } catch (e) {
      // Continue
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }
  
  return results;
}

async function searchCrunchbaseNews() {
  const results = [];
  
  // Crunchbase News RSS
  try {
    const url = 'https://news.crunchbase.com/feed/';
    const res = await fetch(url);
    
    if (res.status === 200 && res.data) {
      const items = res.data.match(/<item>[\s\S]*?<\/item>/g) || [];
      
      for (const item of items.slice(0, 30)) {
        const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || 
                      item.match(/<title>(.*?)<\/title>/) || [])[1] || '';
        const link = (item.match(/<link>(.*?)<\/link>/) || [])[1] || '';
        const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
        const description = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || [])[1] || '';
        
        const fullText = `${title} ${description}`.toLowerCase();
        
        const matchedCompetitor = COMPETITORS.find(c => {
          const searchTerms = [c.name.toLowerCase(), c.company.toLowerCase(), ...c.aliases.map(a => a.toLowerCase())];
          return searchTerms.some(term => fullText.includes(term));
        });
        
        if (matchedCompetitor) {
          results.push({
            source: 'Crunchbase News',
            competitor: matchedCompetitor.name,
            title: title.replace(/<[^>]*>/g, '').trim(),
            url: link,
            date: pubDate,
            type: 'funding_news'
          });
        }
      }
    }
  } catch (e) {
    // Continue
  }
  
  return results;
}

async function scrapeFunding() {
  console.log('Scraping funding & investment news...');
  
  const [techcrunch, venturebeat, businesswire, crunchbase] = await Promise.all([
    searchTechCrunchFunding(),
    searchVentureBeatFunding(),
    searchBusinessWire(),
    searchCrunchbaseNews()
  ]);
  
  // Combine and dedupe
  const allResults = [...techcrunch, ...venturebeat, ...businesswire, ...crunchbase];
  
  // Dedupe by title similarity
  const seen = new Set();
  const deduped = allResults.filter(r => {
    const key = r.title.toLowerCase().slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  // Sort by date (most recent first)
  deduped.sort((a, b) => {
    const dateA = new Date(a.date || 0);
    const dateB = new Date(b.date || 0);
    return dateB - dateA;
  });
  
  return {
    funding: deduped.slice(0, 20),
    scrapedAt: new Date().toISOString(),
    sources: ['TechCrunch', 'VentureBeat', 'BusinessWire', 'Crunchbase News']
  };
}

// CLI
if (require.main === module) {
  scrapeFunding()
    .then(results => {
      console.log(JSON.stringify(results, null, 2));
    })
    .catch(err => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}

module.exports = { scrapeFunding };
