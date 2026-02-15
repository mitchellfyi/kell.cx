import Link from "next/link";
import { getGitHubReleases, sources } from "@/lib/data";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Load GitHub trending data
function loadTrending() {
  const path = join(process.cwd(), "..", "data", "github-trending.json");
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      return { recentPopular: [], trending: [] };
    }
  }
  return { recentPopular: [], trending: [] };
}

function loadInsights() {
  const path = join(process.cwd(), "..", "data", "insights.json");
  if (existsSync(path)) {
    try {
      const data = JSON.parse(readFileSync(path, "utf8"));
      return data.trending || data.opensource || [];
    } catch {
      return [];
    }
  }
  return [];
}

const trending = loadTrending();
const releases = getGitHubReleases();
const insights = loadInsights();

// Combine repos from trending and releases
const allRepos = trending.recentPopular || [];

// Stats
const stats = {
  totalRepos: allRepos.length,
  totalStars: allRepos.reduce((sum: number, r: any) => sum + (r.stars || 0), 0),
  topLanguages: trending.summary?.topLanguages || [],
  releasesThisWeek: releases.recentReleases?.filter((r: any) => 
    new Date(r.publishedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length || 0,
};

export const metadata = {
  title: "Open Source AI Tools — Kell",
  description: "Trending open source AI coding tools and new releases.",
};

export default function OpenSourcePage() {
  const lastUpdated = trending.generatedAt 
    ? new Date(trending.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "Recently";

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6">
        <Link href="/data" className="text-sm text-zinc-500 hover:text-zinc-400">
          ← Back to Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight mb-2">Open Source AI Tools</h1>
      <p className="text-zinc-400 mb-1">Trending repos and new releases in AI coding</p>
      <p className="text-sm text-zinc-600 mb-6">
        {stats.totalRepos} repos · {stats.releasesThisWeek} releases this week · Last updated: {lastUpdated} ·{" "}
        <a href={sources.github} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
          Source: GitHub ↗
        </a>
      </p>

      {/* Key Insights */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-5 mb-8">
        <h2 className="text-xs uppercase tracking-wide text-blue-400 mb-4">🔥 What's Hot</h2>
        <ul className="space-y-2 text-sm text-zinc-300">
          {allRepos.slice(0, 3).map((repo: any, i: number) => (
            <li key={i}>
              <a 
                href={repo.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white hover:text-blue-400 font-medium"
              >
                {repo.name}
              </a>
              <span className="text-zinc-500 ml-2">
                ⭐ {formatNumber(repo.stars)} — {truncate(repo.description || '', 50)}
              </span>
            </li>
          ))}
          <li className="text-zinc-400">
            <strong className="text-white">{formatNumber(stats.totalStars)}</strong> total stars across {stats.totalRepos} trending AI repos
          </li>
          {insights.slice(0, 2).map((insight: string, i: number) => (
            <li key={`insight-${i}`}>{insight}</li>
          ))}
        </ul>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard value={String(stats.totalRepos)} label="Trending Repos" />
        <StatCard value={formatNumber(stats.totalStars)} label="Total Stars" />
        <StatCard value={String(stats.releasesThisWeek)} label="Releases (7d)" />
        <StatCard 
          value={stats.topLanguages[0]?.language || "Python"} 
          label="Top Language" 
        />
      </div>

      {/* Top Languages */}
      {stats.topLanguages.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-4">Languages</h2>
          <div className="flex flex-wrap gap-2">
            {stats.topLanguages.map((lang: any) => (
              <span 
                key={lang.language} 
                className="px-3 py-1 bg-white/[0.05] border border-white/[0.1] rounded-full text-sm text-zinc-300"
              >
                {lang.language} ({lang.count})
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Trending Repos */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-4 pb-2 border-b border-white/[0.08]">
          🚀 Rising Stars (New repos gaining traction)
        </h2>
        <div className="space-y-3">
          {allRepos.slice(0, 15).map((repo: any) => (
            <div
              key={repo.url}
              className="flex items-start justify-between p-4 bg-white/[0.02] rounded-lg border border-white/[0.04] hover:border-white/[0.08]"
            >
              <div className="flex-1 pr-4">
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-white hover:text-blue-400"
                >
                  {repo.name}
                </a>
                <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
                  {repo.description || "No description"}
                </p>
                <div className="flex gap-3 mt-2 text-xs text-zinc-500">
                  {repo.language && <span>{repo.language}</span>}
                  {repo.forks > 0 && <span>🍴 {formatNumber(repo.forks)}</span>}
                  {repo.topics?.slice(0, 3).map((t: string) => (
                    <span key={t} className="text-zinc-600">#{t}</span>
                  ))}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-yellow-400 font-semibold">⭐ {formatNumber(repo.stars)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Releases */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-4 pb-2 border-b border-white/[0.08]">
          📦 Recent Releases
        </h2>
        <div className="space-y-3">
          {releases.recentReleases?.slice(0, 10).map((release: any) => (
            <div
              key={release.url}
              className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]"
            >
              <div>
                <a
                  href={release.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-white hover:text-blue-400"
                >
                  {release.company} — {release.tag}
                </a>
                <span className="text-xs text-zinc-500 ml-2">
                  {formatRelativeTime(release.publishedAt)}
                </span>
              </div>
              <a
                href={`https://github.com/${release.repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-600 hover:text-zinc-400"
              >
                {release.repo} ↗
              </a>
            </div>
          ))}
        </div>
        <Link href="/data/releases" className="block mt-3 text-sm text-blue-400 hover:text-blue-300">
          View all releases →
        </Link>
      </section>

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-white/[0.08] text-xs text-zinc-600">
        <p>
          Trending data from GitHub Search API. Tracks new AI-related repos with 100+ stars created in the last week.
          Updated daily at 05:00 UTC.
        </p>
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + "..." : str;
}
