import Link from "next/link";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface HNStory {
  id: string;
  title: string;
  url?: string;
  author: string;
  points: number;
  comments: number;
  createdAt: string;
  hnUrl: string;
  matchedQuery?: string;
  isTopStory?: boolean;
}

interface HNData {
  generatedAt: string;
  source: string;
  timeRange: string;
  stories: HNStory[];
}

function getHNData(): HNData | null {
  try {
    const dataPath = join(process.cwd(), "..", "data", "hn-ai-mentions.json");
    if (!existsSync(dataPath)) {
      return null;
    }
    const raw = readFileSync(dataPath, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read HN data:", e);
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

function getQueryColor(query?: string): string {
  if (!query) return "text-zinc-500";
  const colors: Record<string, string> = {
    "Claude": "text-orange-400",
    "Cursor": "text-blue-400",
    "Copilot": "text-purple-400",
    "ChatGPT": "text-green-400",
    "GPT-5": "text-green-400",
    "AI agent": "text-amber-400",
    "AI coding": "text-cyan-400",
    "LLM": "text-pink-400",
    "Anthropic": "text-orange-400",
    "OpenAI": "text-green-400",
  };
  return colors[query] || "text-zinc-400";
}

export const metadata = {
  title: "Hacker News AI Mentions — Kell",
  description: "Real-time tracking of AI coding tool mentions on Hacker News. Points, comments, and discussion trends.",
};

export default function HackerNewsPage() {
  const data = getHNData();
  
  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-sm text-zinc-500 mb-4">
          <Link href="/data" className="hover:text-white">Data</Link> → Hacker News
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-4">Hacker News AI Mentions</h1>
        <p className="text-zinc-400">Data not available. Check back soon.</p>
      </div>
    );
  }

  const lastUpdate = new Date(data.generatedAt);
  const formattedUpdate = lastUpdate.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Filter to AI-related stories (with matchedQuery) and sort by points
  const aiStories = data.stories
    .filter(s => s.matchedQuery || s.title.toLowerCase().includes("ai") || 
                 s.title.toLowerCase().includes("claude") || 
                 s.title.toLowerCase().includes("gpt") ||
                 s.title.toLowerCase().includes("llm"))
    .sort((a, b) => b.points - a.points)
    .slice(0, 50);

  // Get unique queries for stats
  const queryCounts: Record<string, number> = {};
  aiStories.forEach(s => {
    if (s.matchedQuery) {
      queryCounts[s.matchedQuery] = (queryCounts[s.matchedQuery] || 0) + 1;
    }
  });
  
  const topQueries = Object.entries(queryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const totalPoints = aiStories.reduce((sum, s) => sum + s.points, 0);
  const totalComments = aiStories.reduce((sum, s) => sum + s.comments, 0);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="text-sm text-zinc-500 mb-4">
        <Link href="/data" className="hover:text-white">Data</Link> → Hacker News
      </div>
      
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Hacker News AI Mentions</h1>
      <p className="text-zinc-400 mb-1">Real-time tracking of AI coding discussions</p>
      <p className="text-xs text-zinc-600 mb-6">
        {aiStories.length} stories · {data.timeRange} · Updated: {formattedUpdate} UTC
      </p>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard value={aiStories.length.toString()} label="Stories" />
        <StatCard value={totalPoints.toLocaleString()} label="Total Points" />
        <StatCard value={totalComments.toLocaleString()} label="Total Comments" />
        <StatCard value={`${Math.round(totalPoints / aiStories.length)}`} label="Avg Points" />
      </div>

      {/* Topic Distribution */}
      {topQueries.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 pb-2 border-b border-white/[0.08]">
            <h2 className="text-xs uppercase tracking-wide text-zinc-500">Topic Distribution</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {topQueries.map(([query, count]) => (
              <span 
                key={query}
                className={`px-3 py-1 rounded-full text-sm bg-white/[0.05] border border-white/[0.08] ${getQueryColor(query)}`}
              >
                {query}: {count}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Top Stories */}
      <section className="mb-10">
        <div className="mb-4 pb-2 border-b border-white/[0.08]">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500">Top Stories by Points</h2>
        </div>
        <div className="space-y-3">
          {aiStories.slice(0, 20).map((story, idx) => (
            <div 
              key={story.id} 
              className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg hover:border-white/20 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="text-center min-w-[50px]">
                  <div className="text-lg font-semibold text-orange-400">{story.points}</div>
                  <div className="text-xs text-zinc-600">points</div>
                </div>
                <div className="flex-1 min-w-0">
                  <a 
                    href={story.url || story.hnUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-blue-400 font-medium block mb-1 line-clamp-2"
                  >
                    {story.title}
                  </a>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                    <span>by {story.author}</span>
                    <span>·</span>
                    <a 
                      href={story.hnUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-orange-400"
                    >
                      {story.comments} comments
                    </a>
                    <span>·</span>
                    <span>{formatTimeAgo(story.createdAt)}</span>
                    {story.matchedQuery && (
                      <>
                        <span>·</span>
                        <span className={getQueryColor(story.matchedQuery)}>{story.matchedQuery}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* All Stories Table */}
      {aiStories.length > 20 && (
        <section>
          <div className="mb-4 pb-2 border-b border-white/[0.08]">
            <h2 className="text-xs uppercase tracking-wide text-zinc-500">All Stories</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase">
                  <th className="pb-2 pr-4">Pts</th>
                  <th className="pb-2 pr-4">Title</th>
                  <th className="pb-2 pr-4">Comments</th>
                  <th className="pb-2">Topic</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {aiStories.slice(20).map((story) => (
                  <tr key={story.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-2 pr-4 text-orange-400 font-mono">{story.points}</td>
                    <td className="py-2 pr-4">
                      <a 
                        href={story.hnUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white line-clamp-1"
                      >
                        {story.title}
                      </a>
                    </td>
                    <td className="py-2 pr-4 text-zinc-500">{story.comments}</td>
                    <td className={`py-2 ${getQueryColor(story.matchedQuery)}`}>
                      {story.matchedQuery || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-xs text-zinc-600 mt-8">
        Source: <a href="https://hn.algolia.com/api" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">Hacker News (Algolia API)</a>
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
