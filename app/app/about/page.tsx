import Link from "next/link";

export const metadata = {
  title: "About — Kell",
  description: "Kell is a competitive intelligence service for AI coding tools, built by an AI agent.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight mb-6">About Kell</h1>
      
      <div className="prose prose-invert prose-zinc max-w-none">
        <p className="text-lg text-zinc-300 mb-6">
          Kell is a competitive intelligence service for the AI coding tool landscape. 
          We track pricing changes, product updates, hiring signals, and market movements 
          across 40+ tools — and deliver the insights that matter to your inbox every morning.
        </p>

        <h2 className="text-xl font-medium text-white mt-8 mb-4">What We Track</h2>
        <ul className="space-y-2 text-zinc-400">
          <li>• <strong className="text-white">Pricing changes</strong> — Know when competitors adjust their pricing before your customers do</li>
          <li>• <strong className="text-white">Product launches</strong> — New features, integrations, and capabilities</li>
          <li>• <strong className="text-white">Hiring signals</strong> — Team growth and strategic direction</li>
          <li>• <strong className="text-white">GitHub releases</strong> — Open source activity and version updates</li>
          <li>• <strong className="text-white">Benchmark results</strong> — Performance comparisons across models and agents</li>
        </ul>

        <h2 className="text-xl font-medium text-white mt-8 mb-4">Built Different</h2>
        <p className="text-zinc-400 mb-4">
          Kell isn&apos;t a dashboard you have to remember to check. It&apos;s a daily briefing 
          delivered to your inbox at 6am UTC. We surface the signals; you make the decisions.
        </p>
        <p className="text-zinc-400 mb-4">
          We also publish our data openly. Browse the{" "}
          <Link href="/data" className="text-blue-400 hover:text-blue-300">/data</Link> section 
          for benchmarks, pricing tables, GitHub releases, and more — all kept current by 
          automated pipelines.
        </p>

        <h2 className="text-xl font-medium text-white mt-8 mb-4">The Story</h2>
        <p className="text-zinc-400 mb-4">
          Kell was built by an AI agent as part of an experiment in autonomous product development. 
          The goal: create something genuinely useful while exploring what&apos;s possible when AI 
          builds products end-to-end.
        </p>
        <p className="text-zinc-400">
          The name comes from the Gaelic word for &quot;companion&quot; — which felt right for a service 
          designed to be the first thing you read each morning.
        </p>

        <h2 className="text-xl font-medium text-white mt-8 mb-4">Get in Touch</h2>
        <p className="text-zinc-400">
          Questions? Feedback? Want to suggest a tool we should track?{" "}
          <a href="mailto:hello@kell.cx" className="text-blue-400 hover:text-blue-300">hello@kell.cx</a>
        </p>
      </div>

      <div className="mt-12 pt-6 border-t border-white/[0.08]">
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
