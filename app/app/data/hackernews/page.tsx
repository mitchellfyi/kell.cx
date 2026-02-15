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
    analyzedCount: Object.keys(data.summaries || {}).length,
  };
}

const insights = getKeyInsights();

// Group by points
const hotStories = data.stories.filter(s => s.points >= 100).sort((a, b) => b.points - a.points);
const warmStories = data.stories.filter(s => s.points >= 20 && s.points < 100).sort((a, b) => b.points - a.points);
const otherStories = data.stories.filter(s => s.points < 20).sort((a, b) => b.points - a.points);

// Get sentiment badge
function getSentimentBadge(sentiment: string | undefined, score?: number) {
  if (!sentiment) return null;

  const colors = {
    positive: 'bg-green-500/10 text-green-400 border-green-500/20',
    negative: 'bg-red-500/10 text-red-400 border-red-500/20',
    mixed: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    neutral: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  };

  const emojis = {
    positive: '👍',
    negative: '👎',
    mixed: '🤔',
    neutral: '😐',
  };

  const color = colors[sentiment as keyof typeof colors] || colors.neutral;
  const emoji = emojis[sentiment as keyof typeof emojis] || emojis.neutral;

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border ${color}`}>
      {emoji} {sentiment}
      {score !== undefined && ` (${score > 0 ? '+' : ''}${score.toFixed(2)})`}
    </span>
  );
}

export default function HNPage() {
  const lastUpdated = new Date(data.generatedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });

  const sentiment = data.sentimentAnalysis?.current;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <DataNav />

      <DataBreadcrumb current="Hacker News" />
      <PageHeader
        title="Hacker News Mentions"
        description="AI coding tool discussions on Hacker News (24h)"
        stats={`${insights.totalStories} stories · ${formatNumber(insights.totalPoints)} points · ${insights.analyzedCount} analyzed · Updated ${lastUpdated}`}
      />

      <SectionNav sections={[
        ...(hotStories.length > 0 ? [{ id: "hot", label: "Hot", emoji: "🔥", count: hotStories.length, highlight: true }] : []),
        ...(warmStories.length > 0 ? [{ id: "trending", label: "Trending", emoji: "📈", count: warmStories.length }] : []),
        ...(otherStories.length > 0 ? [{ id: "recent", label: "Recent", count: otherStories.length }] : []),
        ...(sentiment ? [{ id: "sentiment", label: "Sentiment", emoji: "📊" }] : []),
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
          {insights.analyzedCount > 0 && (
            <li>
              AI analyzed <strong className="text-blue-400">{insights.analyzedCount}</strong> high-engagement stories
            </li>
          )}
          {sentiment && (
            <li>
              Overall sentiment: <strong className="text-white">{sentiment.trend}</strong> {getSentimentBadge(getSentimentLabel(sentiment.average), sentiment.average)}
            </li>
          )}
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
          <StoryList stories={hotStories} summaries={data.summaries} />
        </section>
      )}

      {/* Trending */}
      {warmStories.length > 0 && (
        <section id="trending" className="mb-8 scroll-mt-32">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            📈 Trending (20-99 points)
          </h2>
          <StoryList stories={warmStories.slice(0, 15)} summaries={data.summaries} />
        </section>
      )}

      {/* Recent */}
      {otherStories.length > 0 && (
        <section id="recent" className="mb-8 scroll-mt-32">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            Recent Mentions
          </h2>
          <StoryList stories={otherStories.slice(0, 15)} summaries={data.summaries} />
        </section>
      )}

      {/* Sentiment Analysis Section */}
      {sentiment && (
        <section id="sentiment" className="mb-8 scroll-mt-32">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            📊 Sentiment Analysis
          </h2>
          <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-5">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Current Sentiment</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-sm">Overall Trend</span>
                    <span className="text-white font-medium capitalize">{sentiment.trend}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-sm">Average Score</span>
                    {getSentimentBadge(getSentimentLabel(sentiment.average), sentiment.average)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-sm">Recent Average</span>
                    {getSentimentBadge(getSentimentLabel(sentiment.recentAverage), sentiment.recentAverage)}
                  </div>
                </div>
              </div>

              {sentiment.shifts.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">Recent Shifts</h3>
                  <div className="space-y-2">
                    {sentiment.shifts.slice(0, 3).map((shift, i) => (
                      <div key={i} className="text-sm">
                        <span className="text-zinc-500">
                          {new Date(shift.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}:
                        </span>{" "}
                        <span className={shift.direction === 'positive' ? 'text-green-400' : 'text-red-400'}>
                          {shift.direction === 'positive' ? '↑' : '↓'} {(shift.magnitude * 100).toFixed(0)}% shift
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {data.sentimentAnalysis?.historical && (
              <div className="mt-6 pt-6 border-t border-white/[0.08]">
                <h3 className="text-sm font-semibold text-white mb-3">30-Day Trend</h3>
                <p className="text-sm text-zinc-400">
                  Historical sentiment tracking shows {data.sentimentAnalysis.historical.trend} trend
                  with an average score of {data.sentimentAnalysis.historical.average.toFixed(2)}.
                  {data.sentimentAnalysis.historical.shifts.length > 0 &&
                    ` ${data.sentimentAnalysis.historical.shifts.length} significant shifts detected.`}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <div className="pt-6 border-t border-white/[0.08] text-xs text-zinc-600">
        <p>
          Data collected via{" "}
          <a href="https://hn.algolia.com/api" className="text-zinc-500 hover:text-zinc-400">HN Algolia API</a>.
          Updated daily at 05:00 UTC. Tracks mentions of AI coding tools, models, and related topics.
          {insights.analyzedCount > 0 && ` AI-powered summaries for stories with 50+ points.`}
        </p>
      </div>
    </div>
  );
}

function StoryList({ stories, summaries }: {
  stories: typeof data.stories;
  summaries?: Record<string, any>;
}) {
  return (
    <div className="space-y-2">
      {stories.map((story) => {
        const summary = summaries?.[story.id];

        return (
          <div
            key={story.id}
            className="flex flex-col p-3 md:p-4 bg-white/[0.02] rounded-lg border border-white/[0.04] hover:border-white/10 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-3 min-w-0">
                <a
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-white hover:text-blue-400 line-clamp-2 text-sm md:text-base"
                >
                  {story.title}
                </a>
                <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                  <span>by {story.author}</span>
                  <span>·</span>
                  <span>{story.comments} comments</span>
                  {summary && (
                    <>
                      <span>·</span>
                      {getSentimentBadge(summary.sentiment)}
                    </>
                  )}
                </div>
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

            {summary && (
              <div className="mt-3 pt-3 border-t border-white/[0.04]">
                <p className="text-sm text-zinc-300 leading-relaxed">{summary.summary}</p>

                {summary.keyQuotes && summary.keyQuotes.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {summary.keyQuotes.slice(0, 2).map((quote: string, i: number) => (
                      <blockquote key={i} className="text-xs text-zinc-500 italic pl-3 border-l-2 border-zinc-700">
                        "{quote}"
                      </blockquote>
                    ))}
                  </div>
                )}

                {summary.competitiveImplication && (
                  <p className="mt-2 text-xs text-yellow-400/70">
                    💡 {summary.competitiveImplication}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
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

function getSentimentLabel(score: number): string {
  if (score > 0.3) return 'positive';
  if (score < -0.3) return 'negative';
  if (Math.abs(score) < 0.1) return 'neutral';
  return 'mixed';
}