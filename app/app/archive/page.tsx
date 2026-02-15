import Link from "next/link";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

interface Briefing {
  date: string;
  title: string;
  slug: string;
  preview: string;
}

function getBriefings(): Briefing[] {
  const briefingsDir = join(process.cwd(), "..", "briefing", "digests");
  const emailsDir = join(process.cwd(), "..", "briefing", "emails");
  
  const briefings: Briefing[] = [];
  
  // Check digests directory for markdown files
  if (existsSync(briefingsDir)) {
    const files = readdirSync(briefingsDir)
      .filter(f => f.startsWith("briefing-") && f.endsWith(".md"))
      .sort()
      .reverse();
    
    for (const file of files) {
      const dateMatch = file.match(/briefing-(\d{4}-\d{2}-\d{2})\.md/);
      if (dateMatch) {
        const dateStr = dateMatch[1];
        const content = readFileSync(join(briefingsDir, file), "utf8");
        
        // Extract title and preview from markdown
        const lines = content.split("\n");
        const title = lines[0]?.replace(/^#\s*/, "") || "Daily Briefing";
        const dateLine = lines[1] || "";
        
        // Find key takeaways for preview
        const takeawaysStart = content.indexOf("## ⚡ Key Takeaways");
        let preview = "";
        if (takeawaysStart !== -1) {
          const takeawaysSection = content.slice(takeawaysStart, takeawaysStart + 500);
          const takeaways = takeawaysSection
            .split("\n")
            .filter(l => l.startsWith("🔥") || l.startsWith("🚀") || l.startsWith("💰") || l.startsWith("📈"))
            .slice(0, 3)
            .map(l => l.replace(/\*\*/g, "").trim())
            .join(" • ");
          preview = takeaways || "Daily competitive intelligence briefing";
        }
        
        briefings.push({
          date: dateStr,
          title: `${title} — ${dateLine}`,
          slug: dateStr,
          preview,
        });
      }
    }
  }
  
  return briefings;
}

const briefings = getBriefings();

export const metadata = {
  title: "Briefing Archive — Kell",
  description: "Browse historical daily briefings on AI coding tools.",
};

export default function ArchivePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Briefing Archive</h1>
      <p className="text-zinc-400 mb-2">Historical daily briefings on AI coding tools</p>
      <p className="text-sm text-zinc-600 mb-8">
        {briefings.length} briefings · Delivered daily at 06:00 UTC
      </p>

      {/* What You Get */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-5 mb-8">
        <h2 className="text-xs uppercase tracking-wide text-blue-400 mb-3">📬 What's in each briefing</h2>
        <ul className="space-y-1.5 text-sm text-zinc-300">
          <li>• Key signals: pricing changes, new releases, hiring trends</li>
          <li>• Momentum rankings: who's growing fastest</li>
          <li>• Hacker News mentions and community buzz</li>
          <li>• Competitor activity across 15+ tools</li>
        </ul>
      </div>

      {/* Briefing List */}
      <div className="space-y-3">
        {briefings.length > 0 ? briefings.map((briefing) => (
          <Link
            key={briefing.slug}
            href={`/archive/${briefing.slug}`}
            className="block p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg hover:border-white/20 hover:bg-white/[0.04] transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white mb-1">
                  {formatDate(briefing.date)}
                </div>
                <p className="text-sm text-zinc-500 line-clamp-2">
                  {briefing.preview || "Daily competitive intelligence briefing"}
                </p>
              </div>
              <span className="text-xs text-zinc-600 whitespace-nowrap">
                {getDayOfWeek(briefing.date)}
              </span>
            </div>
          </Link>
        )) : (
          <div className="text-center py-12 text-zinc-500">
            <p>No briefings archived yet.</p>
            <p className="text-sm mt-2">Subscribe to start receiving daily briefings!</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="mt-10 pt-6 border-t border-white/[0.08] text-center">
        <p className="text-zinc-400 mb-4">
          Get these briefings delivered to your inbox every morning.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-colors"
        >
          Subscribe for Free
        </Link>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00Z");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00Z");
  return date.toLocaleDateString("en-US", { weekday: "short" });
}
