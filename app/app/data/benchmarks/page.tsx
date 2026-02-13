import Link from "next/link";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface AiderEntry {
  model: string;
  score: number;
  cost: number | null;
  command: string;
  formatScore: number;
  format: string | null;
  rank: number;
}

interface AiderData {
  generatedAt: string;
  source: string;
  totalModels: number;
  topScore: number;
  topModel: string;
  leaderboard: AiderEntry[];
}

interface SweBenchEntry {
  name: string;
  date: string;
  resolved_pct: number;
  cost: number | null;
  instance_cost: number | null;
  logo: string;
  os_model: boolean;
  os_system: boolean;
  site: string;
  tags: string[];
  rank: number;
}

interface SweBenchLeaderboard {
  name: string;
  entry_count: number;
  top_10: SweBenchEntry[];
}

interface SweBenchData {
  scraped_at: string;
  source: string;
  leaderboard_count: number;
  leaderboards: Record<string, SweBenchLeaderboard>;
}

function getAiderData(): AiderData | null {
  try {
    const dataPath = join(process.cwd(), "..", "data", "aider-benchmark.json");
    if (!existsSync(dataPath)) return null;
    const raw = readFileSync(dataPath, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read Aider data:", e);
    return null;
  }
}

function getSweBenchData(): SweBenchData | null {
  try {
    const dataPath = join(process.cwd(), "..", "data", "swe-bench.json");
    if (!existsSync(dataPath)) return null;
    const raw = readFileSync(dataPath, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read SWE-bench data:", e);
    return null;
  }
}

function formatCost(cost: number | null | undefined): string {
  if (cost === null || cost === undefined) return "—";
  if (cost >= 100) return `$${Math.round(cost)}`;
  if (cost >= 10) return `$${cost.toFixed(0)}`;
  return `$${cost.toFixed(2)}`;
}

function getProviderFromModel(model: string): string {
  const lower = model.toLowerCase();
  if (lower.includes("gpt") || lower.includes("o3") || lower.includes("o4")) return "OpenAI";
  if (lower.includes("claude") || lower.includes("opus") || lower.includes("sonnet")) return "Anthropic";
  if (lower.includes("gemini")) return "Google";
  if (lower.includes("grok")) return "xAI";
  if (lower.includes("deepseek")) return "DeepSeek";
  if (lower.includes("llama") || lower.includes("codellama")) return "Meta";
  if (lower.includes("qwen")) return "Alibaba";
  if (lower.includes("mistral")) return "Mistral";
  return "Other";
}

function getProviderFromTags(tags: string[]): string {
  const orgTag = tags.find(t => t.startsWith("Org: "));
  if (orgTag) return orgTag.replace("Org: ", "");
  return "Unknown";
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 1) return "Today";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export const metadata = {
  title: "AI Coding Benchmarks — Kell",
  description: "Latest benchmark scores for AI coding models. Aider Polyglot, SWE-bench, HumanEval.",
};

export default function BenchmarksPage() {
  const aiderData = getAiderData();
  const sweData = getSweBenchData();

  const aiderTop10 = aiderData?.leaderboard.slice(0, 10) || [];
  const sweVerified = sweData?.leaderboards?.["verified"]?.top_10?.slice(0, 10) || [];
  const sweBashOnly = sweData?.leaderboards?.["bash-only"]?.top_10?.slice(0, 5) || [];

  const aiderUpdated = aiderData ? new Date(aiderData.generatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }) : null;

  const sweUpdated = sweData ? new Date(sweData.scraped_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }) : null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="text-sm text-zinc-500 mb-4">
        <Link href="/data" className="hover:text-white">Data</Link> → Benchmarks
      </div>
      
      <h1 className="text-2xl font-semibold tracking-tight mb-2">📊 AI Coding Model Benchmarks</h1>
      <p className="text-zinc-400 mb-8">Performance scores across major coding benchmarks</p>

      {/* Important distinction */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-8 text-sm">
        <strong className="text-amber-400">⚠️ Models vs Agents:</strong>{" "}
        <span className="text-zinc-400">
          Aider tests raw model coding ability. SWE-bench tests complete agent systems (model + scaffolding).
          A model that ranks lower on Aider might power an agent that ranks higher on SWE-bench.
        </span>
      </div>

      {/* Stats Row */}
      {aiderData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard value={aiderData.totalModels.toString()} label="Models Tested" />
          <StatCard value={`${aiderData.topScore}%`} label="Top Score" />
          <StatCard value={sweVerified.length.toString()} label="SWE-bench Agents" />
          <StatCard value={sweVerified[0]?.resolved_pct ? `${sweVerified[0].resolved_pct}%` : "—"} label="Top Agent Score" />
        </div>
      )}

      {/* Aider Polyglot */}
      <section className="mb-10">
        <div className="mb-4 pb-2 border-b border-white/[0.08]">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500">Aider Polyglot (Code Editing)</h2>
          <p className="text-xs text-zinc-600 mt-1">
            Tests model ability to edit existing code across multiple languages
            {aiderUpdated && <span> · Updated: {aiderUpdated}</span>}
          </p>
        </div>
        {aiderTop10.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Model</th>
                  <th className="pb-2 pr-4">Score</th>
                  <th className="pb-2 pr-4">Cost/Run</th>
                  <th className="pb-2">Provider</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {aiderTop10.map((row) => (
                  <tr key={row.rank} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className={`py-2 pr-4 ${row.rank <= 3 ? "text-amber-400 font-semibold" : ""}`}>{row.rank}</td>
                    <td className="py-2 pr-4 font-medium text-white">{row.model}</td>
                    <td className="py-2 pr-4 font-mono text-green-400">{row.score}%</td>
                    <td className="py-2 pr-4 text-zinc-500">{formatCost(row.cost)}</td>
                    <td className="py-2 text-zinc-500">{getProviderFromModel(row.model)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-zinc-400">Data not available. Check back soon.</p>
        )}
        <p className="text-xs text-zinc-600 mt-4">
          Source: <a href="https://aider.chat/docs/leaderboards/" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">aider.chat/docs/leaderboards</a>
        </p>
      </section>

      {/* SWE-bench Verified */}
      <section className="mb-10">
        <div className="mb-4 pb-2 border-b border-white/[0.08]">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500">SWE-bench Verified (Agent Systems)</h2>
          <p className="text-xs text-zinc-600 mt-1">
            Tests complete agent systems on real GitHub issues. Includes scaffolding, tool use, and retrieval.
            {sweUpdated && <span> · Updated: {sweUpdated}</span>}
          </p>
        </div>
        {sweVerified.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Agent System</th>
                  <th className="pb-2 pr-4">Resolved</th>
                  <th className="pb-2 pr-4">Cost</th>
                  <th className="pb-2">Provider</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {sweVerified.map((row) => (
                  <tr key={row.rank} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className={`py-2 pr-4 ${row.rank <= 3 ? "text-amber-400 font-semibold" : ""}`}>{row.rank}</td>
                    <td className="py-2 pr-4 font-medium text-white">
                      <a href={row.site} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">
                        {row.name}
                      </a>
                    </td>
                    <td className="py-2 pr-4 font-mono text-green-400">{row.resolved_pct}%</td>
                    <td className="py-2 pr-4 text-zinc-500">{formatCost(row.cost)}</td>
                    <td className="py-2 text-zinc-500">{getProviderFromTags(row.tags)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-zinc-400">Data not available. Check back soon.</p>
        )}
        <p className="text-xs text-zinc-600 mt-4">
          Source: <a href="https://www.swebench.com/" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">swebench.com</a>
        </p>
      </section>

      {/* SWE-bench Bash-only */}
      {sweBashOnly.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 pb-2 border-b border-white/[0.08]">
            <h2 className="text-xs uppercase tracking-wide text-zinc-500">SWE-bench Bash-Only (CLI Agents)</h2>
            <p className="text-xs text-zinc-600 mt-1">
              Agents restricted to bash/terminal access only — no GUI, no IDE.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Agent System</th>
                  <th className="pb-2 pr-4">Resolved</th>
                  <th className="pb-2">Provider</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {sweBashOnly.map((row) => (
                  <tr key={row.rank} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className={`py-2 pr-4 ${row.rank <= 3 ? "text-amber-400 font-semibold" : ""}`}>{row.rank}</td>
                    <td className="py-2 pr-4 font-medium text-white">{row.name}</td>
                    <td className="py-2 pr-4 font-mono text-green-400">{row.resolved_pct}%</td>
                    <td className="py-2 text-zinc-500">{getProviderFromTags(row.tags)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Key Takeaways - dynamically generated */}
      <section>
        <div className="mb-4 pb-2 border-b border-white/[0.08]">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500">Key Takeaways</h2>
        </div>
        <div className="space-y-3 text-sm text-zinc-400">
          {aiderData && aiderData.topModel && (
            <p>
              <strong className="text-white">Top coding model:</strong> {aiderData.topModel} leads with {aiderData.topScore}% on Aider Polyglot.
            </p>
          )}
          {sweVerified[0] && (
            <p>
              <strong className="text-white">Top agent system:</strong> {sweVerified[0].name} resolves {sweVerified[0].resolved_pct}% of real GitHub issues on SWE-bench Verified.
            </p>
          )}
          {aiderTop10.length > 1 && aiderTop10.some(m => m.cost != null) && (() => {
            const costs = aiderTop10.filter(m => m.cost != null).map(m => m.cost as number);
            return (
              <p>
                <strong className="text-white">Cost varies widely:</strong> From {formatCost(Math.min(...costs))} to {formatCost(Math.max(...costs))} per run among top 10 models.
                Choose based on task complexity, not just ranking.
              </p>
            );
          })()}
          <p>
            <strong className="text-white">Models ≠ Agents:</strong> Raw model capability (Aider) doesn&apos;t perfectly predict agent performance (SWE-bench). 
            Scaffolding, retrieval, and tool use matter.
          </p>
        </div>
      </section>
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
