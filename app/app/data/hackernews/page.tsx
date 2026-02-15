import Link from "next/link";
import { getHNMentions, sources } from "@/lib/data";
import { DataNav, PageHeader, DataBreadcrumb } from "@/components/data-nav";
import { SectionNav } from "@/components/section-nav";

const data = getHNMentions();

export const metadata = {
  title: "Hacker News Mentions — Kell",
  description: "AI coding tool discussions and mentions on Hacker News.",
};

// Key insights
function getKeyInsights() {
  const stories = data.stories;
  const totalPoints = stories.reduce((sum, s) => sum + s.points, 0);
  const totalComments = stories.reduce((sum, s) => sum + s.comments, 0);
  const topStory = [...stories].sort((a, b) => b.points - a.points)[0];
  const mostDiscussed = [...stories].sort((a, b) => b.comments - a.comments)[0];
  
  return {
    totalStories: stories.length,
    totalPoints,
    totalComments,
    topStory,
    mostDiscussed,
    avgPoints: Math.round(totalPoints / (stories.length || 1)),
  };
}

const insights = getKeyInsights();

// Group by points
const hotStories = data.stories.filter(s => s.points >= 100).sort((a, b) => b.points - a.points);
const warmStories = data.stories.filter(s => s.points >= 20 && s.points < 100).sort((a, b) => b.points - a.points);
const otherStories = data.stories.filter(s => s.points < 20).sort((a, b) => b.points - a.points);

export default function HNPage() {
  const lastUpdated = new Date(data.generatedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <DataNav />
      
      <DataBreadcrumb current="Hacker News" />
      <PageHeader 
        title="Hacker News Mentions"
        description="AI coding tool discussions on Hacker News (24h)"
        stats={`${insights.totalStories} stories · ${formatNumber(insights.totalPoints)} points · Updated ${lastUpdated}`}
      />

      <SectionNav sections={[
        ...(hotStories.length > 0 ? [{ id: "hot", label: "Hot", emoji: "🔥", count: hotStories.length, highlight: true }] : []),
        ...(warmStories.length > 0 ? [{ id: "trending", label: "Trending", emoji: "📈", count: warmStories.length }] : []),
        ...(otherStories.length > 0 ? [{ id: "recent", label: "Recent", count: otherStories.length }] : []),
      ]} />

      {/* Key Insights */}
      <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-5 mb-8">
        <h2 className="text-xs uppercase tracking-wide text-orange-400 mb-3">🔥 Key Insights</h2>
        <ul className="space-y-2 text-sm text-zinc-300">
          <li>
            <strong className="text-green-400">{formatNumber(insights.totalPoints)}</strong> total points across{" "}
            <strong className="text-white">{insights.totalStories}</strong> stories
          </li>
          {insights.topStory && (
            <li>
              Top story: <strong className="text-white">"{truncate(insights.topStory.title, 50)}"</strong> ({insights.topStory.points} pts)
            </li>
          )}
          <li>
            Average: <strong className="text-white">{insights.avgPoints}</strong> points per story
          </li>
        </ul>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard value={String(insights.totalStories)} label="Stories" />
        <StatCard value={formatNumber(insights.totalPoints)} label="Total Points" />
        <StatCard value={formatNumber(insights.totalComments)} label="Comments" />
        <StatCard value={String(hotStories.length)} label="Hot (100+)" />
      </div>

      {/* Hot Stories */}
      {hotStories.length > 0 && (
        <section id="hot" className="mb-8 scroll-mt-32">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            🔥 Hot Stories (100+ points)
          </h2>
          <StoryList stories={hotStories} />
        </section>
      )}

      {/* Trending */}
      {warmStories.length > 0 && (
        <section id="trending" className="mb-8 scroll-mt-32">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            📈 Trending (20-99 points)
          </h2>
          <StoryList stories={warmStories.slice(0, 15)} />
        </section>
      )}

      {/* Recent */}
      {otherStories.length > 0 && (
        <section id="recent" className="mb-8 scroll-mt-32">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            Recent Mentions
          </h2>
          <StoryList stories={otherStories.slice(0, 15)} />
        </section>
      )}

      {/* Footer */}
      <div className="pt-6 border-t border-white/[0.08] text-xs text-zinc-600">
        <p>
          Data collected via{" "}
          <a href="https://hn.algolia.com/api" className="text-zinc-500 hover:text-zinc-400">HN Algolia API</a>.
          Updated daily at 05:00 UTC. Tracks mentions of AI coding tools, models, and related topics.
        </p>
      </div>
    </div>
  );
}

function StoryList({ stories }: { stories: typeof data.stories }) {
  return (
    <div className="space-y-2">
      {stories.map((story) => (
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
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + "..." : str;
}
