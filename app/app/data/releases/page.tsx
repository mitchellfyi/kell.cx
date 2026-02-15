import Link from "next/link";
import { getGitHubReleases, sources } from "@/lib/data";

const data = getGitHubReleases();

export const metadata = {
  title: "GitHub Releases — Kell",
  description: "Latest releases from AI coding tool repositories.",
};

// Group releases by recency
const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

const releasesToday = data.recentReleases.filter(r => new Date(r.publishedAt) > oneDayAgo);
const releasesThisWeek = data.recentReleases.filter(
  r => new Date(r.publishedAt) > oneWeekAgo && new Date(r.publishedAt) <= oneDayAgo
);
const olderReleases = data.recentReleases.filter(r => new Date(r.publishedAt) <= oneWeekAgo);

// Key insights
function getKeyInsights() {
  const allReleases = data.recentReleases;
  const thisWeekCount = allReleases.filter(r => new Date(r.publishedAt) > oneWeekAgo).length;
  
  // Most active repos
  const repoCount: Record<string, number> = {};
  allReleases.forEach(r => {
    repoCount[r.company] = (repoCount[r.company] || 0) + 1;
  });
  const mostActive = Object.entries(repoCount).sort((a, b) => b[1] - a[1])[0];
  
  // Latest release
  const latest = allReleases[0];
  
  // Count unique repos
  const uniqueRepos = new Set(allReleases.map(r => r.repo)).size;

  return {
    thisWeekCount,
    mostActive,
    latest,
    totalTracked: uniqueRepos,
  };
}

const insights = getKeyInsights();

export default function ReleasesPage() {
  const lastUpdated = new Date(data.generatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6">
        <Link href="/data" className="text-sm text-zinc-500 hover:text-zinc-400">
          ← Back to Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight mb-2">GitHub Releases</h1>
      <p className="text-zinc-400 mb-1">Latest releases from AI coding tool repositories</p>
      <p className="text-sm text-zinc-600 mb-6">
        {insights.totalTracked} repos tracked · Last updated: {lastUpdated} ·{" "}
        <a href={sources.github} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
          Source: GitHub API ↗
        </a>
      </p>

      {/* Key Insights */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-5 mb-8">
        <h2 className="text-xs uppercase tracking-wide text-blue-400 mb-4">📊 Key Insights</h2>
        <ul className="space-y-2 text-sm text-zinc-300">
          <li>
            <strong className="text-green-400">{insights.thisWeekCount}</strong> releases in the past week
          </li>
          {insights.mostActive && (
            <li>
              Most active: <strong className="text-white">{insights.mostActive[0]}</strong> ({insights.mostActive[1]} releases)
            </li>
          )}
          {insights.latest && (
            <li>
              Latest: <strong className="text-white">{insights.latest.company}</strong> {insights.latest.tag} (
              {formatRelativeTime(insights.latest.publishedAt)})
            </li>
          )}
        </ul>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard value={String(releasesToday.length)} label="Today" />
        <StatCard value={String(releasesThisWeek.length)} label="This Week" />
        <StatCard value={String(data.recentReleases.length)} label="Total Recent" />
        <StatCard value={String(insights.totalTracked)} label="Repos Tracked" />
      </div>

      {/* Releases grouped by time */}
      {releasesToday.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-green-400 mb-4 pb-2 border-b border-white/[0.08]">
            🔥 Today
          </h2>
          <ReleaseList releases={releasesToday} />
        </section>
      )}

      {releasesThisWeek.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-4 pb-2 border-b border-white/[0.08]">
            This Week
          </h2>
          <ReleaseList releases={releasesThisWeek} />
        </section>
      )}

      {olderReleases.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-4 pb-2 border-b border-white/[0.08]">
            Older
          </h2>
          <ReleaseList releases={olderReleases.slice(0, 10)} />
        </section>
      )}

      {/* Data freshness footer */}
      <div className="mt-10 pt-6 border-t border-white/[0.08] text-xs text-zinc-600">
        <p>
          Data collected automatically from{" "}
          <a href={sources.github} className="text-zinc-500 hover:text-zinc-400">
            GitHub Releases API
          </a>
          . Updated daily at 05:00 UTC.
        </p>
      </div>
    </div>
  );
}

function ReleaseList({ releases }: { releases: typeof data.recentReleases }) {
  return (
    <div className="space-y-3">
      {releases.map((release) => (
        <div
          key={release.url}
          className="flex items-start justify-between p-4 bg-white/[0.02] rounded-lg border border-white/[0.04] hover:border-white/[0.08]"
        >
          <div className="flex-1">
            <a
              href={release.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-white hover:text-blue-400"
            >
              {release.company} — {release.tag}
            </a>
            <p className="text-xs text-zinc-500 mt-1">
              {formatRelativeTime(release.publishedAt)}
              {release.isPrerelease && (
                <span className="ml-2 text-amber-400">(prerelease)</span>
              )}
            </p>
          </div>
          <a
            href={`https://github.com/${release.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-600 hover:text-zinc-400 whitespace-nowrap ml-4"
          >
            {release.repo} ↗
          </a>
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

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
