import { getAiderBenchmark, getLMArenaLeaderboard, sources, AiderBenchmarkEntry, LMArenaModel } from "@/lib/data";
import { DataNav, PageHeader, DataBreadcrumb } from "@/components/data-nav";
import { SectionNav } from "@/components/section-nav";

const aider = getAiderBenchmark();
const lmarena = getLMArenaLeaderboard();

// Get all models
const allAiderModels = aider.leaderboard || [];
const topCoding = (lmarena.models as LMArenaModel[] || [])
  .filter((m) => m.rank_coding)
  .sort((a, b) => (a.rank_coding || 0) - (b.rank_coding || 0));

export const metadata = {
  title: "AI Model Benchmarks — Kell",
  description: "Live leaderboards for AI coding models. Aider benchmark + LMArena rankings.",
};

export default function BenchmarksPage() {
  const aiderUpdated = aider.generatedAt 
    ? new Date(aider.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Recently";

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <DataNav />
      
      <DataBreadcrumb current="Benchmarks" />
      <PageHeader 
        title="AI Model Benchmarks"
        description="Live leaderboards for coding and general AI models"
        stats={`${aider.totalModels || 0} models on Aider · ${lmarena.total_models || 0} on LMArena · Updated ${aiderUpdated}`}
      />

      <SectionNav sections={[
        { id: "aider", label: "Aider Benchmark", highlight: true },
        { id: "lmarena", label: "LMArena Rankings" },
        { id: "methodology", label: "Methodology" },
      ]} />

      {/* Key Insights */}
      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-5 mb-8">
        <h2 className="text-xs uppercase tracking-wide text-yellow-400 mb-3">Key Insights</h2>
        <ul className="space-y-2 text-sm text-zinc-300">
          <li>
            <strong className="text-white">{aider.topModel || "GPT-5"}</strong> leads Aider coding benchmark with{" "}
            <strong className="text-green-400">{aider.topScore || 88}%</strong> score
          </li>
          <li>
            <strong className="text-white">Claude Opus 4.6</strong> ranks #1 in LMArena coding category
          </li>
          <li>
            Cost efficiency varies wildly: top scores range from <strong className="text-white">$10</strong> to{" "}
            <strong className="text-white">$150+</strong> per benchmark run
          </li>
        </ul>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <StatCard value={String(aider.totalModels || 69)} label="Aider Models" />
        <StatCard value={`${aider.topScore || 88}%`} label="Top Score" />
        <StatCard value={String(lmarena.total_models || 305)} label="LMArena Models" />
        <StatCard value="#1" label="Claude Opus 4.6 (Coding)" />
      </div>

      {/* Aider Benchmark */}
      <section id="aider" className="mb-10 scroll-mt-32">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 pb-2 border-b border-white/[0.08] gap-2">
          <div>
            <h2 className="text-lg font-semibold text-white">Aider Coding Benchmark</h2>
            <p className="text-sm text-zinc-500">Tests models on real coding tasks using the Aider AI pair programmer</p>
          </div>
          <a 
            href={sources.aider}
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-zinc-400 whitespace-nowrap"
          >
            Source ↗
          </a>
        </div>
        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase">
                <th className="pb-3 pr-4 w-12">#</th>
                <th className="pb-3 pr-4">Model</th>
                <th className="pb-3 pr-4 text-right">Score</th>
                <th className="pb-3 pr-4 text-right">Format</th>
                <th className="pb-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {allAiderModels.map((model: AiderBenchmarkEntry, i: number) => (
                <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className={`py-2.5 pr-4 ${getRankStyle(model.rank || i + 1)}`}>{model.rank || i + 1}</td>
                  <td className="py-2.5 pr-4 font-medium text-white">{model.model}</td>
                  <td className="py-2.5 pr-4 text-right">
                    <span className={getScoreColor(model.score)}>{model.score}%</span>
                  </td>
                  <td className="py-2.5 pr-4 text-right text-zinc-500">{model.formatScore?.toFixed(0) || "—"}%</td>
                  <td className="py-2.5 text-right text-zinc-400">${model.cost?.toFixed(2) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* LMArena Coding Rankings */}
      <section id="lmarena" className="mb-10 scroll-mt-32">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 pb-2 border-b border-white/[0.08] gap-2">
          <div>
            <h2 className="text-lg font-semibold text-white">LMArena Coding Rankings</h2>
            <p className="text-sm text-zinc-500">Crowdsourced rankings from 7M+ human votes</p>
          </div>
          <a 
            href={sources.lmarena}
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-zinc-400 whitespace-nowrap"
          >
            Source ↗
          </a>
        </div>
        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase">
                <th className="pb-3 pr-4 w-16">Coding</th>
                <th className="pb-3 pr-4">Model</th>
                <th className="pb-3 pr-4">Organization</th>
                <th className="pb-3 pr-4 text-center">Overall</th>
                <th className="pb-3 text-center">Math</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {topCoding.slice(0, 20).map((model: LMArenaModel, i: number) => (
                <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className={`py-2.5 pr-4 ${getRankStyle(model.rank_coding ?? 999)}`}>#{model.rank_coding}</td>
                  <td className="py-2.5 pr-4 font-medium text-white">{model.name}</td>
                  <td className="py-2.5 pr-4">
                    <span className="px-2 py-0.5 bg-white/[0.05] text-zinc-400 rounded text-xs">
                      {model.organization}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-center text-zinc-400">#{model.rank_overall || "—"}</td>
                  <td className="py-2.5 text-center text-zinc-500">#{model.rank_math || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Methodology Note */}
      <section id="methodology" className="scroll-mt-32">
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-5 mb-8">
          <h3 className="text-sm font-medium text-white mb-3">About These Benchmarks</h3>
          <div className="text-sm text-zinc-500 space-y-3">
            <p>
              <strong className="text-zinc-400">Aider:</strong> Tests actual code editing ability using real GitHub repos. 
              Models must understand context and produce working diffs. Higher score = more tasks completed successfully.
            </p>
            <p>
              <strong className="text-zinc-400">LMArena:</strong> Human preference rankings from blind A/B tests. 
              7M+ votes across diverse tasks including coding, math, and creative writing. Rankings reflect user preference, not objective metrics.
            </p>
            <p>
              <strong className="text-zinc-400">Cost:</strong> Total API cost to complete the Aider benchmark suite. 
              Varies based on token usage and model pricing.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="pt-6 border-t border-white/[0.08] text-xs text-zinc-600">
        <p>
          Data collected from{" "}
          <a href={sources.aider} className="text-zinc-500 hover:text-zinc-400">Aider Leaderboard</a> and{" "}
          <a href={sources.lmarena} className="text-zinc-500 hover:text-zinc-400">LMArena</a>.
          Updated daily at 05:00 UTC.
        </p>
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="p-3 md:p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
      <div className="text-xl md:text-2xl font-semibold text-white">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
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
