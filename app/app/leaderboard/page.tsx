import Link from "next/link";

export const metadata = {
  title: "AI Coding Tools Leaderboard — Kell",
  description: "Overall rankings of AI coding assistants by momentum score - combining installs, hiring, social, and growth metrics.",
};

const leaderboardData = [
  { rank: 1, tool: "Cursor", score: 94, trend: "+8", signal: "67 open roles, $308M ARR", category: "IDE" },
  { rank: 2, tool: "GitHub Copilot", score: 87, trend: "0", signal: "71M installs, GPT-5.3 launch", category: "Extension" },
  { rank: 3, tool: "Codex", score: 84, trend: "+15", signal: "1M+ downloads week 1", category: "CLI" },
  { rank: 4, tool: "Windsurf", score: 82, trend: "+12", signal: "Tab v2, aggressive pricing", category: "IDE" },
  { rank: 5, tool: "Claude Code", score: 75, trend: "+6", signal: "66K stars, CLI leader", category: "CLI" },
  { rank: 6, tool: "Lovable", score: 72, trend: "+18", signal: "98 roles, rapid hiring", category: "Builder" },
  { rank: 7, tool: "Cline", score: 68, trend: "+4", signal: "32K stars, extension growth", category: "Extension" },
  { rank: 8, tool: "Aider", score: 65, trend: "+2", signal: "25K stars, polyglot benchmark lead", category: "CLI" },
  { rank: 9, tool: "Continue", score: 62, trend: "+3", signal: "20K stars, v1.3.31 release", category: "Extension" },
  { rank: 10, tool: "Bolt", score: 58, trend: "+5", signal: "AI app builder momentum", category: "Builder" },
  { rank: 11, tool: "v0", score: 55, trend: "+1", signal: "Vercel integration, UI focus", category: "Builder" },
  { rank: 12, tool: "Replit", score: 52, trend: "-2", signal: "New $1/mo starter tier", category: "IDE" },
  { rank: 13, tool: "Tabnine", score: 48, trend: "-1", signal: "Enterprise focus, privacy angle", category: "Extension" },
  { rank: 14, tool: "Codeium", score: 45, trend: "0", signal: "Free tier leader, 4.76 rating", category: "Extension" },
  { rank: 15, tool: "Amazon Q", score: 42, trend: "+3", signal: "AWS integration play", category: "Extension" },
];

const methodology = {
  weights: [
    { metric: "GitHub stars & activity", weight: "25%" },
    { metric: "Hiring velocity", weight: "20%" },
    { metric: "Social growth (Twitter/LinkedIn)", weight: "15%" },
    { metric: "HN/community mentions", weight: "15%" },
    { metric: "VS Code/package installs", weight: "15%" },
    { metric: "Funding recency", weight: "10%" },
  ],
};

function getRankStyle(rank: number): string {
  if (rank === 1) return "text-amber-400 font-bold";
  if (rank === 2) return "text-zinc-300 font-semibold";
  if (rank === 3) return "text-orange-400 font-semibold";
  return "text-zinc-500";
}

function getScoreStyle(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-zinc-400";
}

function getTrendStyle(trend: string): string {
  const val = parseInt(trend);
  if (val > 0) return "text-green-400";
  if (val < 0) return "text-red-400";
  return "text-zinc-500";
}

function formatTrend(trend: string): string {
  const val = parseInt(trend);
  if (val > 0) return `↑ +${val}`;
  if (val < 0) return `↓ ${val}`;
  return "→ 0";
}

export default function LeaderboardPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="text-sm text-zinc-500 mb-4">
        <Link href="/data" className="hover:text-white">Data</Link> → Leaderboard
      </div>

      <h1 className="text-2xl font-semibold tracking-tight mb-2">🏆 Momentum Leaderboard</h1>
      <p className="text-zinc-400 mb-1">AI coding tools ranked by overall velocity and growth</p>
      <p className="text-sm text-zinc-600 mb-6">Updated: February 13, 2026</p>

      {/* Methodology */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 mb-8">
        <h3 className="text-sm font-medium text-white mb-2">How we calculate momentum</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          {methodology.weights.map((w) => (
            <div key={w.metric} className="flex justify-between text-zinc-400">
              <span>{w.metric}</span>
              <span className="text-zinc-500">{w.weight}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          CLI tools weighted by PyPI/NPM/Homebrew downloads instead of VS Code installs.
        </p>
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500 uppercase">
              <th className="pb-3 pr-4 w-12">#</th>
              <th className="pb-3 pr-4">Tool</th>
              <th className="pb-3 pr-4 w-20">Score</th>
              <th className="pb-3 pr-4 w-20">Trend</th>
              <th className="pb-3 pr-4 w-24">Category</th>
              <th className="pb-3">Key Signal</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {leaderboardData.map((row) => (
              <tr key={row.rank} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className={`py-3 pr-4 ${getRankStyle(row.rank)}`}>{row.rank}</td>
                <td className="py-3 pr-4 font-medium text-white">{row.tool}</td>
                <td className={`py-3 pr-4 font-mono ${getScoreStyle(row.score)}`}>{row.score}</td>
                <td className={`py-3 pr-4 ${getTrendStyle(row.trend)}`}>{formatTrend(row.trend)}</td>
                <td className="py-3 pr-4">
                  <span className="px-2 py-0.5 bg-white/[0.05] text-zinc-400 rounded text-xs">
                    {row.category}
                  </span>
                </td>
                <td className="py-3 text-zinc-500">{row.signal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Categories Breakdown */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-4 pb-2 border-b border-white/[0.08]">
          By Category
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["IDE", "Extension", "CLI", "Builder"].map((cat) => {
            const tools = leaderboardData.filter((t) => t.category === cat);
            const topTool = tools[0];
            return (
              <div key={cat} className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.06]">
                <div className="text-xs text-zinc-500 uppercase mb-1">{cat}</div>
                <div className="text-lg font-semibold text-white">{topTool?.tool || "—"}</div>
                <div className="text-sm text-zinc-400">
                  Score: <span className={getScoreStyle(topTool?.score || 0)}>{topTool?.score || "—"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Key Takeaways */}
      <section>
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-4 pb-2 border-b border-white/[0.08]">
          Key Takeaways
        </h2>
        <div className="space-y-3 text-sm text-zinc-400">
          <p>
            <strong className="text-white">Cursor dominates:</strong> Despite price increases, maintaining #1 with highest momentum score (94).
          </p>
          <p>
            <strong className="text-white">Codex surging:</strong> OpenAI&apos;s standalone agent jumped +15 spots on launch momentum.
          </p>
          <p>
            <strong className="text-white">CLI tools rising:</strong> Claude Code, Aider, and Codex showing CLI is a viable alternative to IDE integration.
          </p>
          <p>
            <strong className="text-white">Builder category emerging:</strong> Lovable, Bolt, v0 carving out AI app builder niche.
          </p>
        </div>
      </section>
    </div>
  );
}
