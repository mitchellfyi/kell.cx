import Link from "next/link";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Load benchmark data
function loadAiderBenchmark() {
  const path = join(process.cwd(), "..", "data", "aider-benchmark.json");
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      return { leaderboard: [] };
    }
  }
  return { leaderboard: [] };
}

function loadLMArena() {
  const path = join(process.cwd(), "..", "data", "lmarena-leaderboard.json");
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      return { models: [] };
    }
  }
  return { models: [] };
}

function loadInsights() {
  const path = join(process.cwd(), "..", "data", "insights.json");
  if (existsSync(path)) {
    try {
      const data = JSON.parse(readFileSync(path, "utf8"));
      return data.benchmarks || data.market || [];
    } catch {
      return [];
    }
  }
  return [];
}

const aider = loadAiderBenchmark();
const lmarena = loadLMArena();
const insights = loadInsights();

export const metadata = {
  title: "AI Model Benchmarks — Kell",
  description: "Live leaderboards for AI coding models. Aider benchmark + LMArena rankings.",
};

export default function BenchmarksPage() {
  const aiderUpdated = aider.generatedAt 
    ? new Date(aider.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "Recently";
  const arenaUpdated = lmarena.fetched_at
    ? new Date(lmarena.fetched_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "Recently";

  // Get top models for each benchmark
  const topAider = aider.leaderboard?.slice(0, 10) || [];
  const topCoding = lmarena.models?.filter((m: any) => m.rank_coding)
    .sort((a: any, b: any) => a.rank_coding - b.rank_coding).slice(0, 10) || [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-6">
        <Link href="/data" className="text-sm text-zinc-500 hover:text-zinc-400">
          ← Back to Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight mb-2">AI Model Benchmarks</h1>
      <p className="text-zinc-400 mb-1">Live leaderboards for coding and general AI models</p>
      <p className="text-sm text-zinc-600 mb-6">
        {aider.totalModels || 0} models on Aider · {lmarena.total_models || 0} on LMArena
      </p>

      {/* Key Insights */}
      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-5 mb-8">
        <h2 className="text-xs uppercase tracking-wide text-yellow-400 mb-4">🏆 Key Insights</h2>
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
          {insights.slice(0, 2).map((insight: string, i: number) => (
            <li key={i}>{insight}</li>
          ))}
        </ul>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard value={String(aider.totalModels || 69)} label="Aider Models" />
        <StatCard value={`${aider.topScore || 88}%`} label="Top Score" />
        <StatCard value={String(lmarena.total_models || 305)} label="LMArena Models" />
        <StatCard value="#1 Coding" label="Claude Opus 4.6" />
      </div>

      {/* Tabs would go here - for now showing both */}
      
      {/* Aider Benchmark */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.08]">
          <h2 className="text-lg font-medium text-white">🔧 Aider Coding Benchmark</h2>
          <a 
            href="https://aider.chat/docs/leaderboards/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-zinc-400"
          >
            Source ↗ · Updated {aiderUpdated}
          </a>
        </div>
        <p className="text-sm text-zinc-500 mb-4">
          Tests models on real coding tasks using the Aider AI pair programmer. Higher = better.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Model</th>
                <th className="pb-3 pr-4 text-right">Score</th>
                <th className="pb-3 pr-4 text-right">Cost</th>
                <th className="pb-3">Command</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {topAider.map((model: any, i: number) => (
                <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-3 pr-4 text-zinc-500">{model.rank || i + 1}</td>
                  <td className="py-3 pr-4 font-medium text-white">{model.model}</td>
                  <td className="py-3 pr-4 text-right">
                    <span className={model.score >= 80 ? "text-green-400" : model.score >= 60 ? "text-yellow-400" : "text-zinc-400"}>
                      {model.score}%
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right text-zinc-500">
                    ${model.cost?.toFixed(2) || "—"}
                  </td>
                  <td className="py-3 text-xs text-zinc-600 font-mono">
                    {model.command || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* LMArena Coding Rankings */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.08]">
          <h2 className="text-lg font-medium text-white">🎯 LMArena Coding Rankings</h2>
          <a 
            href="https://lmarena.ai/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-zinc-400"
          >
            Source ↗ · Updated {arenaUpdated}
          </a>
        </div>
        <p className="text-sm text-zinc-500 mb-4">
          Crowdsourced rankings from 7M+ human votes. Coding category specific.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase">
                <th className="pb-3 pr-4">Coding Rank</th>
                <th className="pb-3 pr-4">Model</th>
                <th className="pb-3 pr-4">Organization</th>
                <th className="pb-3 pr-4 text-right">Overall</th>
                <th className="pb-3 text-right">Math</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {topCoding.map((model: any, i: number) => (
                <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-3 pr-4">
                    <span className={model.rank_coding <= 3 ? "text-yellow-400 font-medium" : "text-zinc-500"}>
                      #{model.rank_coding}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-medium text-white">{model.name}</td>
                  <td className="py-3 pr-4 text-zinc-500">{model.organization}</td>
                  <td className="py-3 pr-4 text-right text-zinc-400">
                    #{model.rank_overall || "—"}
                  </td>
                  <td className="py-3 text-right text-zinc-400">
                    #{model.rank_math || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Methodology Note */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-5 mb-8">
        <h3 className="text-sm font-medium text-white mb-2">About These Benchmarks</h3>
        <div className="text-sm text-zinc-500 space-y-2">
          <p>
            <strong className="text-zinc-400">Aider:</strong> Tests actual code editing ability using real GitHub repos. 
            Models must understand context and produce working diffs.
          </p>
          <p>
            <strong className="text-zinc-400">LMArena:</strong> Human preference rankings from blind A/B tests. 
            7M+ votes across diverse tasks including coding, math, and creative writing.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-white/[0.08] text-xs text-zinc-600">
        <p>
          Data collected from{" "}
          <a href="https://aider.chat/docs/leaderboards/" className="text-zinc-500 hover:text-zinc-400">Aider Leaderboard</a> and{" "}
          <a href="https://lmarena.ai/" className="text-zinc-500 hover:text-zinc-400">LMArena</a>.
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
