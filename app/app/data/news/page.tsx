import Link from "next/link";
import { getLatestNews, getHNMentions, sources } from "@/lib/data";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { DataNav, PageHeader, DataBreadcrumb } from "@/components/data-nav";

// Load insights
function loadInsights() {
  const path = join(process.cwd(), "..", "data", "insights.json");
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf8"));
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

const allNews = [
  ...(newsData.items || newsData.recent || newsData.older || []).map((item: any) => ({
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

export const metadata = {
  title: "AI News Today — Kell",
  description: "Top AI coding tool news and discussions from the last 48 hours.",
};

export default function NewsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <DataNav />
      
      <DataBreadcrumb current="News" />
      <PageHeader 
        title="AI News Today"
        description="What's happening in AI coding tools"
        stats={`${allNews.length} stories · Last 48 hours`}
      />

      {/* Jump Links */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0">
        {last24h.length > 0 && (
          <a href="#recent" className="px-3 py-1.5 text-xs font-medium rounded-full bg-green-500/10 text-green-400 border border-green-500/20 whitespace-nowrap">
            🔥 Last 24h ({last24h.length})
          </a>
        )}
        {last48h.length > 0 && (
          <a href="#earlier" className="px-3 py-1.5 text-xs font-medium rounded-full bg-white/[0.03] text-zinc-500 hover:bg-white/[0.06] hover:text-white border border-white/[0.06] whitespace-nowrap">
            Earlier ({last48h.length})
          </a>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
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
        <section id="recent" className="mb-10 scroll-mt-20">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            🔥 Last 24 Hours
          </h2>
          <NewsList items={last24h} />
        </section>
      )}

      {/* 24-48h ago */}
      {last48h.length > 0 && (
        <section id="earlier" className="mb-10 scroll-mt-20">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
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
      <div className="pt-6 border-t border-white/[0.08] text-xs text-zinc-600">
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
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-start justify-between p-3 md:p-4 bg-white/[0.02] rounded-lg border border-white/[0.04] hover:border-white/10 transition-colors"
        >
          <div className="flex-1 pr-3 min-w-0">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-white hover:text-blue-400 line-clamp-2 text-sm md:text-base"
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
              <span className="text-green-400 font-semibold">{item.points}</span>
            )}
            {item.hnUrl && (
              <a
                href={item.hnUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-400 hover:text-orange-300 block mt-0.5"
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
    <div className="p-3 md:p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
      <div className="text-xl md:text-2xl font-semibold text-white">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}

function formatNumber(n: number): string {
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
