import { readFileSync, statSync, existsSync } from "fs";
import { join } from "path";

// Data directories
const ROOT_DATA = join(process.cwd(), "..", "data");
const SITE_DATA = join(process.cwd(), "..", "site", "data");

function loadJson<T>(filename: string, defaultValue: T): T {
  const paths = [
    join(ROOT_DATA, filename),
    join(SITE_DATA, filename),
  ];
  
  for (const path of paths) {
    if (existsSync(path)) {
      try {
        return JSON.parse(readFileSync(path, "utf8"));
      } catch {
        continue;
      }
    }
  }
  return defaultValue;
}

// Source links for attribution
export const sources = {
  vscode: "https://marketplace.visualstudio.com/",
  github: "https://github.com/",
  hn: "https://news.ycombinator.com/",
  aider: "https://aider.chat/docs/leaderboards/",
  lmarena: "https://lmarena.ai/",
  npm: "https://www.npmjs.com/",
  pypi: "https://pypi.org/",
};

export interface VSCodeStats {
  generatedAt: string;
  totalInstalls: number;
  extensions: Array<{
    id: string;
    name: string;
    publisher: string;
    installs: number;
    averageRating: number;
    trendingMonthly?: number;
    trendingWeekly?: number;
    trendingDaily?: number;
    version?: string;
    lastUpdated?: string;
    ratingCount?: number;
    category?: string;
  }>;
}

export interface GitHubRelease {
  repo: string;
  company: string;
  name: string;
  tag: string;
  url: string;
  publishedAt: string;
  isPrerelease: boolean;
}

export interface HNStory {
  id: string;
  title: string;
  url: string;
  author: string;
  points: number;
  comments: number;
  createdAt: string;
  hnUrl: string;
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  category?: string;
}

export function getVSCodeStats(): VSCodeStats {
  return loadJson<VSCodeStats>("vscode-stats.json", {
    generatedAt: new Date().toISOString(),
    totalInstalls: 0,
    extensions: [],
  });
}

export function getGitHubReleases(): { recentReleases: GitHubRelease[]; generatedAt: string; reposTracked?: number } {
  return loadJson("github-releases.json", {
    generatedAt: new Date().toISOString(),
    recentReleases: [],
  });
}

export function getHNMentions(): { stories: HNStory[]; generatedAt: string } {
  return loadJson("hn-ai-mentions.json", {
    generatedAt: new Date().toISOString(),
    stories: [],
  });
}

export function getLatestNews(): { items: NewsItem[]; generatedAt: string; recent?: NewsItem[]; older?: NewsItem[] } {
  return loadJson("latest-news.json", {
    generatedAt: new Date().toISOString(),
    items: [],
  });
}

export interface AiderBenchmarkEntry {
  model: string;
  score: number;
  cost: number;
  command: string;
  formatScore: number;
  rank: number;
}

export interface AiderBenchmark {
  generatedAt: string;
  source: string;
  totalModels: number;
  topScore: number;
  topModel: string;
  leaderboard: AiderBenchmarkEntry[];
}

export interface LMArenaModel {
  name: string;
  organization: string;
  rank_overall: number;
  rank_coding: number | null;
  rank_math: number | null;
  rank_creative_writing: number | null;
  rank_instruction_following: number | null;
  rank_multi_turn: number | null;
}

export interface LMArenaLeaderboard {
  source: string;
  description: string;
  fetched_at: string;
  total_models: number;
  models: LMArenaModel[];
}

export function getAiderBenchmark(): AiderBenchmark {
  return loadJson<AiderBenchmark>("aider-benchmark.json", {
    generatedAt: new Date().toISOString(),
    source: "https://aider.chat/docs/leaderboards/",
    totalModels: 0,
    leaderboard: [],
    topModel: "Unknown",
    topScore: 0,
  });
}

export function getLMArenaLeaderboard(): LMArenaLeaderboard {
  return loadJson<LMArenaLeaderboard>("lmarena-leaderboard.json", {
    source: "arena.ai",
    description: "",
    fetched_at: new Date().toISOString(),
    total_models: 0,
    models: [],
  });
}

export function getMeta() {
  const meta = loadJson("meta.json", {
    lastRefresh: new Date().toISOString(),
    toolsTracked: 15,
  });
  
  // Format the date nicely
  return {
    ...meta,
    lastRefreshFormatted: new Date(meta.lastRefresh).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }),
  };
}

// Computed stats from multiple sources
export function getDashboardStats() {
  const vscode = getVSCodeStats();
  const releases = getGitHubReleases();
  const hn = getHNMentions();
  const meta = getMeta();
  
  // Count releases this week
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const releasesThisWeek = releases.recentReleases.filter(
    (r) => new Date(r.publishedAt) > oneWeekAgo
  ).length;
  
  // Sum HN points
  const totalHNPoints = hn.stories.reduce((sum, s) => sum + s.points, 0);
  
  return {
    toolsTracked: meta.toolsTracked,
    vscodeInstalls: vscode.totalInstalls,
    vscodeInstallsFormatted: formatNumber(vscode.totalInstalls),
    releasesThisWeek,
    hnMentions: hn.stories.length,
    hnPoints: totalHNPoints,
    lastRefresh: meta.lastRefreshFormatted,
    sources: {
      vscode: sources.vscode,
      github: sources.github,
      hn: sources.hn,
    },
  };
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M+`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K+`;
  return n.toString();
}

// AI Insights
export interface AIInsight {
  headline: string;
  summary: string;
  significance: "high" | "medium" | "low";
  sources: string[];
  category: string;
}

export interface AIInsightsData {
  date: string;
  insights: AIInsight[];
  marketSummary: string;
  generatedAt: string;
}

export function getAIInsights(): AIInsightsData | null {
  return loadJson<AIInsightsData | null>("ai-insights.json", null);
}

// HN Summaries
export interface HNSummary {
  storyId: string;
  title: string;
  summary: string;
  sentiment: "positive" | "negative" | "mixed" | "neutral";
  keyPoints: string[];
  toolsMentioned: string[];
  competitiveImplication?: string;
  generatedAt: string;
}

export interface HNSummariesData {
  generatedAt: string;
  summaryCount: number;
  summaries: HNSummary[];
}

export function getHNSummaries(): HNSummariesData | null {
  return loadJson<HNSummariesData | null>("hn-summaries.json", null);
}

// Market Analysis
export interface MarketAnalysis {
  date: string;
  marketLeaders: string[];
  emergingThreats: string[];
  pricingTrends: string;
  hiringSignals: string;
  strategicOutlook: string;
  generatedAt: string;
}

export interface MarketAnalysisData {
  current: MarketAnalysis | null;
  history: MarketAnalysis[];
  generatedAt: string;
}

export function getMarketAnalysis(): MarketAnalysisData | null {
  return loadJson<MarketAnalysisData | null>("market-analysis.json", null);
}

// Generated Content (Evergreen)
export interface TrendReport {
  period: string;
  title: string;
  marketOverview: string;
  leaders: string[];
  risers: string[];
  keyDevelopments: string[];
  outlook: string;
  lastUpdated: string;
}

export interface ComparisonPage {
  tools: string[];
  title: string;
  introduction: string;
  pricingComparison: string;
  featureComparison: string;
  verdict: string;
  lastUpdated: string;
}

export interface GeneratedContent {
  trendReport: TrendReport | null;
  comparisons: ComparisonPage[];
  generatedAt: string;
}

export function getGeneratedContent(): GeneratedContent | null {
  return loadJson<GeneratedContent | null>("generated/index.json", null);
}
