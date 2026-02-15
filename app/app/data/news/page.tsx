import Link from "next/link";
import { getLatestNews, getHNMentions, sources } from "@/lib/data";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Load insights
function loadInsights() {
  const path = join(process.cwd(), "..", "data", "insights.json");
  if (existsSync(path)) {
    try {
      const data = JSON.parse(readFileSync(path, "utf8"));
      return data.news || [];
    } catch {
      return [];
    }
  }
  return [];
}

const newsData = getLatestNews();
const hnData = getHNMentions();
const insights = loadInsights();

// Filter to last 48 hours
const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

const rawNewsData = newsData as any;
const allNews = [
  ...(rawNewsData.items || rawNewsData.recent || rawNewsData.older || []).map((item: any) => ({
    ...item,
    type: 'news',
  })),
  ...(hnData.stories || []).map((story: any) => ({
    title: story.title,
    url: story.url,
    source: 'Hacker News',
    date: story.createdAt,
    points: story.points,
    comments: story.comments,
    hnUrl: story.hnUrl,
    type: 'hn',
  })),
].filter(item => new Date(item.date || item.publishedAt) > cutoff48h)
 .sort((a, b) => new Date(b.date || b.publishedAt).getTime() - new Date(a.date || a.publishedAt).getTime());

const last24h = allNews.filter(item => new Date(item.date || item.publishedAt) > cutoff24h);
const last48h = allNews.filter(item => new Date(item.date || item.publishedAt) <= cutoff24h);

// Get top headlines (highest scored)
const topHeadlines = [...allNews]
  .sort((a, b) => (b.points || b.score || 0) - (a.points || a.score || 0))
  .slice(0, 5);

export const metadata = {
  title: "AI News Today — Kell",
  description: "Top AI coding tool news and discussions from the last 48 hours.",
};

export default function NewsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6">
        <Link href="/data" className="text-sm text-zinc-500 hover:text-zinc-400">
          ← Back to Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight mb-2">AI News Today</h1>
      <p className="text-zinc-400 mb-1">What's happening in AI coding tools</p>
      <p className="text-sm text-zinc-600 mb-6">
        {allNews.length} stories · Last 48 hours ·{" "}
        <a href={sources.hn} target="_blank" rel="noopener noreferrer" className="text-orange-400">
          HN
        </a>
        {" + RSS feeds"}
      </p>

      {/* Key Insights */}
      <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-5 mb-8">
        <h2 className="text-xs uppercase tracking-wide text-purple-400 mb-4">📰 Today's Headlines</h2>
        <ul className="space-y-2 text-sm text-zinc-300">
          {topHeadlines.slice(0, 3).map((item, i) => (
            <li key={i}>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-400">
                {truncate(item.title, 80)}
              </a>
              {item.points && <span className="text-zinc-500 ml-2">({item.points} pts)</span>}
            </li>
          ))}
          {insights.slice(0, 2).map((insight: string, i: number) => (
            <li key={`insight-${i}`} className="text-zinc-400">{insight}</li>
          ))}
        </ul>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard value={String(last24h.length)} label="Last 24h" />
        <StatCard value={String(last48h.length)} label="24-48h ago" />
        <StatCard 
          value={String(allNews.filter(n => n.type === 'hn').length)} 
          label="From HN" 
        />
        <StatCard 
          value={formatNumber(allNews.filter(n => n.type === 'hn').reduce((sum, n) => sum + (n.points || 0), 0))} 
          label="Total Points" 
        />
      </div>

      {/* Last 24 Hours */}
      {last24h.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-wide text-green-400 mb-4 pb-2 border-b border-white/[0.08]">
            🔥 Last 24 Hours
          </h2>
          <NewsList items={last24h} />
        </section>
      )}

      {/* 24-48h ago */}
      {last48h.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-4 pb-2 border-b border-white/[0.08]">
            Earlier (24-48h ago)
          </h2>
          <NewsList items={last48h.slice(0, 15)} />
        </section>
      )}

      {allNews.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <p>No recent news found. Check back soon!</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-white/[0.08] text-xs text-zinc-600">
        <p>
          News aggregated from Hacker News, company blogs, RSS feeds, and tech publications.
          Updated daily at 05:00 UTC.
        </p>
      </div>
    </div>
  );
}

function NewsList({ items }: { items: any[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-start justify-between p-4 bg-white/[0.02] rounded-lg border border-white/[0.04] hover:border-white/[0.08]"
        >
          <div className="flex-1 pr-4">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-white hover:text-blue-400 line-clamp-2"
            >
              {item.title}
            </a>
            <p className="text-xs text-zinc-500 mt-1">
              {item.source || 'Unknown'} · {formatRelativeTime(item.date || item.publishedAt)}
              {item.comments !== undefined && ` · ${item.comments} comments`}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            {item.points && (
              <>
                <span className="text-green-400 font-semibold">{item.points}</span>
                <span className="text-xs text-zinc-600 block">points</span>
              </>
            )}
            {item.hnUrl && (
              <a
                href={item.hnUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-400 hover:text-orange-300"
              >
                HN ↗
              </a>
            )}
          </div>
        </div>
      ))}
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

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + "..." : str;
}
