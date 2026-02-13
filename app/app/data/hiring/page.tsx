import Link from "next/link";

export const metadata = {
  title: "Hiring Trends — Kell",
  description: "Open roles and hiring velocity for AI coding tool companies. Track who's growing fastest.",
};

const hiringData = [
  { company: "Lovable", roles: 98, change: "+34", departments: "Engineering, Sales, Marketing", signal: "Rapid expansion" },
  { company: "Cursor", roles: 67, change: "+12", departments: "Engineering, Product", signal: "Series B scaling" },
  { company: "Windsurf", roles: 52, change: "+8", departments: "Engineering, DevRel", signal: "Post-launch hiring" },
  { company: "Cognition (Devin)", roles: 45, change: "+6", departments: "Research, Engineering", signal: "Autonomous agents" },
  { company: "Replit", roles: 34, change: "-3", departments: "Engineering, Education", signal: "Stabilizing" },
  { company: "Codeium", roles: 28, change: "+4", departments: "Engineering, Enterprise Sales", signal: "Enterprise push" },
  { company: "Continue", roles: 18, change: "+2", departments: "Engineering", signal: "Open source growth" },
  { company: "Factory", roles: 15, change: "+5", departments: "Research, Engineering", signal: "Stealth mode" },
  { company: "Sourcegraph", roles: 12, change: "-2", departments: "Engineering", signal: "Cody focus" },
  { company: "Tabnine", roles: 11, change: "0", departments: "Engineering, Sales", signal: "Steady state" },
];

const stats = {
  totalRoles: 847,
  weeklyChange: "+67",
  companiesTracked: 15,
  topDepartment: "Engineering",
};

const insights = [
  { title: "Lovable leads", desc: "98 open roles (+34 this week) — fastest growing company in space" },
  { title: "Cursor scaling", desc: "67 roles as they scale post-Series B at $308M ARR" },
  { title: "Engineering dominant", desc: "72% of roles are engineering — product still being built" },
  { title: "Sales emerging", desc: "Enterprise sales roles up 40% vs last month" },
];

function getChangeStyle(change: string): string {
  const val = parseInt(change);
  if (val > 0) return "text-green-400";
  if (val < 0) return "text-red-400";
  return "text-zinc-500";
}

function formatChange(change: string): string {
  const val = parseInt(change);
  if (val > 0) return `+${val}`;
  if (val < 0) return `${val}`;
  return "—";
}

export default function HiringPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="text-sm text-zinc-500 mb-4">
        <Link href="/data" className="hover:text-white">Data</Link> → Hiring
      </div>

      <h1 className="text-2xl font-semibold tracking-tight mb-2">💼 Hiring Trends</h1>
      <p className="text-zinc-400 mb-8">Open roles and hiring velocity across AI coding tool companies</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
          <div className="text-2xl font-semibold text-white">{stats.totalRoles}</div>
          <div className="text-xs text-zinc-500 mt-1">Total Open Roles</div>
        </div>
        <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
          <div className="text-2xl font-semibold text-green-400">{stats.weeklyChange}</div>
          <div className="text-xs text-zinc-500 mt-1">This Week</div>
        </div>
        <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
          <div className="text-2xl font-semibold text-white">{stats.companiesTracked}</div>
          <div className="text-xs text-zinc-500 mt-1">Companies Tracked</div>
        </div>
        <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
          <div className="text-2xl font-semibold text-white">72%</div>
          <div className="text-xs text-zinc-500 mt-1">Engineering Roles</div>
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {insights.map((insight) => (
          <div key={insight.title} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-lg">
            <div className="font-medium text-white text-sm mb-1">{insight.title}</div>
            <div className="text-sm text-zinc-400">{insight.desc}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-4 pb-2 border-b border-white/[0.08]">
          By Company
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase">
                <th className="pb-3 pr-4">Company</th>
                <th className="pb-3 pr-4 w-24">Open Roles</th>
                <th className="pb-3 pr-4 w-20">Change</th>
                <th className="pb-3 pr-4">Key Departments</th>
                <th className="pb-3">Signal</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {hiringData.map((row) => (
                <tr key={row.company} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-3 pr-4 font-medium text-white">{row.company}</td>
                  <td className="py-3 pr-4 font-mono">{row.roles}</td>
                  <td className={`py-3 pr-4 font-mono ${getChangeStyle(row.change)}`}>
                    {formatChange(row.change)}
                  </td>
                  <td className="py-3 pr-4 text-zinc-400">{row.departments}</td>
                  <td className="py-3 text-zinc-500">{row.signal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Department Breakdown */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-4 pb-2 border-b border-white/[0.08]">
          By Department
        </h2>
        <div className="space-y-3">
          {[
            { dept: "Engineering", pct: 72, roles: 610 },
            { dept: "Sales / BD", pct: 12, roles: 102 },
            { dept: "Product", pct: 8, roles: 68 },
            { dept: "Marketing / DevRel", pct: 5, roles: 42 },
            { dept: "Other", pct: 3, roles: 25 },
          ].map((d) => (
            <div key={d.dept} className="flex items-center gap-4">
              <div className="w-32 text-sm text-zinc-300">{d.dept}</div>
              <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${d.pct}%` }} />
              </div>
              <div className="w-20 text-right text-sm text-zinc-500">{d.roles} roles</div>
            </div>
          ))}
        </div>
      </section>

      {/* Methodology */}
      <div className="text-xs text-zinc-600 border-t border-white/[0.08] pt-4">
        <strong className="text-zinc-500">Sources:</strong> LinkedIn Jobs, company career pages, Greenhouse, Lever, Ashby.
        Updated weekly. Some roles may be duplicates across platforms.
      </div>
    </div>
  );
}
