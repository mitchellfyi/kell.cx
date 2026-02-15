import { WaitlistForm } from "@/components/waitlist-form";
import { LiveIntel } from "@/components/live-intel";
import { AISearch } from "@/components/ai-search";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      {/* Hero */}
      <h1 className="text-4xl font-semibold tracking-tight mb-2">Kell</h1>
      <p className="text-xl text-zinc-400 mb-2">AI Coding Tools Intelligence</p>
      <p className="text-sm text-zinc-600 mb-8">
        Cursor · Copilot · Claude Code · Windsurf · Cline · Aider · and 10+ more
      </p>

      {/* Pitch */}
      <div className="text-left text-lg text-zinc-300 mb-10">
        <p>
          Track what's happening in AI coding tools.{" "}
          <strong className="text-white">
            Pricing changes, new releases, GitHub stars, VS Code installs, benchmark scores
          </strong>{" "}
          — live data updated daily, delivered to your inbox.
        </p>
      </div>

      {/* Features */}
      <div className="text-left mb-10 p-6 bg-white/[0.02] rounded-xl border border-white/[0.08]">
        <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-4">What you get</h3>
        <ul className="space-y-3 text-zinc-400">
          <li className="flex items-start gap-3">
            <span className="text-zinc-600">—</span>
            <span>Daily digest of competitor activity</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-zinc-600">—</span>
            <span>Pricing page change detection</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-zinc-600">—</span>
            <span>Hiring trends & new roles</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-zinc-600">—</span>
            <span>Changelog & product updates</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-zinc-600">—</span>
            <span>Delivered 6am UTC, every day</span>
          </li>
        </ul>
      </div>

      {/* AI Search */}
      <div className="mb-10 p-6 bg-white/[0.02] rounded-xl border border-white/[0.08]">
        <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-4">Ask AI About Tools</h3>
        <AISearch />
      </div>

      {/* Live Intel */}
      <LiveIntel />

      {/* Sample Briefing */}
      <div className="text-left mb-10 p-6 bg-white/[0.02] rounded-xl border border-white/[0.06]">
        <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-4 flex items-center justify-between">
          Sample briefing
          <a href="/sample" className="text-blue-400 normal-case tracking-normal text-xs">
            View full →
          </a>
        </h3>

        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4 pb-3 border-b border-white/[0.06]">
          <span>From: briefings@kell.cx</span>
          <span className="text-zinc-700">•</span>
          <span>Today, 6:00 AM</span>
        </div>

        <CompetitorSignal
          name="Cursor"
          signals={[
            { text: "Changelog updated Jan 22" },
            { text: "67 open roles (+12 this week)", type: "alert" },
          ]}
        />
        <CompetitorSignal
          name="Replit"
          signals={[
            { text: "New pricing tier detected: Starter $1/mo", type: "new" },
          ]}
        />
        <CompetitorSignal
          name="GitHub Copilot"
          signals={[
            { text: 'New blog post: "Copilot in the CLI"' },
            { text: "Enterprise tier: $39 → $100/seat" },
          ]}
          isLast
        />
      </div>

      {/* Waitlist Signup */}
      <WaitlistForm />

      {/* Extra links */}
      <div className="mt-10 pt-6 border-t border-white/[0.08] text-sm text-zinc-500">
        <p>
          <a href="/data" className="text-blue-400 hover:text-blue-300">
            Live Data Dashboard
          </a>{" "}
          — VS Code stats, releases, HN mentions, benchmarks
        </p>
        <p className="mt-2">
          <a href="/data/pricing" className="text-blue-400 hover:text-blue-300">
            AI Coding Tool Pricing
          </a>{" "}
          — Compare all tools
        </p>
        <p className="mt-2">
          <a href="/search" className="text-blue-400 hover:text-blue-300">
            AI Search
          </a>{" "}
          — Ask questions in natural language
        </p>
      </div>
    </div>
  );
}

function CompetitorSignal({
  name,
  signals,
  isLast = false,
}: {
  name: string;
  signals: { text: string; type?: "new" | "alert" }[];
  isLast?: boolean;
}) {
  return (
    <div className={`${isLast ? "" : "mb-4 pb-4 border-b border-white/[0.04]"}`}>
      <div className="font-semibold text-white text-sm mb-1">{name}</div>
      <div className="text-sm text-zinc-500 space-y-1">
        {signals.map((signal, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 ${
              signal.type === "new" ? "text-green-400" : signal.type === "alert" ? "text-amber-400" : ""
            }`}
          >
            <span className="text-zinc-600 text-xs">•</span>
            <span>{signal.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
