import { WaitlistForm } from "@/components/waitlist-form";
import { LiveIntel } from "@/components/live-intel";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-16 text-center">
      {/* Hero */}
      <div className="text-6xl mb-4">⚡</div>
      <h1 className="text-4xl font-semibold tracking-tight mb-2">Kell</h1>
      <p className="text-xl text-zinc-400 mb-8">Daily Competitive Intelligence</p>

      {/* Pitch */}
      <div className="text-left text-lg text-zinc-300 mb-10">
        <p>
          Wake up to a briefing on your competitors' moves.{" "}
          <strong className="text-white">
            Pricing changes, new hires, product launches, changelog updates
          </strong>{" "}
          — delivered to your inbox before your morning coffee.
        </p>
      </div>

      {/* Features */}
      <div className="text-left mb-10 p-6 bg-white/[0.02] rounded-xl border border-white/[0.08]">
        <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-4">What you get</h3>
        <div className="space-y-3 text-zinc-400">
          <Feature icon="📊" text="Daily digest of competitor activity" />
          <Feature icon="💰" text="Pricing page change detection" />
          <Feature icon="💼" text="Hiring trends & new roles" />
          <Feature icon="📝" text="Changelog & product updates" />
          <Feature icon="⏰" text="Delivered 6am UTC, every day" />
        </div>
      </div>

      {/* Live Intel */}
      <LiveIntel />

      {/* Sample Briefing */}
      <div className="text-left mb-10 p-6 bg-white/[0.02] rounded-xl border border-white/[0.06]">
        <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-4">
          Sample briefing
        </h3>

        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4 pb-3 border-b border-white/[0.06]">
          <span>From: briefings@kell.cx</span>
          <span className="text-zinc-700">•</span>
          <span>Today, 6:00 AM</span>
        </div>

        <CompetitorSignal
          name="Cursor"
          signals={[
            { icon: "📅", text: "Changelog updated Jan 22" },
            { icon: "💼", text: "67 open roles (+12 this week)", type: "alert" },
          ]}
        />
        <CompetitorSignal
          name="Replit"
          signals={[
            { icon: "💰", text: "New pricing tier detected: Starter $1/mo", type: "new" },
          ]}
        />
        <CompetitorSignal
          name="GitHub Copilot"
          signals={[
            { icon: "📝", text: 'New blog post: "Copilot in the CLI"' },
            { icon: "💰", text: "Enterprise tier: $39 → $100/seat" },
          ]}
          isLast
        />
      </div>

      {/* Waitlist Signup */}
      <WaitlistForm />

      {/* Extra links */}
      <div className="mt-10 pt-6 border-t border-white/[0.08] text-sm text-zinc-500">
        <p>
          <a href="/blog/state-of-ai-coding-2026" className="text-blue-400 hover:text-blue-300">
            📊 State of AI Coding Tools 2026
          </a>{" "}
          — Market analysis
        </p>
        <p className="mt-2">
          <a href="/blog/ai-coding-tool-pricing-2026" className="text-blue-400 hover:text-blue-300">
            💰 AI Coding Tool Pricing 2026
          </a>{" "}
          — Complete comparison
        </p>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex-shrink-0">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function CompetitorSignal({
  name,
  signals,
  isLast = false,
}: {
  name: string;
  signals: { icon: string; text: string; type?: "new" | "alert" }[];
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
            <span className="text-xs">{signal.icon}</span>
            <span>{signal.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
