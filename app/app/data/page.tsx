import Link from "next/link";

// This would eventually come from data files
const stats = {
  toolsTracked: 15,
  vscodeInstalls: "160M+",
  openRoles: 847,
  cursorARR: "$308M",
};

const leaderboard = [
  { rank: 1, tool: "Cursor", score: 94, trend: "+8", signal: "67 roles, $308M ARR" },
  { rank: 2, tool: "GitHub Copilot", score: 87, trend: "0", signal: "71M installs, GPT-5.3" },
  { rank: 3, tool: "Codex", score: 84, trend: "+15", signal: "1M+ downloads week 1" },
  { rank: 4, tool: "Windsurf", score: 82, trend: "+12", signal: "Tab v2, aggressive pricing" },
  { rank: 5, tool: "Claude Code", score: 75, trend: "+6", signal: "66K stars, CLI leader" },
];

const recentSignals = [
  { signal: "Pricing page changed (Pro $20 → $60)", tool: "Cursor", date: "Feb 11" },
  { signal: "New release v1.3.31", tool: "Continue", date: "Feb 11" },
  { signal: "GPT-5.3-Codex GA", tool: "GitHub Copilot", date: "Feb 9" },
  { signal: "Tab v2 launched", tool: "Windsurf", date: "Feb 8" },
];

const drillDownPages = [
  { href: "/data/pricing", title: "Pricing", stat: "10 tools compared" },
  { href: "/data/benchmarks", title: "Benchmarks", stat: "69 models ranked" },
  { href: "/data/github", title: "GitHub Stars", stat: "439K total" },
  { href: "/data/vscode", title: "VS Code", stat: "160M+ installs" },
  { href: "/data/hiring", title: "Hiring", stat: "847 open roles" },
  { href: "/data/releases", title: "Releases", stat: "18 this week" },
  { href: "/data/hackernews", title: "Hacker News", stat: "215 mentions" },
  { href: "/data/arxiv", title: "ArXiv Papers", stat: "50+ AI papers" },
  { href: "/data/models", title: "Models", stat: "Foundation + coding" },
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
        {stats.toolsTracked} tools tracked · Updated daily · Last refresh: Feb 11, 2026
      </p>

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 mb-8 text-sm">
        <strong className="text-white">Why this is public:</strong>{" "}
        <span className="text-zinc-400">
          This demonstrates how Briefing works — we track pricing, hiring, adoption, and signals automatically. 
          The same approach works for any vertical.
        </span>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard value={String(stats.toolsTracked)} label="Tools Tracked" />
        <StatCard value={stats.vscodeInstalls} label="VS Code Installs" change="↑ 2.1M this month" />
        <StatCard value={String(stats.openRoles)} label="Open Roles" change="↑ 12% vs last month" />
        <StatCard value={stats.cursorARR} label="Cursor ARR" change="↑ from $100M (Aug)" />
      </div>

      {/* Momentum Leaderboard */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.08]">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500">Momentum Leaderboard</h2>
          <Link href="/leaderboard" className="text-xs text-blue-400 hover:text-blue-300">
            Full rankings →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase">
                <th className="pb-2 pr-4">#</th>
                <th className="pb-2 pr-4">Tool</th>
                <th className="pb-2 pr-4">Score</th>
                <th className="pb-2 pr-4">Trend</th>
                <th className="pb-2">Key Signal</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {leaderboard.map((row) => (
                <tr key={row.rank} className="border-b border-white/[0.04]">
                  <td className="py-2 pr-4">{row.rank}</td>
                  <td className="py-2 pr-4 font-medium text-white">{row.tool}</td>
                  <td className="py-2 pr-4 text-green-400">{row.score}</td>
                  <td className={`py-2 pr-4 ${parseInt(row.trend) > 0 ? "text-green-400" : "text-zinc-500"}`}>
                    {parseInt(row.trend) > 0 ? `↑ ${row.trend}` : "→ 0"}
                  </td>
                  <td className="py-2 text-zinc-500">{row.signal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Signals */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.08]">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500">Recent Signals</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase">
                <th className="pb-2 pr-4">Signal</th>
                <th className="pb-2 pr-4">Tool</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {recentSignals.map((row, i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  <td className="py-2 pr-4">{row.signal}</td>
                  <td className="py-2 pr-4 font-medium text-white">{row.tool}</td>
                  <td className="py-2 text-zinc-500">{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Drill-down Grid */}
      <section>
        <div className="mb-4 pb-2 border-b border-white/[0.08]">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500">Drill Into Data</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
    </div>
  );
}

function StatCard({ value, label, change }: { value: string; label: string; change?: string }) {
  return (
    <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
      {change && <div className="text-xs text-green-400 mt-1">{change}</div>}
    </div>
  );
}
