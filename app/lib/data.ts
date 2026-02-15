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

export function getLatestNews(): { items: NewsItem[]; generatedAt: string } {
  return loadJson("latest-news.json", {
    generatedAt: new Date().toISOString(),
    items: [],
  });
}

export function getAiderBenchmark() {
  return loadJson("aider-benchmark.json", {
    generatedAt: new Date().toISOString(),
    leaderboard: [],
    topModel: "Unknown",
    topScore: 0,
  });
}

export function getLMArenaLeaderboard() {
  return loadJson("lmarena-leaderboard.json", {
    generatedAt: new Date().toISOString(),
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
