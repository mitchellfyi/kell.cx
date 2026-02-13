import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export const metadata = {
  title: "Pricing — Kell",
  description: "Kell pricing: daily competitive intelligence briefings for AI coding tools.",
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight mb-2 text-center">Pricing</h1>
      <p className="text-zinc-400 mb-10 text-center">Simple pricing for competitive intelligence</p>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {/* Free Tier */}
        <div className="p-6 bg-white/[0.02] border border-white/[0.08] rounded-xl">
          <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Free</div>
          <div className="text-3xl font-bold text-white mb-4">$0<span className="text-lg font-normal text-zinc-500">/mo</span></div>
          <ul className="space-y-3 text-sm text-zinc-400 mb-6">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Access to all <Link href="/data" className="text-blue-400 hover:text-blue-300">/data</Link> pages</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Weekly email digest</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Blog posts and analysis</span>
            </li>
          </ul>
          <Link 
            href="/"
            className="block w-full text-center py-2 px-4 border border-white/[0.15] rounded-lg text-sm text-zinc-300 hover:bg-white/[0.05] transition-colors"
          >
            Join Waitlist
          </Link>
        </div>

        {/* Pro Tier */}
        <div className="p-6 bg-blue-500/5 border border-blue-500/20 rounded-xl relative">
          <div className="absolute -top-3 left-4 bg-blue-500 text-white text-xs px-2 py-1 rounded">Coming Soon</div>
          <div className="text-xs uppercase tracking-wide text-blue-400 mb-2">Pro</div>
          <div className="text-3xl font-bold text-white mb-4">$29<span className="text-lg font-normal text-zinc-500">/mo</span></div>
          <ul className="space-y-3 text-sm text-zinc-400 mb-6">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Everything in Free</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong className="text-white">Daily briefings</strong> at 6am UTC</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Custom competitor watchlist</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Pricing change alerts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Slack/Discord integration</span>
            </li>
          </ul>
          <button 
            disabled
            className="block w-full text-center py-2 px-4 bg-blue-600/50 rounded-lg text-sm text-zinc-400 cursor-not-allowed"
          >
            Coming Soon
          </button>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-6 text-center">
        <h3 className="text-lg font-medium text-white mb-2">Looking for AI coding tool pricing?</h3>
        <p className="text-zinc-400 text-sm mb-4">
          We maintain a comprehensive comparison of 40+ tools
        </p>
        <Link 
          href="/data/pricing"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          View AI Coding Tool Pricing →
        </Link>
      </div>

      <div className="mt-10 text-center">
        <WaitlistForm />
      </div>
    </div>
  );
}
