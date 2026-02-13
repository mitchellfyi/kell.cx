import Link from "next/link";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface ArxivPaper {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  updated: string;
  categories: string[];
  pdf_url: string;
  abs_url: string;
  relevance_score: number;
  matched_keywords: string[];
  paper_category?: string;
}

interface ArxivData {
  scraped_at: string;
  categories_searched: string[];
  stats: {
    total_fetched: number;
    relevant_count: number;
    recent_count: number;
    by_category: Record<string, number>;
  };
  relevant_papers: ArxivPaper[];
  recent_papers: ArxivPaper[];
}

function getArxivData(): ArxivData | null {
  try {
    const dataPath = join(process.cwd(), "..", "data", "arxiv-ai.json");
    if (!existsSync(dataPath)) {
      return null;
    }
    const raw = readFileSync(dataPath, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read ArXiv data:", e);
    return null;
  }
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHrs < 1) return "< 1h ago";
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

function getCategoryColor(category?: string): string {
  const colors: Record<string, string> = {
    "agents": "text-amber-400 bg-amber-400/10 border-amber-400/20",
    "code-generation": "text-blue-400 bg-blue-400/10 border-blue-400/20",
    "benchmarks": "text-green-400 bg-green-400/10 border-green-400/20",
    "safety": "text-red-400 bg-red-400/10 border-red-400/20",
    "reasoning": "text-purple-400 bg-purple-400/10 border-purple-400/20",
    "multimodal": "text-pink-400 bg-pink-400/10 border-pink-400/20",
    "training": "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  };
  return colors[category || ""] || "text-zinc-400 bg-zinc-400/10 border-zinc-400/20";
}

function getCategoryLabel(category?: string): string {
  const labels: Record<string, string> = {
    "agents": "🤖 Agents",
    "code-generation": "💻 Code Gen",
    "benchmarks": "📊 Benchmarks",
    "safety": "🛡️ Safety",
    "reasoning": "🧠 Reasoning",
    "multimodal": "🎨 Multimodal",
    "training": "⚡ Training",
  };
  return labels[category || ""] || category || "Other";
}

function truncateSummary(summary: string, maxLength: number = 200): string {
  if (summary.length <= maxLength) return summary;
  return summary.slice(0, maxLength).trim() + "...";
}

export const metadata = {
  title: "ArXiv AI Papers — Kell",
  description: "Latest AI research papers from ArXiv. Agents, code generation, benchmarks, and more.",
};

export default function ArxivPage() {
  const data = getArxivData();
  
  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-sm text-zinc-500 mb-4">
          <Link href="/data" className="hover:text-white">Data</Link> → ArXiv Papers
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-4">ArXiv AI Papers</h1>
        <p className="text-zinc-400">Data not available. Check back soon.</p>
      </div>
    );
  }

  const lastUpdate = new Date(data.scraped_at);
  const formattedUpdate = lastUpdate.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Combine and deduplicate papers
  const allPapers = [...data.relevant_papers];
  const seenIds = new Set(allPapers.map(p => p.id));
  data.recent_papers?.forEach(p => {
    if (!seenIds.has(p.id)) {
      allPapers.push(p);
      seenIds.add(p.id);
    }
  });

  // Sort by relevance score then date
  const sortedPapers = allPapers.sort((a, b) => {
    if (b.relevance_score !== a.relevance_score) {
      return b.relevance_score - a.relevance_score;
    }
    return new Date(b.published).getTime() - new Date(a.published).getTime();
  });

  // Category stats
  const categoryEntries = Object.entries(data.stats.by_category || {})
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="text-sm text-zinc-500 mb-4">
        <Link href="/data" className="hover:text-white">Data</Link> → ArXiv Papers
      </div>
      
      <h1 className="text-2xl font-semibold tracking-tight mb-2">ArXiv AI Papers</h1>
      <p className="text-zinc-400 mb-1">Latest research in AI agents, code generation, and LLMs</p>
      <p className="text-xs text-zinc-600 mb-6">
        {sortedPapers.length} papers · Categories: {data.categories_searched.join(", ")} · Updated: {formattedUpdate} UTC
      </p>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard value={data.stats.total_fetched.toString()} label="Papers Scanned" />
        <StatCard value={data.stats.relevant_count.toString()} label="AI-Relevant" />
        <StatCard value={data.stats.recent_count.toString()} label="Last 48h" />
        <StatCard value={categoryEntries.length.toString()} label="Categories" />
      </div>

      {/* Category Distribution */}
      {categoryEntries.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 pb-2 border-b border-white/[0.08]">
            <h2 className="text-xs uppercase tracking-wide text-zinc-500">Research Topics</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {categoryEntries.map(([category, count]) => (
              <span 
                key={category}
                className={`px-3 py-1 rounded-full text-sm border ${getCategoryColor(category)}`}
              >
                {getCategoryLabel(category)}: {count}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Featured Papers (High Relevance) */}
      <section className="mb-10">
        <div className="mb-4 pb-2 border-b border-white/[0.08]">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500">Top Relevant Papers</h2>
        </div>
        <div className="space-y-4">
          {sortedPapers.slice(0, 15).map((paper) => (
            <div 
              key={paper.id} 
              className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg hover:border-white/20 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="text-center min-w-[50px] hidden sm:block">
                  <div className="text-lg font-semibold text-green-400">{paper.relevance_score}</div>
                  <div className="text-xs text-zinc-600">score</div>
                </div>
                <div className="flex-1 min-w-0">
                  <a 
                    href={paper.abs_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-blue-400 font-medium block mb-2 leading-snug"
                  >
                    {paper.title}
                  </a>
                  <p className="text-sm text-zinc-400 mb-3 leading-relaxed">
                    {truncateSummary(paper.summary, 250)}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-zinc-500">
                    <span className="line-clamp-1">
                      {paper.authors.slice(0, 3).join(", ")}
                      {paper.authors.length > 3 && ` +${paper.authors.length - 3}`}
                    </span>
                    <span>·</span>
                    <span>{formatTimeAgo(paper.published)}</span>
                    {paper.paper_category && (
                      <>
                        <span>·</span>
                        <span className={`px-2 py-0.5 rounded text-xs border ${getCategoryColor(paper.paper_category)}`}>
                          {getCategoryLabel(paper.paper_category)}
                        </span>
                      </>
                    )}
                    <span>·</span>
                    <a 
                      href={paper.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      PDF ↗
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* All Papers Table */}
      {sortedPapers.length > 15 && (
        <section>
          <div className="mb-4 pb-2 border-b border-white/[0.08]">
            <h2 className="text-xs uppercase tracking-wide text-zinc-500">All Papers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase">
                  <th className="pb-2 pr-4">Score</th>
                  <th className="pb-2 pr-4">Title</th>
                  <th className="pb-2 pr-4 hidden md:table-cell">Category</th>
                  <th className="pb-2">Published</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {sortedPapers.slice(15).map((paper) => (
                  <tr key={paper.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-2 pr-4 text-green-400 font-mono">{paper.relevance_score}</td>
                    <td className="py-2 pr-4">
                      <a 
                        href={paper.abs_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white line-clamp-1"
                      >
                        {paper.title}
                      </a>
                    </td>
                    <td className="py-2 pr-4 hidden md:table-cell">
                      {paper.paper_category && (
                        <span className={`px-2 py-0.5 rounded text-xs border ${getCategoryColor(paper.paper_category)}`}>
                          {getCategoryLabel(paper.paper_category)}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-zinc-500 whitespace-nowrap">{formatTimeAgo(paper.published)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-xs text-zinc-600 mt-8">
        Source: <a href="https://arxiv.org" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">ArXiv</a> · 
        Categories: cs.AI, cs.CL, cs.LG
      </p>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}
