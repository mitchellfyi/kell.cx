import Link from "next/link";
import { getHNMentions } from "@/lib/data";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { DataNav, PageHeader, DataBreadcrumb } from "@/components/data-nav";
import { SectionNav } from "@/components/section-nav";

// Source-specific item types
interface RawItem {
  title?: string;
  name?: string;
  url?: string;
  link?: string;
  source?: string;
  date?: string;
  pubDate?: string;
  published_at?: string;
  featured_at?: string;
  createdAt?: string;
  description?: string;
  tagline?: string;
  author?: string;
  points?: number;
  comments?: number;
  hnUrl?: string;
  user?: { name?: string };
}

// News source data structure
interface NewsSource {
  items?: RawItem[];
  posts?: RawItem[];
  articles?: RawItem[];
  products?: RawItem[];
  recent?: RawItem[];
  older?: RawItem[];
}

// Load all news sources
function loadJsonFile(filename: string): NewsSource {
  const path = join(process.cwd(), "..", "data", filename);
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      return {};
    }
  }
  return {};
}

const hnData = getHNMentions();
const aiRssNews = loadJsonFile("ai-rss-news.json");
const techCrunch = loadJsonFile("techcrunch-ai.json");
const devTo = loadJsonFile("devto-ai.json");
const googleAI = loadJsonFile("google-ai-blog.json");
const anthropicNews = loadJsonFile("anthropic-news.json");
const deepmindNews = loadJsonFile("deepmind-news.json");
const producthunt = loadJsonFile("producthunt-ai.json");
const latestNews = loadJsonFile("latest-news.json");

// Combine all sources into unified format
interface NewsItem {
  title: string;
  url: string;
  source: string;
  date: string;
  description?: string;
  points?: number;
  comments?: number;
  hnUrl?: string;
  author?: string;
}

// Helper to map raw items to NewsItem
function mapToNewsItem(items: RawItem[], source: string): NewsItem[] {
  return (items || []).map((item) => ({
    title: item.title || item.name || "",
    url: item.url || item.link || "",
    source: item.source || source,
    date: item.date || item.pubDate || item.published_at || item.createdAt || item.featured_at || "",
    description: item.description || item.tagline,
    points: item.points,
    comments: item.comments,
    hnUrl: item.hnUrl,
    author: item.user?.name || item.author,
  }));
}

const allNews: NewsItem[] = [
  ...mapToNewsItem(hnData.stories || [], "Hacker News"),
  ...mapToNewsItem(techCrunch.articles || [], "TechCrunch"),
  ...mapToNewsItem(aiRssNews.items || [], "RSS"),
  ...mapToNewsItem(devTo.items || devTo.posts || [], "Dev.to"),
  ...mapToNewsItem(googleAI.items || googleAI.posts || [], "Google AI"),
  ...mapToNewsItem(anthropicNews.items || anthropicNews.posts || [], "Anthropic"),
  ...mapToNewsItem(deepmindNews.items || deepmindNews.posts || [], "DeepMind"),
  ...mapToNewsItem(producthunt.items || producthunt.products || [], "Product Hunt"),
  ...mapToNewsItem(latestNews.recent || [], "News"),
  ...mapToNewsItem(latestNews.older || [], "News"),
].filter(item => item.title && item.url)
 .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

// Deduplicate by URL
const seen = new Set<string>();
const uniqueNews = allNews.filter(item => {
  if (seen.has(item.url)) return false;
  seen.add(item.url);
  return true;
});

// Group by time
const now = new Date();
const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

const today = uniqueNews.filter(item => new Date(item.date) > cutoff24h);
const thisWeek = uniqueNews.filter(item => {
  const d = new Date(item.date);
  return d <= cutoff24h && d > cutoff7d;
});
const older = uniqueNews.filter(item => new Date(item.date) <= cutoff7d).slice(0, 30);

// Group by source
const hnStories = uniqueNews.filter(i => i.source === "Hacker News");
const techNews = uniqueNews.filter(i => ["TechCrunch", "MIT Tech Review AI", "The Verge"].includes(i.source));
const companyNews = uniqueNews.filter(i => ["Google AI", "Anthropic", "DeepMind", "OpenAI"].includes(i.source));

// Count sources
const sourceCounts: Record<string, number> = {};
uniqueNews.forEach(item => {
  sourceCounts[item.source] = (sourceCounts[item.source] || 0) + 1;
});
const topSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

export const metadata = {
  title: "AI News — Kell",
  description: "Latest AI coding tool news from HN, TechCrunch, company blogs, and more.",
};

export default function NewsPage() {
  const totalHNPoints = hnStories.reduce((sum, s) => sum + (s.points || 0), 0);
  
  // Build sections for nav
  const sections = [
    ...(today.length > 0 ? [{ id: "today", label: "Today", count: today.length, highlight: true }] : []),
    ...(thisWeek.length > 0 ? [{ id: "week", label: "This Week", count: thisWeek.length }] : []),
    ...(hnStories.length > 0 ? [{ id: "hn", label: "Hacker News", count: hnStories.length }] : []),
    ...(techNews.length > 0 ? [{ id: "tech", label: "Tech News", count: techNews.length }] : []),
    ...(companyNews.length > 0 ? [{ id: "company", label: "Company Blogs", count: companyNews.length }] : []),
    ...(older.length > 0 ? [{ id: "older", label: "Older", count: older.length }] : []),
  ];
  
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <DataNav />
      
      <DataBreadcrumb current="News" />
      <PageHeader 
        title="AI News"
        description="Aggregated from HN, TechCrunch, company blogs, and RSS feeds"
        stats={`${uniqueNews.length} stories · ${topSources.length} sources · Updated daily`}
      />

      <SectionNav sections={sections} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard value={String(uniqueNews.length)} label="Total Stories" />
        <StatCard value={String(hnStories.length)} label="From HN" />
        <StatCard value={formatNumber(totalHNPoints)} label="HN Points" />
        <StatCard value={String(topSources.length)} label="Sources" />
      </div>

      {/* Sources */}
      <div className="mb-8 p-4 bg-white/[0.02] rounded-lg border border-white/[0.06]">
        <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-3">Sources</h3>
        <div className="flex flex-wrap gap-2">
          {topSources.map(([source, count]) => (
            <span key={source} className="px-2 py-1 text-xs bg-white/[0.03] text-zinc-400 rounded border border-white/[0.06]">
              {source} ({count})
            </span>
          ))}
        </div>
      </div>

      {/* Today */}
      {today.length > 0 && (
        <section id="today" className="mb-10 scroll-mt-32">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            Today ({today.length})
          </h2>
          <NewsList items={today} />
        </section>
      )}

      {/* This Week */}
      {thisWeek.length > 0 && (
        <section id="week" className="mb-10 scroll-mt-32">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            This Week ({thisWeek.length})
          </h2>
          <NewsList items={thisWeek.slice(0, 25)} />
          {thisWeek.length > 25 && (
            <p className="text-xs text-zinc-500 mt-3">Showing 25 of {thisWeek.length} stories</p>
          )}
        </section>
      )}

      {/* HN Highlights */}
      {hnStories.length > 0 && (
        <section id="hn" className="mb-10 scroll-mt-32">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.08]">
            <h2 className="text-base font-semibold text-white">Hacker News ({hnStories.length})</h2>
            <Link href="/data/hackernews" className="text-xs text-zinc-500 hover:text-zinc-400">
              View all →
            </Link>
          </div>
          <NewsList items={hnStories.slice(0, 15)} />
        </section>
      )}

      {/* Tech News */}
      {techNews.length > 0 && (
        <section id="tech" className="mb-10 scroll-mt-32">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            Tech News ({techNews.length})
          </h2>
          <NewsList items={techNews.slice(0, 15)} />
        </section>
      )}

      {/* Company Blogs */}
      {companyNews.length > 0 && (
        <section id="company" className="mb-10 scroll-mt-32">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            Company Blogs ({companyNews.length})
          </h2>
          <NewsList items={companyNews.slice(0, 15)} />
        </section>
      )}

      {/* Older */}
      {older.length > 0 && (
        <section id="older" className="mb-10 scroll-mt-32">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            Older ({older.length})
          </h2>
          <NewsList items={older} />
        </section>
      )}

      {uniqueNews.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <p>No news found. Check back soon!</p>
        </div>
      )}

      {/* Footer */}
      <div className="pt-6 border-t border-white/[0.08] text-xs text-zinc-600">
        <p>
          News aggregated from: Hacker News, TechCrunch, Google AI Blog, Anthropic, DeepMind, 
          Hugging Face, Simon Willison, MIT Tech Review, Dev.to, Product Hunt, and more.
        </p>
        <p className="mt-2">Updated daily at 05:00 UTC.</p>
      </div>
    </div>
  );
}

function NewsList({ items }: { items: NewsItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={`${item.url}-${i}`}
          className="flex items-start justify-between p-3 bg-white/[0.02] rounded-lg border border-white/[0.04] hover:border-white/10 transition-colors"
        >
          <div className="flex-1 pr-3 min-w-0">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-white hover:text-blue-400 line-clamp-2 text-sm"
            >
              {item.title}
            </a>
            <p className="text-xs text-zinc-500 mt-1">
              <span className="text-zinc-400">{item.source}</span>
              {item.author && ` · ${item.author}`}
              {" · "}{formatRelativeTime(item.date)}
              {item.comments !== undefined && ` · ${item.comments} comments`}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            {item.points && (
              <span className="text-green-400 font-semibold text-sm">{item.points}</span>
            )}
            {item.hnUrl && (
              <a
                href={item.hnUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-400 hover:text-orange-300 block"
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
    <div className="p-3 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
      <div className="text-xl font-semibold text-white">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  
  const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
