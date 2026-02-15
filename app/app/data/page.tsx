import Link from "next/link";
import { 
  getDashboardStats, 
  getGitHubReleases, 
  getHNMentions, 
  getAiderBenchmark,
  getLMArenaLeaderboard,
  sources 
} from "@/lib/data";

// Load all stats at build time
const stats = getDashboardStats();
const releasesData = getGitHubReleases();
const hnData = getHNMentions();
const aiderData = getAiderBenchmark();
const lmarenaData = getLMArenaLeaderboard();

// Top coding models from Aider benchmark
const topCodingModels = aiderData.leaderboard.slice(0, 10);

// Top overall models from LMArena (filter to those with coding rank)
const topLMArenaModels = lmarenaData.models
  .filter(m => m.rank_coding !== null)
  .slice(0, 10);

// Recent releases (last 7 days)
const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const recentReleases = releasesData.recentReleases
  .filter((r) => new Date(r.publishedAt) > oneWeekAgo)
  .slice(0, 5);

// Top HN stories
const topHNStories = hnData.stories.slice(0, 5);

const drillDownPages = [
  { href: "/data/pricing", title: "💰 Pricing", stat: "Compare all tools" },
  { href: "/data/benchmarks", title: "📊 Benchmarks", stat: `${aiderData.totalModels} models` },
  { href: "/data/releases", title: "🚀 Releases", stat: `${stats.releasesThisWeek} this week` },
  { href: "/data/hackernews", title: "🔥 Hacker News", stat: `${stats.hnMentions} mentions` },
  { href: "/data/news", title: "📰 News", stat: "Last 48 hours" },
  { href: "/data/opensource", title: "⭐ Open Source", stat: "Trending repos" },
  { href: "/data/models", title: "🤖 Models", stat: "All providers" },
  { href: "/data/hiring", title: "💼 Hiring", stat: "Who's growing" },
];

export const metadata = {
  title: "Data Dashboard — Kell",
  description: "Live competitive intelligence dashboard for AI coding tools. Model leaderboards, pricing, adoption metrics, and more.",
};

export default function DataPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Data Dashboard</h1>
      <p className="text-zinc-400 mb-1">Live competitive intelligence on AI coding tools & models</p>
      <p className="text-sm text-zinc-600 mb-8">
        {stats.toolsTracked} tools · {aiderData.totalModels} models · Updated daily · Last refresh: {stats.lastRefresh}
      </p>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard 
          value={aiderData.topModel.split(" ")[0]} 
          label="Top Coding Model"
          sublabel={`Score: ${aiderData.topScore}`}
          source={sources.aider}
          sourceLabel="Aider"
        />
        <StatCard 
          value={topLMArenaModels[0]?.name.split("-").slice(0, 2).join("-") || "—"}
          label="Top LMArena Model"
          sublabel={`#${topLMArenaModels[0]?.rank_coding || "—"} for coding`}
          source={sources.lmarena}
          sourceLabel="LMArena"
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
      </div>

      {/* Coding Model Leaderboard - Aider Benchmark */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.08]">
          <div>
            <h2 className="text-lg font-semibold text-white">🏆 Coding Model Leaderboard</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Aider polyglot benchmark — real coding tasks across languages</p>
          </div>
          <a href={sources.aider} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-600 hover:text-zinc-400">
            Source: Aider ↗
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase">
                <th className="pb-2 pr-4 w-12">#</th>
                <th className="pb-2 pr-4">Model</th>
                <th className="pb-2 pr-4 text-right">Score</th>
                <th className="pb-2 pr-4 text-right">Format</th>
                <th className="pb-2 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {topCodingModels.map((model) => (
                <tr key={model.rank} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className={`py-2.5 pr-4 ${getRankStyle(model.rank)}`}>{model.rank}</td>
                  <td className="py-2.5 pr-4 font-medium text-white">{model.model}</td>
                  <td className={`py-2.5 pr-4 text-right font-mono ${getScoreColor(model.score)}`}>
                    {model.score.toFixed(1)}%
                  </td>
                  <td className="py-2.5 pr-4 text-right text-zinc-500">
                    {model.formatScore.toFixed(0)}%
                  </td>
                  <td className="py-2.5 text-right text-zinc-400">
                    ${model.cost.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link href="/data/benchmarks" className="block mt-3 text-sm text-blue-400 hover:text-blue-300">
          View full leaderboard ({aiderData.totalModels} models) →
        </Link>
      </section>

      {/* LMArena Coding Rankings */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.08]">
          <div>
            <h2 className="text-lg font-semibold text-white">⚔️ LMArena Coding Rankings</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Crowdsourced rankings from 7M+ human votes</p>
          </div>
          <a href={sources.lmarena} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-600 hover:text-zinc-400">
            Source: LMArena ↗
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase">
                <th className="pb-2 pr-4 w-16">Coding</th>
                <th className="pb-2 pr-4">Model</th>
                <th className="pb-2 pr-4">Provider</th>
                <th className="pb-2 pr-4 text-center">Overall</th>
                <th className="pb-2 pr-4 text-center">Math</th>
                <th className="pb-2 text-center">Multi-turn</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {topLMArenaModels.map((model) => (
                <tr key={model.name} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className={`py-2.5 pr-4 font-mono ${getRankStyle(model.rank_coding || 99)}`}>
                    #{model.rank_coding}
                  </td>
                  <td className="py-2.5 pr-4 font-medium text-white">{model.name}</td>
                  <td className="py-2.5 pr-4">
                    <span className="px-2 py-0.5 bg-white/[0.05] text-zinc-400 rounded text-xs">
                      {model.organization}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-center text-zinc-400">#{model.rank_overall}</td>
                  <td className="py-2.5 pr-4 text-center text-zinc-500">
                    {model.rank_math ? `#${model.rank_math}` : "—"}
                  </td>
                  <td className="py-2.5 text-center text-zinc-500">
                    {model.rank_multi_turn ? `#${model.rank_multi_turn}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link href="/data/models" className="block mt-3 text-sm text-blue-400 hover:text-blue-300">
          View all {lmarenaData.total_models} models →
        </Link>
      </section>

      {/* Recent Releases */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.08]">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500">Recent Releases</h2>
          <a href={sources.github} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-600 hover:text-zinc-400">
            Source: GitHub ↗
          </a>
        </div>
        <div className="space-y-3">
          {recentReleases.length > 0 ? recentReleases.map((release) => (
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
          )) : (
            <p className="text-zinc-500 text-sm">No releases this week</p>
          )}
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
          {topHNStories.length > 0 ? topHNStories.map((story) => (
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
          )) : (
            <p className="text-zinc-500 text-sm">No recent mentions</p>
          )}
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
          Sources: <a href={sources.aider} className="text-zinc-500 hover:text-zinc-400">Aider Benchmark</a> · 
          <a href={sources.lmarena} className="text-zinc-500 hover:text-zinc-400 ml-1">LMArena</a> · 
          <a href={sources.github} className="text-zinc-500 hover:text-zinc-400 ml-1">GitHub</a> · 
          <a href={sources.hn} className="text-zinc-500 hover:text-zinc-400 ml-1">Hacker News</a>
        </p>
      </div>
    </div>
  );
}

function StatCard({ value, label, sublabel, source, sourceLabel }: { 
  value: string; 
  label: string; 
  sublabel?: string;
  source?: string; 
  sourceLabel?: string 
}) {
  return (
    <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
      <div className="text-xl font-semibold text-white truncate">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
      {sublabel && <div className="text-xs text-green-400 mt-0.5">{sublabel}</div>}
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

function getRankStyle(rank: number): string {
  if (rank === 1) return "text-amber-400 font-bold";
  if (rank === 2) return "text-zinc-300 font-semibold";
  if (rank === 3) return "text-orange-400 font-semibold";
  return "text-zinc-500";
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 70) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-zinc-400";
}
