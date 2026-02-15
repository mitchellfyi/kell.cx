import Link from "next/link";
import { getLatestNews, getHNMentions, sources } from "@/lib/data";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { DataNav, PageHeader, DataBreadcrumb } from "@/components/data-nav";

// Load latest news data directly
function loadLatestNews() {
  const path = join(process.cwd(), "..", "data", "latest-news.json");
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      return { recent: [], older: [] };
    }
  }
  return { recent: [], older: [] };
}

const newsData = loadLatestNews();
const hnData = getHNMentions();

// Combine all news sources
const allNews = [
  ...(newsData.recent || []).map((item: any) => ({
    ...item,
    type: 'news',
  })),
  ...(newsData.older || []).map((item: any) => ({
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
].sort((a, b) => new Date(b.date || b.publishedAt).getTime() - new Date(a.date || a.publishedAt).getTime());

// Group by recency
const now = new Date();
const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

const last24h = allNews.filter(item => new Date(item.date || item.publishedAt) > cutoff24h);
const lastWeek = allNews.filter(item => {
  const d = new Date(item.date || item.publishedAt);
  return d <= cutoff24h && d > cutoff7d;
});
const older = allNews.filter(item => new Date(item.date || item.publishedAt) <= cutoff7d).slice(0, 20);

export const metadata = {
  title: "AI News — Kell",
  description: "Latest AI coding tool news and discussions.",
};

export default function NewsPage() {
  const totalHNPoints = hnData.stories.reduce((sum, s) => sum + s.points, 0);
  
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <DataNav />
      
      <DataBreadcrumb current="News" />
      <PageHeader 
        title="AI News"
        description="Latest news and discussions on AI coding tools"
        stats={`${allNews.length} stories from HN, blogs, and RSS feeds`}
      />

      {/* Sticky Section Nav */}
      <div className="sticky top-[57px] z-20 bg-zinc-950/95 backdrop-blur-sm -mx-6 px-6 py-3 mb-6 border-b border-white/[0.06]">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {last24h.length > 0 && (
            <a href="#recent" className="px-3 py-1.5 text-xs font-medium rounded-full bg-green-500/10 text-green-400 border border-green-500/20 whitespace-nowrap">
              🔥 Today ({last24h.length})
            </a>
          )}
          {lastWeek.length > 0 && (
            <a href="#week" className="px-3 py-1.5 text-xs font-medium rounded-full bg-white/[0.03] text-zinc-500 hover:bg-white/[0.06] hover:text-white border border-white/[0.06] whitespace-nowrap">
              This Week ({lastWeek.length})
            </a>
          )}
          {older.length > 0 && (
            <a href="#older" className="px-3 py-1.5 text-xs font-medium rounded-full bg-white/[0.03] text-zinc-500 hover:bg-white/[0.06] hover:text-white border border-white/[0.06] whitespace-nowrap">
              Older ({older.length})
            </a>
          )}
          <a href="#hn" className="px-3 py-1.5 text-xs font-medium rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 whitespace-nowrap">
            🔥 HN ({hnData.stories.length})
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard value={String(allNews.length)} label="Total Stories" />
        <StatCard value={String(hnData.stories.length)} label="From HN" />
        <StatCard value={formatNumber(totalHNPoints)} label="HN Points" />
        <StatCard value={String(newsData.stats?.total_sources || 8)} label="Sources" />
      </div>

      {/* Last 24 Hours */}
      {last24h.length > 0 && (
        <section id="recent" className="mb-10 scroll-mt-32">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            🔥 Last 24 Hours
          </h2>
          <NewsList items={last24h} />
        </section>
      )}

      {/* This Week */}
      {lastWeek.length > 0 && (
        <section id="week" className="mb-10 scroll-mt-32">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            This Week
          </h2>
          <NewsList items={lastWeek.slice(0, 20)} />
        </section>
      )}

      {/* Older */}
      {older.length > 0 && (
        <section id="older" className="mb-10 scroll-mt-32">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            Older
          </h2>
          <NewsList items={older} />
        </section>
      )}

      {/* HN Highlights */}
      {hnData.stories.length > 0 && (
        <section id="hn" className="mb-10 scroll-mt-32">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.08]">
            <h2 className="text-base font-semibold text-white">🔥 Hacker News Highlights</h2>
            <Link href="/data/hackernews" className="text-xs text-zinc-500 hover:text-zinc-400">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {hnData.stories.slice(0, 10).map((story) => (
              <div
                key={story.id}
                className="flex items-start justify-between p-3 md:p-4 bg-white/[0.02] rounded-lg border border-white/[0.04] hover:border-white/10 transition-colors"
              >
                <div className="flex-1 pr-3 min-w-0">
                  <a
                    href={story.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-white hover:text-blue-400 line-clamp-2 text-sm md:text-base"
                  >
                    {story.title}
                  </a>
                  <p className="text-xs text-zinc-500 mt-1">
                    by {story.author} · {story.comments} comments
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-green-400 font-semibold">{story.points}</span>
                  <a
                    href={story.hnUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-orange-400 hover:text-orange-300 block mt-0.5"
                  >
                    HN ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {allNews.length === 0 && hnData.stories.length === 0 && (
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
  if (!dateStr) return "Unknown";
  const now = new Date();
  const date = new Date(dateStr);
  const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
