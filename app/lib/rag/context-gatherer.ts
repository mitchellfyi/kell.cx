import { companies } from '../companies';
import {
  getVSCodeStats,
  getGitHubReleases,
  getHNMentions,
  getLatestNews,
  getAiderBenchmark,
  getLMArenaLeaderboard
} from '../data';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface Document {
  id: string;
  type: 'pricing' | 'news' | 'release' | 'benchmark' | 'company' | 'stats' | 'hackernews';
  content: string;
  metadata: {
    title?: string;
    source?: string;
    date?: string;
    url?: string;
    relevance?: number;
  };
}

export interface SearchContext {
  question: string;
  documents: Document[];
  timestamp: string;
}

// Load pricing data
function loadPricingData(): any {
  const pricingPath = join(process.cwd(), '..', 'data', 'pricing.json');
  if (existsSync(pricingPath)) {
    return JSON.parse(readFileSync(pricingPath, 'utf8'));
  }
  return null;
}

// Extract keywords from question
function extractKeywords(question: string): string[] {
  const lowercased = question.toLowerCase();
  const keywords: string[] = [];

  // Extract tool names
  companies.forEach(company => {
    company.products.forEach(product => {
      if (lowercased.includes(product.name.toLowerCase())) {
        keywords.push(product.name);
      }
    });
    if (lowercased.includes(company.name.toLowerCase())) {
      keywords.push(company.name);
    }
  });

  // Extract common terms
  const commonTerms = [
    'pricing', 'price', 'cost', 'free', 'trial',
    'funding', 'raised', 'valuation', 'investment',
    'compare', 'versus', 'vs', 'comparison',
    'trend', 'trending', 'popular', 'growth',
    'benchmark', 'performance', 'speed', 'quality',
    'news', 'recent', 'latest', 'update', 'announcement',
    'cli', 'terminal', 'ide', 'vscode', 'extension'
  ];

  commonTerms.forEach(term => {
    if (lowercased.includes(term)) {
      keywords.push(term);
    }
  });

  return [...new Set(keywords)];
}

// Score relevance of content to question
function scoreRelevance(content: string, keywords: string[]): number {
  const lowercased = content.toLowerCase();
  let score = 0;

  keywords.forEach(keyword => {
    const occurrences = (lowercased.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
    score += occurrences * (keyword.length > 5 ? 2 : 1); // Weight longer keywords higher
  });

  return score;
}

export async function gatherContext(question: string): Promise<SearchContext> {
  const keywords = extractKeywords(question);
  const documents: Document[] = [];

  // 1. Search pricing data
  if (keywords.some(k => ['pricing', 'price', 'cost', 'free', 'compare', 'vs'].includes(k.toLowerCase()))) {
    const pricingData = loadPricingData();
    if (pricingData?.categories) {
      pricingData.categories.forEach((category: any) => {
        category.tools.forEach((tool: any) => {
          const relevance = scoreRelevance(JSON.stringify(tool), keywords);
          if (relevance > 0) {
            documents.push({
              id: `pricing-${tool.name}`,
              type: 'pricing',
              content: `${tool.name}: ${tool.freeTier ? 'Free tier available' : 'No free tier'}. Individual: ${tool.individual ? `$${tool.individual.price}/${tool.individual.period}` : 'N/A'}. Team: ${tool.team ? `$${tool.team.price}/${tool.team.period}` : 'N/A'}. ${tool.notes || ''}`,
              metadata: {
                title: `${tool.name} Pricing`,
                source: tool.website,
                relevance
              }
            });
          }
        });
      });
    }
  }

  // 2. Search news
  if (keywords.some(k => ['news', 'recent', 'latest', 'update', 'announcement', 'funding'].includes(k.toLowerCase()))) {
    const news = getLatestNews();
    news.items.slice(0, 50).forEach((item, index) => {
      const relevance = scoreRelevance(item.title + (item.url || ''), keywords);
      if (relevance > 0) {
        documents.push({
          id: `news-${index}`,
          type: 'news',
          content: item.title,
          metadata: {
            title: item.title,
            source: item.source,
            date: item.publishedAt,
            url: item.url,
            relevance
          }
        });
      }
    });
  }

  // 3. Search GitHub releases
  if (keywords.some(k => ['release', 'update', 'version', 'github'].includes(k.toLowerCase()))) {
    const releases = getGitHubReleases();
    releases.recentReleases.slice(0, 30).forEach((release, index) => {
      const relevance = scoreRelevance(release.name + release.repo, keywords);
      if (relevance > 0) {
        documents.push({
          id: `release-${index}`,
          type: 'release',
          content: `${release.company} released ${release.name} (${release.tag})`,
          metadata: {
            title: release.name,
            source: release.repo,
            date: release.publishedAt,
            url: release.url,
            relevance
          }
        });
      }
    });
  }

  // 4. Search Hacker News mentions
  if (keywords.some(k => ['hackernews', 'hn', 'discussion', 'community'].includes(k.toLowerCase()))) {
    const hn = getHNMentions();
    hn.stories.slice(0, 20).forEach(story => {
      const relevance = scoreRelevance(story.title, keywords);
      if (relevance > 0) {
        documents.push({
          id: `hn-${story.id}`,
          type: 'hackernews',
          content: `${story.title} (${story.points} points, ${story.comments} comments)`,
          metadata: {
            title: story.title,
            source: 'Hacker News',
            date: story.createdAt,
            url: story.hnUrl,
            relevance
          }
        });
      }
    });
  }

  // 5. Search benchmarks
  if (keywords.some(k => ['benchmark', 'performance', 'speed', 'quality', 'leaderboard'].includes(k.toLowerCase()))) {
    const aider = getAiderBenchmark();
    const arena = getLMArenaLeaderboard();

    // Add relevant benchmark entries
    aider.leaderboard.slice(0, 10).forEach((entry, index) => {
      const relevance = scoreRelevance(entry.model, keywords);
      if (relevance > 0) {
        documents.push({
          id: `benchmark-aider-${index}`,
          type: 'benchmark',
          content: `${entry.model}: Score ${entry.score}%, Cost $${entry.cost}`,
          metadata: {
            title: `${entry.model} Benchmark`,
            source: 'Aider Benchmark',
            relevance
          }
        });
      }
    });
  }

  // 6. Search VS Code stats
  if (keywords.some(k => ['vscode', 'extension', 'install', 'download'].includes(k.toLowerCase()))) {
    const vscode = getVSCodeStats();
    vscode.extensions.slice(0, 20).forEach((ext, index) => {
      const relevance = scoreRelevance(ext.name + ext.publisher, keywords);
      if (relevance > 0) {
        documents.push({
          id: `vscode-${index}`,
          type: 'stats',
          content: `${ext.name}: ${ext.installs.toLocaleString()} installs, ${ext.averageRating} stars`,
          metadata: {
            title: ext.name,
            source: 'VS Code Marketplace',
            relevance
          }
        });
      }
    });
  }

  // 7. Search company information
  companies.forEach((company, index) => {
    const companyContent = `${company.name}: ${company.products.map(p => p.name).join(', ')}. ${company.vertical ? 'Vertically integrated' : 'Product-focused'}. ${company.models ? `Models: ${company.models.join(', ')}` : ''}`;
    const relevance = scoreRelevance(companyContent, keywords);
    if (relevance > 0) {
      documents.push({
        id: `company-${index}`,
        type: 'company',
        content: companyContent,
        metadata: {
          title: company.name,
          source: company.website,
          relevance
        }
      });
    }
  });

  // Sort by relevance and take top results
  documents.sort((a, b) => (b.metadata.relevance || 0) - (a.metadata.relevance || 0));

  return {
    question,
    documents: documents.slice(0, 20), // Top 20 most relevant documents
    timestamp: new Date().toISOString()
  };
}