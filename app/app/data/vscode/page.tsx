import Link from "next/link";

export const metadata = {
  title: "VS Code Extensions — Kell",
  description: "AI coding extension popularity and trends in the VS Code marketplace.",
};

// Extension data - will be loaded from JSON once data pipeline is built
const extensionData = [
  {
    name: "GitHub Copilot",
    publisher: "GitHub",
    installs: "~20M+",
    rating: 4.5,
    category: "AI Assistant",
    pricing: "$10-19/mo",
    trend: "stable",
  },
  {
    name: "Codeium",
    publisher: "Codeium",
    installs: "~2M+",
    rating: 4.7,
    category: "AI Assistant",
    pricing: "Free / $15/mo",
    trend: "growing",
  },
  {
    name: "Continue",
    publisher: "Continue",
    installs: "~500K+",
    rating: 4.6,
    category: "AI Assistant",
    pricing: "Free (BYOK)",
    trend: "growing",
  },
  {
    name: "Cline",
    publisher: "Cline",
    installs: "~200K+",
    rating: 4.8,
    category: "AI Agent",
    pricing: "Free (BYOK)",
    trend: "hot",
  },
  {
    name: "Tabnine",
    publisher: "Tabnine",
    installs: "~5M+",
    rating: 4.3,
    category: "AI Assistant",
    pricing: "Free / $12/mo",
    trend: "stable",
  },
  {
    name: "Amazon Q",
    publisher: "Amazon Web Services",
    installs: "~500K+",
    rating: 4.0,
    category: "AI Assistant",
    pricing: "Free / $19/mo",
    trend: "growing",
  },
  {
    name: "Sourcegraph Cody",
    publisher: "Sourcegraph",
    installs: "~100K+",
    rating: 4.5,
    category: "AI Assistant",
    pricing: "Free / $9/mo",
    trend: "growing",
  },
];

function getTrendBadge(trend: string) {
  switch (trend) {
    case "hot":
      return <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">🔥 Hot</span>;
    case "growing":
      return <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">📈 Growing</span>;
    case "stable":
      return <span className="text-xs bg-zinc-500/20 text-zinc-400 px-2 py-0.5 rounded">→ Stable</span>;
    case "declining":
      return <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">📉 Declining</span>;
    default:
      return null;
  }
}

export default function VSCodePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="text-sm text-zinc-500 mb-4">
        <Link href="/data" className="hover:text-white">Data</Link> → VS Code
      </div>
      
      <h1 className="text-2xl font-semibold tracking-tight mb-2">💻 VS Code AI Extensions</h1>
      <p className="text-zinc-400 mb-4">
        Popular AI coding extensions in the VS Code marketplace
      </p>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-8 text-sm">
        <strong className="text-amber-400">⚠️ Data Note:</strong>{" "}
        <span className="text-zinc-400">
          Install counts are approximate. VS Code API doesn&apos;t provide exact numbers publicly.
          Automated tracking coming soon.
        </span>
      </div>

      {/* Extension Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500 uppercase border-b border-white/[0.08]">
              <th className="pb-3 pr-4">Extension</th>
              <th className="pb-3 pr-4">Installs</th>
              <th className="pb-3 pr-4">Rating</th>
              <th className="pb-3 pr-4">Pricing</th>
              <th className="pb-3">Trend</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {extensionData.map((ext) => (
              <tr key={ext.name} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="py-4 pr-4">
                  <div className="font-medium text-white">{ext.name}</div>
                  <div className="text-xs text-zinc-600">{ext.publisher}</div>
                </td>
                <td className="py-4 pr-4 text-zinc-400">{ext.installs}</td>
                <td className="py-4 pr-4">
                  <span className="text-amber-400">★</span> {ext.rating}
                </td>
                <td className="py-4 pr-4 text-zinc-500">{ext.pricing}</td>
                <td className="py-4">{getTrendBadge(ext.trend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Key Insights */}
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-medium text-white">Key Insights</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg">
            <h3 className="text-sm font-medium text-white mb-2">🏆 Market Leader</h3>
            <p className="text-sm text-zinc-400">
              GitHub Copilot dominates with 20M+ installs, but faces growing competition 
              from free alternatives like Codeium and Continue.
            </p>
          </div>
          <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg">
            <h3 className="text-sm font-medium text-white mb-2">🔥 Rising Stars</h3>
            <p className="text-sm text-zinc-400">
              Cline (agentic coding) and Continue (BYOK) are growing fast among 
              power users who want more control.
            </p>
          </div>
          <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg">
            <h3 className="text-sm font-medium text-white mb-2">💰 Free Options</h3>
            <p className="text-sm text-zinc-400">
              BYOK (Bring Your Own Key) tools let developers use their own API keys, 
              making them effectively free if you already pay for API access.
            </p>
          </div>
          <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg">
            <h3 className="text-sm font-medium text-white mb-2">📊 Ratings Caveat</h3>
            <p className="text-sm text-zinc-400">
              High ratings on newer extensions often reflect early adopter enthusiasm. 
              Copilot&apos;s lower rating includes years of feedback.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg text-sm">
        <strong className="text-blue-400">📡 Want extension tracking?</strong>
        <p className="text-zinc-400 mt-1">
          We&apos;re building automated VS Code marketplace tracking.{" "}
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Join the waitlist →
          </Link>
        </p>
      </div>
    </div>
  );
}
