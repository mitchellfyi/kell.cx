/**
 * AI Content Generation System
 * Generates evergreen content that updates automatically based on live data
 */

import { Product, Company, getCompanyByProduct, companies, getAllProducts } from './companies';
import { getVSCodeStats, getGitHubReleases, getHNMentions, getLatestNews } from './data';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Content types
export interface ToolGuide {
  toolName: string;
  slug: string;
  generatedAt: string;
  overview: string;
  features: string[];
  pricing: PricingInfo | null;
  recentActivity: ActivityItem[];
  sentiment: SentimentAnalysis;
  strengths: string[];
  weaknesses: string[];
  comparisons: string[];
  lastUpdated: string;
}

export interface ComparisonPage {
  tools: string[];
  slug: string;
  generatedAt: string;
  title: string;
  overview: string;
  featureComparison: FeatureComparison[];
  pricingComparison: PricingComparison[];
  sentiment: { [tool: string]: SentimentAnalysis };
  recommendation: string;
  lastUpdated: string;
}

export interface TrendReport {
  period: 'week' | 'month';
  generatedAt: string;
  slug: string;
  title: string;
  overview: string;
  marketLeaders: LeaderInfo[];
  emergingTools: EmergingTool[];
  keyDevelopments: Development[];
  predictions: string[];
  lastUpdated: string;
}

// Supporting types
interface PricingInfo {
  free: boolean;
  tiers: { name: string; price: string; features: string[] }[];
  enterprise: boolean;
}

interface ActivityItem {
  type: 'release' | 'news' | 'discussion';
  title: string;
  date: string;
  url: string;
  summary?: string;
}

interface SentimentAnalysis {
  score: number; // -1 to 1
  summary: string;
  sources: string[];
}

interface FeatureComparison {
  feature: string;
  comparison: { [tool: string]: boolean | string };
}

interface PricingComparison {
  tier: string;
  prices: { [tool: string]: string };
}

interface LeaderInfo {
  name: string;
  installs?: number;
  momentum: number;
  highlights: string[];
}

interface EmergingTool {
  name: string;
  description: string;
  growth: string;
  potential: string;
}

interface Development {
  title: string;
  summary: string;
  impact: string;
  relatedTools: string[];
}

// Content storage directory
const CONTENT_DIR = join(process.cwd(), 'content', 'ai-generated');

// Ensure content directory exists
function ensureContentDir() {
  if (!existsSync(CONTENT_DIR)) {
    mkdirSync(CONTENT_DIR, { recursive: true });
  }
  const subdirs = ['tools', 'comparisons', 'trends'];
  subdirs.forEach(dir => {
    const path = join(CONTENT_DIR, dir);
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }
  });
}

// Content generation functions
export async function generateToolGuide(productName: string): Promise<ToolGuide> {
  const product = getAllProducts().find(p => p.name === productName);
  if (!product) {
    throw new Error(`Product ${productName} not found`);
  }

  const company = getCompanyByProduct(productName);
  const vscodeStats = getVSCodeStats();
  const releases = getGitHubReleases();
  const hnMentions = getHNMentions();
  const news = getLatestNews();

  // Get VSCode stats if applicable
  const vscodeExtension = product.vscodeId ?
    vscodeStats.extensions.find(e => e.id === product.vscodeId) : null;

  // Get recent activity
  const recentActivity: ActivityItem[] = [];

  // Add recent releases
  if (company) {
    const companyReleases = releases.recentReleases
      .filter(r => r.company === company.name || r.repo.includes(productName.toLowerCase()))
      .slice(0, 5)
      .map(r => ({
        type: 'release' as const,
        title: `${r.name} (${r.tag})`,
        date: r.publishedAt,
        url: r.url,
        summary: r.isPrerelease ? 'Pre-release version' : 'Stable release'
      }));
    recentActivity.push(...companyReleases);
  }

  // Add HN mentions
  const hnStories = hnMentions.stories
    .filter(s => s.title.toLowerCase().includes(productName.toLowerCase()))
    .slice(0, 3)
    .map(s => ({
      type: 'discussion' as const,
      title: s.title,
      date: s.createdAt,
      url: s.hnUrl,
      summary: `${s.points} points, ${s.comments} comments`
    }));
  recentActivity.push(...hnStories);

  // Add news mentions
  const newsItems = news.items
    .filter(n => n.title.toLowerCase().includes(productName.toLowerCase()))
    .slice(0, 3)
    .map(n => ({
      type: 'news' as const,
      title: n.title,
      date: n.publishedAt,
      url: n.url,
      summary: n.source
    }));
  recentActivity.push(...newsItems);

  // Sort by date
  recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Generate content using template
  const overview = generateOverview(product, company, vscodeExtension);
  const features = generateFeatures(product);
  const pricing = generatePricing(productName);
  const sentiment = analyzeSentiment(productName, hnStories);
  const { strengths, weaknesses } = generateStrengthsWeaknesses(product, sentiment);
  const comparisons = generateComparisons(productName);

  const guide: ToolGuide = {
    toolName: productName,
    slug: productName.toLowerCase().replace(/\s+/g, '-'),
    generatedAt: new Date().toISOString(),
    overview,
    features,
    pricing,
    recentActivity: recentActivity.slice(0, 7),
    sentiment,
    strengths,
    weaknesses,
    comparisons,
    lastUpdated: new Date().toISOString()
  };

  // Save to file
  ensureContentDir();
  const filePath = join(CONTENT_DIR, 'tools', `${guide.slug}.json`);
  writeFileSync(filePath, JSON.stringify(guide, null, 2));

  return guide;
}

export async function generateComparison(tools: string[]): Promise<ComparisonPage> {
  const slug = tools.map(t => t.toLowerCase().replace(/\s+/g, '-')).join('-vs-');

  // Load individual tool guides first
  const toolGuides = await Promise.all(
    tools.map(tool => {
      const filePath = join(CONTENT_DIR, 'tools', `${tool.toLowerCase().replace(/\s+/g, '-')}.json`);
      if (existsSync(filePath)) {
        return JSON.parse(readFileSync(filePath, 'utf8')) as ToolGuide;
      }
      return generateToolGuide(tool);
    })
  );

  const comparison: ComparisonPage = {
    tools,
    slug,
    generatedAt: new Date().toISOString(),
    title: `${tools.join(' vs ')}: Comprehensive Comparison`,
    overview: generateComparisonOverview(toolGuides),
    featureComparison: generateFeatureComparison(toolGuides),
    pricingComparison: generatePricingComparison(toolGuides),
    sentiment: Object.fromEntries(
      toolGuides.map(g => [g.toolName, g.sentiment])
    ),
    recommendation: generateRecommendation(toolGuides),
    lastUpdated: new Date().toISOString()
  };

  // Save to file
  ensureContentDir();
  const filePath = join(CONTENT_DIR, 'comparisons', `${comparison.slug}.json`);
  writeFileSync(filePath, JSON.stringify(comparison, null, 2));

  return comparison;
}

export async function generateTrendReport(period: 'week' | 'month'): Promise<TrendReport> {
  const vscodeStats = getVSCodeStats();
  const releases = getGitHubReleases();
  const news = getLatestNews();

  // Calculate date range
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - (period === 'week' ? 7 : 30));

  // Identify market leaders
  const marketLeaders = vscodeStats.extensions
    .filter(e => companies.some(c =>
      c.products.some(p => p.vscodeId === e.id)
    ))
    .sort((a, b) => b.installs - a.installs)
    .slice(0, 5)
    .map(e => {
      const product = getAllProducts().find(p => p.vscodeId === e.id);
      return {
        name: product?.name || e.name,
        installs: e.installs,
        momentum: calculateMomentum(e),
        highlights: generateHighlights(e, releases)
      };
    });

  // Find emerging tools
  const emergingTools = identifyEmergingTools(vscodeStats, news);

  // Key developments
  const keyDevelopments = generateKeyDevelopments(releases, news, startDate);

  // Generate predictions
  const predictions = generatePredictions(marketLeaders, emergingTools, keyDevelopments);

  const report: TrendReport = {
    period,
    generatedAt: new Date().toISOString(),
    slug: `${period}-report-${now.toISOString().split('T')[0]}`,
    title: `State of AI Coding Tools - ${formatPeriod(period, now)}`,
    overview: generateTrendOverview(marketLeaders, emergingTools, keyDevelopments),
    marketLeaders,
    emergingTools,
    keyDevelopments,
    predictions,
    lastUpdated: new Date().toISOString()
  };

  // Save to file
  ensureContentDir();
  const filePath = join(CONTENT_DIR, 'trends', `${report.slug}.json`);
  writeFileSync(filePath, JSON.stringify(report, null, 2));

  return report;
}

// Helper functions
function generateOverview(product: Product, company?: Company, vscodeStats?: any): string {
  let overview = `${product.name} is a ${product.type === 'ide' ? 'code editor extension' : product.type} by ${company?.name || 'an independent developer'}. `;
  overview += product.description + '. ';

  if (vscodeStats) {
    overview += `With ${vscodeStats.installs.toLocaleString()} installs on VS Code marketplace, it's one of the ${vscodeStats.installs > 1000000 ? 'most popular' : 'growing'} AI coding tools. `;
  }

  if (company?.vertical) {
    overview += `As a vertically integrated solution, ${company.name} develops both the AI models and the coding tools, providing tight integration. `;
  }

  return overview;
}

function generateFeatures(product: Product): string[] {
  // Base features based on product type
  const baseFeatures = {
    ide: [
      'Code completion and suggestions',
      'Inline code generation',
      'Error detection and fixes',
      'Refactoring assistance'
    ],
    cli: [
      'Terminal-based interface',
      'File editing capabilities',
      'Git integration',
      'Multi-file operations'
    ],
    web: [
      'Browser-based development',
      'Cloud hosting included',
      'Collaborative features',
      'No local setup required'
    ],
    model: ['API access', 'Multiple model sizes', 'Fine-tuning capabilities'],
    platform: ['Multiple tools integration', 'Enterprise features', 'Team collaboration']
  };

  return baseFeatures[product.type] || [];
}

function generatePricing(productName: string): PricingInfo | null {
  // This would normally pull from scraped pricing data
  // For now, return template pricing
  const pricingTemplates: { [key: string]: PricingInfo } = {
    'Cursor': {
      free: true,
      tiers: [
        { name: 'Hobby', price: 'Free', features: ['2000 completions/month', 'Basic features'] },
        { name: 'Pro', price: '$20/month', features: ['Unlimited completions', 'Advanced models'] },
        { name: 'Business', price: '$40/month', features: ['Team features', 'Admin controls'] }
      ],
      enterprise: true
    },
    'GitHub Copilot': {
      free: false,
      tiers: [
        { name: 'Individual', price: '$10/month', features: ['Unlimited suggestions', 'All IDEs'] },
        { name: 'Business', price: '$19/month', features: ['Team management', 'Policy controls'] }
      ],
      enterprise: true
    }
  };

  return pricingTemplates[productName] || null;
}

function analyzeSentiment(productName: string, hnStories: any[]): SentimentAnalysis {
  // Simple sentiment analysis based on HN activity
  const relevantStories = hnStories.filter(s =>
    s.title.toLowerCase().includes(productName.toLowerCase())
  );

  const totalPoints = relevantStories.reduce((sum, s) => sum + s.points, 0);
  const avgPoints = relevantStories.length > 0 ? totalPoints / relevantStories.length : 0;

  const score = Math.min(1, avgPoints / 100); // Normalize to -1 to 1

  return {
    score,
    summary: score > 0.7 ? 'Very positive community reception' :
             score > 0.4 ? 'Generally positive feedback' :
             score > 0 ? 'Mixed reception' : 'Limited community data',
    sources: relevantStories.map(s => s.hnUrl)
  };
}

function generateStrengthsWeaknesses(product: Product, sentiment: SentimentAnalysis): { strengths: string[], weaknesses: string[] } {
  const strengths = [];
  const weaknesses = [];

  // Type-based analysis
  if (product.type === 'ide') {
    strengths.push('Deep IDE integration');
    strengths.push('Familiar development environment');
  } else if (product.type === 'cli') {
    strengths.push('Lightweight and fast');
    strengths.push('Works in any terminal');
    weaknesses.push('Steeper learning curve');
  } else if (product.type === 'web') {
    strengths.push('No installation required');
    strengths.push('Access from anywhere');
    weaknesses.push('Requires internet connection');
  }

  // Sentiment-based additions
  if (sentiment.score > 0.7) {
    strengths.push('Strong community support');
  } else if (sentiment.score < 0.3) {
    weaknesses.push('Limited community adoption');
  }

  return { strengths, weaknesses };
}

function generateComparisons(productName: string): string[] {
  // Find similar products
  const product = getAllProducts().find(p => p.name === productName);
  if (!product) return [];

  const similarProducts = getAllProducts()
    .filter(p => p.type === product.type && p.name !== productName)
    .slice(0, 3)
    .map(p => p.name);

  return similarProducts;
}

function generateComparisonOverview(guides: ToolGuide[]): string {
  const names = guides.map(g => g.toolName).join(', ');
  return `This comprehensive comparison analyzes ${names}, examining their features, pricing, and community sentiment. Based on current data and user feedback, we provide insights to help you choose the best AI coding tool for your needs.`;
}

function generateFeatureComparison(guides: ToolGuide[]): FeatureComparison[] {
  const allFeatures = new Set<string>();
  guides.forEach(g => g.features.forEach(f => allFeatures.add(f)));

  return Array.from(allFeatures).map(feature => ({
    feature,
    comparison: Object.fromEntries(
      guides.map(g => [g.toolName, g.features.includes(feature)])
    )
  }));
}

function generatePricingComparison(guides: ToolGuide[]): PricingComparison[] {
  const tiers = ['Free', 'Pro', 'Enterprise'];

  return tiers.map(tier => ({
    tier,
    prices: Object.fromEntries(
      guides.map(g => {
        if (!g.pricing) return [g.toolName, 'N/A'];
        const tierInfo = g.pricing.tiers.find(t =>
          t.name.toLowerCase().includes(tier.toLowerCase())
        );
        return [g.toolName, tierInfo?.price || 'N/A'];
      })
    )
  }));
}

function generateRecommendation(guides: ToolGuide[]): string {
  const bestSentiment = guides.reduce((best, g) =>
    g.sentiment.score > best.sentiment.score ? g : best
  );

  const hasFreeOption = guides.some(g => g.pricing?.free);

  return `Based on current data, ${bestSentiment.toolName} shows the strongest community sentiment. ${hasFreeOption ? 'Several options offer free tiers for individual developers.' : 'All options require paid subscriptions.'} Choose based on your specific needs: IDE integration, pricing, or feature requirements.`;
}

function calculateMomentum(extension: any): number {
  // Calculate momentum based on recent growth
  const daily = extension.trendingDaily || 0;
  const weekly = extension.trendingWeekly || 0;
  const monthly = extension.trendingMonthly || 0;

  return (daily * 3 + weekly * 2 + monthly) / 6;
}

function generateHighlights(extension: any, releases: any): string[] {
  const highlights = [];

  if (extension.trendingDaily > 1000) {
    highlights.push(`+${extension.trendingDaily.toLocaleString()} installs today`);
  }

  if (extension.version) {
    highlights.push(`Latest version: ${extension.version}`);
  }

  return highlights;
}

function identifyEmergingTools(vscodeStats: any, news: any): EmergingTool[] {
  // Find tools with high growth rates
  const emerging = vscodeStats.extensions
    .filter(e => e.installs < 100000 && e.trendingMonthly > e.installs * 0.1)
    .slice(0, 3)
    .map(e => ({
      name: e.name,
      description: `${e.publisher}'s AI coding assistant`,
      growth: `+${Math.round(e.trendingMonthly / e.installs * 100)}% monthly`,
      potential: 'High growth trajectory'
    }));

  return emerging;
}

function generateKeyDevelopments(releases: any, news: any, startDate: Date): Development[] {
  const developments = [];

  // Major releases
  const majorReleases = releases.recentReleases
    .filter((r: any) => new Date(r.publishedAt) > startDate && !r.isPrerelease)
    .slice(0, 3)
    .map((r: any) => ({
      title: `${r.company} releases ${r.name}`,
      summary: `New ${r.isPrerelease ? 'pre-release' : 'stable version'} with potential improvements`,
      impact: 'Product enhancement',
      relatedTools: [r.company]
    }));

  developments.push(...majorReleases);

  return developments;
}

function generatePredictions(leaders: LeaderInfo[], emerging: EmergingTool[], developments: Development[]): string[] {
  const predictions = [];

  if (leaders[0].momentum > 1000) {
    predictions.push(`${leaders[0].name} likely to maintain market leadership with strong momentum`);
  }

  if (emerging.length > 0) {
    predictions.push(`Watch for ${emerging[0].name} as a potential breakout tool`);
  }

  predictions.push('Continued consolidation in the AI coding assistant market');
  predictions.push('Increased focus on specialized domain knowledge');

  return predictions;
}

function generateTrendOverview(leaders: LeaderInfo[], emerging: EmergingTool[], developments: Development[]): string {
  return `This ${leaders.length > 0 ? 'week' : 'period'} saw ${developments.length} major developments in AI coding tools. ${leaders[0]?.name || 'Leading tools'} continues to dominate with ${leaders[0]?.installs?.toLocaleString() || 'significant'} installs. ${emerging.length} emerging tools show promising growth.`;
}

function formatPeriod(period: 'week' | 'month', date: Date): string {
  if (period === 'week') {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - 7);
    return `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
}

// Export regeneration functions
export async function regenerateAllContent() {
  console.log('Starting content regeneration...');

  // Regenerate tool guides
  const products = getAllProducts();
  for (const product of products.slice(0, 10)) { // Limit for initial implementation
    try {
      await generateToolGuide(product.name);
      console.log(`Generated guide for ${product.name}`);
    } catch (error) {
      console.error(`Failed to generate guide for ${product.name}:`, error);
    }
  }

  // Generate popular comparisons
  const comparisons = [
    ['Cursor', 'GitHub Copilot'],
    ['Cursor', 'Windsurf'],
    ['Cody', 'Continue'],
    ['Claude Code', 'Aider']
  ];

  for (const tools of comparisons) {
    try {
      await generateComparison(tools);
      console.log(`Generated comparison for ${tools.join(' vs ')}`);
    } catch (error) {
      console.error(`Failed to generate comparison:`, error);
    }
  }

  // Generate trend reports
  await generateTrendReport('week');
  await generateTrendReport('month');

  console.log('Content regeneration complete');
}