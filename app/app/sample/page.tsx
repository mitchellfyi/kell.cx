import Link from "next/link";

export const metadata = {
  title: "Sample Briefing — Kell",
  description: "See what a Kell daily competitive intelligence briefing looks like. Real data, real signals.",
};

const sampleBriefing = {
  date: "February 13, 2026",
  summary: {
    toolsTracked: 15,
    signalsDetected: 23,
    pricingChanges: 2,
    newReleases: 7,
  },
  highlights: [
    { type: "pricing", tool: "Cursor", signal: "Pro tier increased $20 → $60/mo", impact: "high" },
    { type: "release", tool: "Codex", signal: "1M+ downloads in first week", impact: "high" },
    { type: "hiring", tool: "Lovable", signal: "98 open roles (+34 this week)", impact: "medium" },
    { type: "product", tool: "Windsurf", signal: "Tab v2 launched with aggressive pricing", impact: "high" },
  ],
  competitors: [
    {
      name: "Cursor",
      signals: [
        { icon: "💰", text: "Pricing page changed: Pro $20 → $60/mo", type: "alert" },
        { icon: "💼", text: "67 open roles (+12 this week)", type: "alert" },
        { icon: "📅", text: "Changelog updated Feb 11" },
      ],
    },
    {
      name: "GitHub Copilot",
      signals: [
        { icon: "🚀", text: "GPT-5.3-Codex now generally available", type: "new" },
        { icon: "📊", text: "71.2M VS Code installs (+2.1M this month)" },
        { icon: "📝", text: 'New blog post: "Copilot in the CLI"' },
      ],
    },
    {
      name: "Codex (OpenAI)",
      signals: [
        { icon: "🎉", text: "Launched to public Feb 9", type: "new" },
        { icon: "📈", text: "1M+ downloads in first week", type: "alert" },
        { icon: "💬", text: "47 HN mentions this week" },
      ],
    },
    {
      name: "Windsurf",
      signals: [
        { icon: "🚀", text: "Tab v2 launched", type: "new" },
        { icon: "💰", text: "Free tier expanded: 500 credits/mo" },
        { icon: "💼", text: "52 open roles (+8 this week)" },
      ],
    },
    {
      name: "Claude Code",
      signals: [
        { icon: "⭐", text: "66K GitHub stars (+2.1K this week)" },
        { icon: "📦", text: "v2.1.39 released" },
        { icon: "💬", text: "23 HN mentions this week" },
      ],
    },
    {
      name: "Replit",
      signals: [
        { icon: "💰", text: "New pricing tier: Starter $1/mo", type: "new" },
        { icon: "💼", text: "34 open roles" },
      ],
    },
  ],
  marketInsights: [
    "Cursor's aggressive pricing increase signals confidence in product stickiness",
    "OpenAI's Codex launch creates direct competition with GitHub Copilot",
    "Windsurf expanding free tier to capture market share from Cursor",
  ],
};

function SignalBadge({ type }: { type?: string }) {
  if (type === "alert") {
    return <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded">ALERT</span>;
  }
  if (type === "new") {
    return <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded">NEW</span>;
  }
  return null;
}

export default function SamplePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      {/* Header */}
      <div className="text-center mb-8 pb-6 border-b border-white/[0.08]">
        <div className="text-4xl mb-3">📬</div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Daily Briefing</h1>
        <p className="text-zinc-500 text-sm">{sampleBriefing.date}</p>
        <div className="inline-block mt-3 px-3 py-1 bg-green-500/10 text-green-400 text-xs rounded-full">
          🔴 Live sample with real data
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <div className="text-center p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
          <div className="text-xl font-semibold">{sampleBriefing.summary.toolsTracked}</div>
          <div className="text-[10px] text-zinc-500 uppercase">Tools</div>
        </div>
        <div className="text-center p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
          <div className="text-xl font-semibold text-amber-400">{sampleBriefing.summary.signalsDetected}</div>
          <div className="text-[10px] text-zinc-500 uppercase">Signals</div>
        </div>
        <div className="text-center p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
          <div className="text-xl font-semibold text-red-400">{sampleBriefing.summary.pricingChanges}</div>
          <div className="text-[10px] text-zinc-500 uppercase">Pricing</div>
        </div>
        <div className="text-center p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
          <div className="text-xl font-semibold text-green-400">{sampleBriefing.summary.newReleases}</div>
          <div className="text-[10px] text-zinc-500 uppercase">Releases</div>
        </div>
      </div>

      {/* Top Highlights */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-3 pb-2 border-b border-white/[0.08]">
          🔥 Top Highlights
        </h2>
        <div className="space-y-2">
          {sampleBriefing.highlights.map((h, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
              <span className="font-medium text-white text-sm">{h.tool}</span>
              <span className="text-zinc-400 text-sm flex-1">{h.signal}</span>
              {h.impact === "high" && <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400 rounded">HIGH</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Per-Competitor Signals */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-3 pb-2 border-b border-white/[0.08]">
          📊 By Competitor
        </h2>
        <div className="space-y-4">
          {sampleBriefing.competitors.map((comp) => (
            <div key={comp.name} className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.06]">
              <h3 className="font-semibold text-white mb-2">{comp.name}</h3>
              <div className="space-y-1.5">
                {comp.signals.map((sig, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                    <span>{sig.icon}</span>
                    <span>{sig.text}</span>
                    <SignalBadge type={sig.type} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Market Insights */}
      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-3 pb-2 border-b border-white/[0.08]">
          💡 Market Insights
        </h2>
        <ul className="space-y-2 text-sm text-zinc-400">
          {sampleBriefing.marketInsights.map((insight, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-zinc-600">•</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <div className="text-center p-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-xl border border-blue-500/20">
        <h3 className="text-lg font-medium text-white mb-2">Get this in your inbox daily</h3>
        <p className="text-zinc-400 text-sm mb-4">Free during beta. No spam, just intel.</p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-white text-zinc-950 font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          Join waitlist →
        </Link>
      </div>
    </div>
  );
}
