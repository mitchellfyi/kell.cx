import Link from "next/link";
import {
  getDashboardStats,
  getGitHubReleases,
  getHNMentions,
  getAiderBenchmark,
  getLMArenaLeaderboard,
  getAIInsights,
  getMarketAnalysis,
  sources
} from "@/lib/data";
import { DataNav, PageHeader } from "@/components/data-nav";
import { AIInsights } from "@/components/ai-insights";
import { MarketAnalysis } from "@/components/market-analysis";
import { TIME_CONSTANTS, SCORE_THRESHOLDS } from "@/lib/constants";

// Load all stats at build time
const stats = getDashboardStats();
const releasesData = getGitHubReleases();
const hnData = getHNMentions();
const aiderData = getAiderBenchmark();
const lmarenaData = getLMArenaLeaderboard();
const aiInsights = getAIInsights();
const marketAnalysis = getMarketAnalysis();

// Top coding models from Aider benchmark
const topCodingModels = aiderData.leaderboard.slice(0, 8);

// Top overall models from LMArena (filter to those with coding rank)
const topLMArenaModels = lmarenaData.models
  .filter(m => m.rank_coding !== null)
  .slice(0, 8);

// Recent releases (last 7 days)
const oneWeekAgo = new Date(Date.now() - TIME_CONSTANTS.WEEK_MS);
const recentReleases = releasesData.recentReleases
  .filter((r) => new Date(r.publishedAt) > oneWeekAgo)
  .slice(0, 4);

// Top HN stories
const topHNStories = hnData.stories.slice(0, 4);

export const metadata = {
  title: "Data Dashboard — Kell",
  description: "Live competitive intelligence dashboard for AI coding tools. Model leaderboards, pricing, adoption metrics, and more.",
};

export default function DataPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <DataNav />
      
      <PageHeader 
        title="Data Dashboard"
        description="Live competitive intelligence on AI coding tools & models"
        stats={`${stats.toolsTracked} tools · ${aiderData.totalModels} models · Updated daily · Last refresh: ${stats.lastRefresh}`}
      />

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <StatCard 
          value={aiderData.topModel.split(" ")[0]} 
          label="Top Coding Model"
          sublabel={`Score: ${aiderData.topScore}%`}
          href="/data/benchmarks"
        />
        <StatCard 
          value={topLMArenaModels[0]?.name.split("-").slice(0, 2).join("-") || "—"}
          label="Top LMArena Model"
          sublabel={`#${topLMArenaModels[0]?.rank_coding || "—"} for coding`}
          href="/data/models"
        />
        <StatCard 
          value={String(stats.releasesThisWeek)} 
          label="Releases This Week" 
          href="/data/releases"
        />
        <StatCard 
          value={String(stats.hnMentions)} 
          label="HN Mentions (24h)" 
          href="/data/hackernews"
        />
      </div>

      {/* AI-Generated Insights */}
      <AIInsights data={aiInsights} />

      {/* Market Intelligence */}
      <MarketAnalysis data={marketAnalysis} />

      {/* Two Column Layout on Desktop */}
      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        {/* Coding Model Leaderboard - Aider Benchmark */}
        <section id="aider">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.08]">
            <div>
              <h2 className="text-base font-semibold text-white">Coding Leaderboard</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Aider polyglot benchmark</p>
            </div>
            <a href={sources.aider} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-600 hover:text-zinc-400">
              Source ↗
            </a>
          </div>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase">
                  <th className="pb-2 pr-3 w-8">#</th>
                  <th className="pb-2 pr-3">Model</th>
                  <th className="pb-2 pr-3 text-right">Score</th>
                  <th className="pb-2 text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {topCodingModels.map((model) => (
                  <tr key={model.rank} className="border-b border-white/[0.04]">
                    <td className={`py-2 pr-3 ${getRankStyle(model.rank)}`}>{model.rank}</td>
                    <td className="py-2 pr-3 font-medium text-white text-xs md:text-sm truncate max-w-[120px] md:max-w-none">{model.model}</td>
                    <td className={`py-2 pr-3 text-right font-mono ${getScoreColor(model.score)}`}>
                      {model.score.toFixed(1)}%
                    </td>
                    <td className="py-2 text-right text-zinc-400 text-xs">
                      ${model.cost.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/data/benchmarks" className="block mt-3 text-sm text-blue-400 hover:text-blue-300">
            View full leaderboard →
          </Link>
        </section>

        {/* LMArena Coding Rankings */}
        <section id="lmarena">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.08]">
            <div>
              <h2 className="text-base font-semibold text-white">LMArena Rankings</h2>
              <p className="text-xs text-zinc-500 mt-0.5">7M+ human votes</p>
            </div>
            <a href={sources.lmarena} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-600 hover:text-zinc-400">
              Source ↗
            </a>
          </div>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase">
                  <th className="pb-2 pr-3 w-14">Code</th>
                  <th className="pb-2 pr-3">Model</th>
                  <th className="pb-2 text-center">Overall</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {topLMArenaModels.map((model) => (
                  <tr key={model.name} className="border-b border-white/[0.04]">
                    <td className={`py-2 pr-3 font-mono ${getRankStyle(model.rank_coding || 99)}`}>
                      #{model.rank_coding}
                    </td>
                    <td className="py-2 pr-3 font-medium text-white text-xs md:text-sm truncate max-w-[140px] md:max-w-none">{model.name}</td>
                    <td className="py-2 text-center text-zinc-500">#{model.rank_overall}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/data/models" className="block mt-3 text-sm text-blue-400 hover:text-blue-300">
            View all models →
          </Link>
        </section>
      </div>

      {/* Two Column Layout for Releases and HN */}
      <div className="grid lg:grid-cols-2 gap-8 mb-10">
        {/* Recent Releases */}
        <section id="releases">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.08]">
            <h2 className="text-base font-semibold text-white">Recent Releases</h2>
            <Link href="/data/releases" className="text-xs text-zinc-600 hover:text-zinc-400">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recentReleases.length > 0 ? recentReleases.map((release) => (
              <a 
                key={release.url}
                href={release.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-white/[0.02] rounded-lg border border-white/[0.04] hover:border-white/10 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium text-white text-sm">{release.company}</span>
                    <span className="text-zinc-500 text-sm ml-2">{release.tag}</span>
                  </div>
                  <span className="text-xs text-zinc-600">
                    {new Date(release.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </a>
            )) : (
              <p className="text-zinc-500 text-sm">No releases this week</p>
            )}
          </div>
        </section>

        {/* Hacker News Mentions */}
        <section id="hackernews">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.08]">
            <h2 className="text-base font-semibold text-white">Hacker News</h2>
            <Link href="/data/hackernews" className="text-xs text-zinc-600 hover:text-zinc-400">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {topHNStories.length > 0 ? topHNStories.map((story) => (
              <a 
                key={story.id}
                href={story.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-white/[0.02] rounded-lg border border-white/[0.04] hover:border-white/10 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex justify-between items-start gap-3">
                  <span className="font-medium text-white text-sm line-clamp-2 flex-1">{story.title}</span>
                  <span className="text-green-400 font-medium text-sm whitespace-nowrap">{story.points}↑</span>
                </div>
              </a>
            )) : (
              <p className="text-zinc-500 text-sm">No recent mentions</p>
            )}
          </div>
        </section>
      </div>

      {/* Quick Links Grid */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-4 pb-2 border-b border-white/[0.08]">
          Explore More Data
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <QuickLink href="/data/pricing" title="Pricing" stat="Compare plans" />
          <QuickLink href="/data/benchmarks" title="Benchmarks" stat={`${aiderData.totalModels} models`} />
          <QuickLink href="/data/news" title="News" stat="Last 48h" />
          <QuickLink href="/data/opensource" title="Open Source" stat="Trending" />
          <QuickLink href="/data/hiring" title="Hiring" stat="Who's growing" />
          <QuickLink href="/data/models" title="Models" stat="All providers" />
          <QuickLink href="/data/releases" title="Releases" stat={`${stats.releasesThisWeek} this week`} />
          <QuickLink href="/data/hackernews" title="HN" stat={`${stats.hnMentions} mentions`} />
        </div>
      </section>

      {/* Data freshness note */}
      <div className="pt-6 border-t border-white/[0.08] text-xs text-zinc-600">
        <p>
          All data is automatically collected from public sources. 
          Refresh frequency: daily at 05:00 UTC.
        </p>
        <p className="mt-2">
          Sources: <a href={sources.aider} className="text-zinc-500 hover:text-zinc-400">Aider</a> · 
          <a href={sources.lmarena} className="text-zinc-500 hover:text-zinc-400 ml-1">LMArena</a> · 
          <a href={sources.github} className="text-zinc-500 hover:text-zinc-400 ml-1">GitHub</a> · 
          <a href={sources.hn} className="text-zinc-500 hover:text-zinc-400 ml-1">Hacker News</a>
        </p>
      </div>
    </div>
  );
}

function StatCard({ value, label, sublabel, href }: { 
  value: string; 
  label: string; 
  sublabel?: string;
  href?: string;
}) {
  const content = (
    <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center hover:border-white/20 hover:bg-white/[0.03] transition-colors">
      <div className="text-lg md:text-xl font-semibold text-white truncate">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
      {sublabel && <div className="text-xs text-green-400 mt-0.5">{sublabel}</div>}
    </div>
  );
  
  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function QuickLink({ href, title, stat }: { href: string; title: string; stat: string }) {
  return (
    <Link
      href={href}
      className="block p-3 md:p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg hover:border-white/20 hover:bg-white/[0.04] transition-all"
    >
      <div className="font-medium text-white text-sm mb-0.5">{title}</div>
      <div className="text-xs text-zinc-500">{stat}</div>
    </Link>
  );
}

function getRankStyle(rank: number): string {
  if (rank === 1) return "text-amber-400 font-bold";
  if (rank === 2) return "text-zinc-300 font-semibold";
  if (rank === 3) return "text-orange-400 font-semibold";
  return "text-zinc-500";
}

function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.EXCELLENT) return "text-green-400";
  if (score >= SCORE_THRESHOLDS.VERY_GOOD) return "text-emerald-400";
  if (score >= SCORE_THRESHOLDS.GOOD) return "text-amber-400";
  return "text-zinc-400";
}
