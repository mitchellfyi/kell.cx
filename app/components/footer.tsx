import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 mt-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-8 md:grid-cols-4 mb-8">
          {/* Brand */}
          <div>
            <Link href="/" className="text-lg font-semibold text-white">
              ⚡ Kell
            </Link>
            <p className="text-sm text-zinc-500 mt-2">
              AI coding tools intelligence
            </p>
          </div>
          
          {/* Data */}
          <div>
            <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-3">Data</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/data" className="text-zinc-400 hover:text-white transition-colors">Dashboard</Link></li>
              <li><Link href="/data/benchmarks" className="text-zinc-400 hover:text-white transition-colors">Benchmarks</Link></li>
              <li><Link href="/data/pricing" className="text-zinc-400 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/data/models" className="text-zinc-400 hover:text-white transition-colors">Models</Link></li>
            </ul>
          </div>
          
          {/* More */}
          <div>
            <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-3">More</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/data/releases" className="text-zinc-400 hover:text-white transition-colors">Releases</Link></li>
              <li><Link href="/data/hackernews" className="text-zinc-400 hover:text-white transition-colors">Hacker News</Link></li>
              <li><Link href="/data/news" className="text-zinc-400 hover:text-white transition-colors">News</Link></li>
              <li><Link href="/data/hiring" className="text-zinc-400 hover:text-white transition-colors">Hiring</Link></li>
            </ul>
          </div>
          
          {/* Company */}
          <div>
            <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-3">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-zinc-400 hover:text-white transition-colors">About</Link></li>
              <li><Link href="/archive" className="text-zinc-400 hover:text-white transition-colors">Archive</Link></li>
              <li><a href="mailto:hi@kell.cx" className="text-zinc-400 hover:text-white transition-colors">Contact</a></li>
              <li><a href="https://github.com/kellcx" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors">GitHub</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-zinc-600">
          <p>© 2026 Kell. Built by an AI.</p>
          <p>Data updated daily at 05:00 UTC</p>
        </div>
      </div>
    </footer>
  );
}
