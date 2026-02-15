import Link from "next/link";
import { getDashboardStats, getGitHubReleases, getHNMentions, getVSCodeStats, sources } from "@/lib/data";

// Load all stats at build time
const stats = getDashboardStats();
const vscodeData = getVSCodeStats();
const releasesData = getGitHubReleases();
const hnData = getHNMentions();

// Top VS Code extensions
const topExtensions = vscodeData.extensions.slice(0, 5);

// Recent releases (last 7 days)
const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const recentReleases = releasesData.recentReleases
  .filter((r) => new Date(r.publishedAt) > oneWeekAgo)
  .slice(0, 5);

// Top HN stories
const topHNStories = hnData.stories.slice(0, 5);

const drillDownPages = [
  { href: "/data/pricing", title: "💰 Pricing", stat: "Compare all tools" },
  { href: "/data/vscode", title: "📦 VS Code", stat: stats.vscodeInstallsFormatted + " installs" },
  { href: "/data/releases", title: "🚀 Releases", stat: `${stats.releasesThisWeek} this week` },
  { href: "/data/hackernews", title: "🔥 Hacker News", stat: `${stats.hnMentions} mentions` },
  { href: "/data/news", title: "📰 News", stat: "Last 48 hours" },
  { href: "/data/opensource", title: "⭐ Open Source", stat: "Trending repos" },
  { href: "/data/benchmarks", title: "📊 Benchmarks", stat: "Model rankings" },
  { href: "/data/models", title: "🤖 Models", stat: "All providers" },
];

export const metadata = {
  title: "Data Dashboard — Kell",
  description: "Live competitive intelligence dashboard for AI coding tools. Drill into pricing, hiring, adoption, and more.",
};

export default function DataPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Data Dashboard</h1>
      <p className="text-zinc-400 mb-1">Live competitive intelligence on AI coding tools</p>
      <p className="text-sm text-zinc-600 mb-6">
        {stats.toolsTracked} tools tracked · Updated daily · Last refresh: {stats.lastRefresh}
      </p>

      {/* Key Stats - All from real data */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard 
          value={stats.vscodeInstallsFormatted} 
          label="VS Code Installs" 
          source={sources.vscode}
          sourceLabel="Marketplace"
        />
        <StatCard 
          value={String(stats.releasesThisWeek)} 
          label="Releases This Week" 
          source={sources.github}
          sourceLabel="GitHub"
        />
        <StatCard 
          value={String(stats.hnMentions)} 
          label="HN Mentions (24h)" 
          source={sources.hn}
          sourceLabel="Hacker News"
        />
        <StatCard 
          value={formatPoints(stats.hnPoints)} 
          label="HN Points Total" 
          source={sources.hn}
          sourceLabel="Hacker News"
        />
      </div>

      {/* Top VS Code Extensions */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.08]">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500">Top VS Code Extensions</h2>
          <a href={sources.vscode} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-600 hover:text-zinc-400">
            Source: VS Code Marketplace ↗
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">Extension</th>
                <th className="pb-2 pr-4">Publisher</th>
                <th className="pb-2 pr-4 text-right">Installs</th>
                <th className="pb-2 text-right">Rating</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {topExtensions.map((ext, i) => (
                <tr key={ext.id} className="border-b border-white/[0.04]">
                  <td className="py-2 pr-4 text-zinc-500">{i + 1}</td>
                  <td className="py-2 pr-4 font-medium text-white">
                    <a 
                      href={`https://marketplace.visualstudio.com/items?itemName=${ext.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-400"
                    >
                      {ext.name}
                    </a>
                  </td>
                  <td className="py-2 pr-4 text-zinc-500">{ext.publisher}</td>
                  <td className="py-2 pr-4 text-right text-green-400">{formatNumber(ext.installs)}</td>
                  <td className="py-2 text-right text-zinc-400">⭐ {ext.averageRating.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link href="/data/vscode" className="block mt-3 text-sm text-blue-400 hover:text-blue-300">
          View all {vscodeData.extensions.length} extensions →
        </Link>
      </section>

      {/* Recent Releases */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.08]">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500">Recent Releases</h2>
          <a href={sources.github} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-600 hover:text-zinc-400">
            Source: GitHub Releases ↗
          </a>
        </div>
        <div className="space-y-3">
          {recentReleases.map((release) => (
            <div key={release.url} className="flex items-start justify-between p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
              <div>
                <a 
                  href={release.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-white hover:text-blue-400"
                >
                  {release.company} — {release.tag}
                </a>
                <p className="text-xs text-zinc-500 mt-1">
                  {new Date(release.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  {release.isPrerelease && <span className="ml-2 text-amber-400">(prerelease)</span>}
                </p>
              </div>
              <a 
                href={`https://github.com/${release.repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-600 hover:text-zinc-400"
              >
                {release.repo}
              </a>
            </div>
          ))}
        </div>
        <Link href="/data/releases" className="block mt-3 text-sm text-blue-400 hover:text-blue-300">
          View all releases →
        </Link>
      </section>

      {/* Hacker News Mentions */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.08]">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500">Hacker News Mentions</h2>
          <a href={sources.hn} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-600 hover:text-zinc-400">
            Source: Hacker News ↗
          </a>
        </div>
        <div className="space-y-3">
          {topHNStories.map((story) => (
            <div key={story.id} className="flex items-start justify-between p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
              <div className="flex-1 pr-4">
                <a 
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-white hover:text-blue-400 line-clamp-2"
                >
                  {story.title}
                </a>
                <p className="text-xs text-zinc-500 mt-1">
                  by {story.author} · {story.comments} comments
                </p>
              </div>
              <div className="text-right">
                <span className="text-green-400 font-medium">{story.points}</span>
                <span className="text-xs text-zinc-600 block">points</span>
                <a 
                  href={story.hnUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-orange-400 hover:text-orange-300"
                >
                  HN ↗
                </a>
              </div>
            </div>
          ))}
        </div>
        <Link href="/data/hackernews" className="block mt-3 text-sm text-blue-400 hover:text-blue-300">
          View all {stats.hnMentions} mentions →
        </Link>
      </section>

      {/* Drill-down Grid */}
      <section>
        <div className="mb-4 pb-2 border-b border-white/[0.08]">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500">Explore Data</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {drillDownPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="block p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg hover:border-white/20 hover:bg-white/[0.04] transition-all"
            >
              <div className="font-medium text-white mb-1">{page.title}</div>
              <div className="text-xs text-green-400">{page.stat}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Data freshness note */}
      <div className="mt-10 pt-6 border-t border-white/[0.08] text-xs text-zinc-600">
        <p>
          All data is automatically collected from public sources. 
          Refresh frequency: daily at 05:00 UTC.
        </p>
        <p className="mt-2">
          Sources: <a href={sources.vscode} className="text-zinc-500 hover:text-zinc-400">VS Code Marketplace</a> · 
          <a href={sources.github} className="text-zinc-500 hover:text-zinc-400 ml-1">GitHub</a> · 
          <a href={sources.hn} className="text-zinc-500 hover:text-zinc-400 ml-1">Hacker News</a> · 
          <a href={sources.aider} className="text-zinc-500 hover:text-zinc-400 ml-1">Aider Leaderboard</a>
        </p>
      </div>
    </div>
  );
}

function StatCard({ value, label, source, sourceLabel }: { value: string; label: string; source?: string; sourceLabel?: string }) {
  return (
    <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
      {source && sourceLabel && (
        <a 
          href={source} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] text-zinc-600 hover:text-zinc-500 mt-1 block"
        >
          {sourceLabel} ↗
        </a>
      )}
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function formatPoints(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
