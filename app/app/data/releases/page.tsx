import { getGitHubReleases, sources } from "@/lib/data";
import { DataNav, PageHeader, DataBreadcrumb } from "@/components/data-nav";
import { SectionNav } from "@/components/section-nav";

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
  
  const repoCount: Record<string, number> = {};
  allReleases.forEach(r => {
    repoCount[r.company] = (repoCount[r.company] || 0) + 1;
  });
  const mostActive = Object.entries(repoCount).sort((a, b) => b[1] - a[1])[0];
  const latest = allReleases[0];
  
  return { thisWeekCount, mostActive, latest, totalTracked: allReleases.length };
}

const insights = getKeyInsights();

export default function ReleasesPage() {
  const lastUpdated = new Date(data.generatedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <DataNav />
      
      <DataBreadcrumb current="Releases" />
      <PageHeader 
        title="GitHub Releases"
        description="Latest releases from AI coding tool repositories"
        stats={`${insights.totalTracked} repos tracked · Updated ${lastUpdated}`}
      />

      <SectionNav sections={[
        ...(releasesToday.length > 0 ? [{ id: "today", label: "Today", count: releasesToday.length, highlight: true }] : []),
        ...(releasesThisWeek.length > 0 ? [{ id: "week", label: "This Week", count: releasesThisWeek.length }] : []),
        ...(olderReleases.length > 0 ? [{ id: "older", label: "Older", count: olderReleases.length }] : []),
      ]} />

      {/* Key Insights */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-5 mb-8">
        <h2 className="text-xs uppercase tracking-wide text-blue-400 mb-3">Key Insights</h2>
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
              Latest: <strong className="text-white">{insights.latest.company}</strong> {insights.latest.tag} ({formatRelativeTime(insights.latest.publishedAt)})
            </li>
          )}
        </ul>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard value={String(releasesToday.length)} label="Today" />
        <StatCard value={String(releasesThisWeek.length)} label="This Week" />
        <StatCard value={String(data.recentReleases.length)} label="Total Recent" />
        <StatCard value={String(insights.totalTracked)} label="Repos Tracked" />
      </div>

      {/* Today's Releases */}
      {releasesToday.length > 0 && (
        <section id="today" className="mb-8 scroll-mt-32">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            Today
          </h2>
          <ReleaseList releases={releasesToday} />
        </section>
      )}

      {/* This Week */}
      {releasesThisWeek.length > 0 && (
        <section id="week" className="mb-8 scroll-mt-32">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            This Week
          </h2>
          <ReleaseList releases={releasesThisWeek} />
        </section>
      )}

      {/* Older */}
      {olderReleases.length > 0 && (
        <section id="older" className="mb-8 scroll-mt-32">
          <h2 className="text-base font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            Older
          </h2>
          <ReleaseList releases={olderReleases.slice(0, 15)} />
        </section>
      )}

      {/* Footer */}
      <div className="pt-6 border-t border-white/[0.08] text-xs text-zinc-600">
        <p>
          Data collected from{" "}
          <a href={sources.github} className="text-zinc-500 hover:text-zinc-400">GitHub Releases API</a>.
          Updated daily at 05:00 UTC.
        </p>
      </div>
    </div>
  );
}

function ReleaseList({ releases }: { releases: typeof data.recentReleases }) {
  return (
    <div className="space-y-2">
      {releases.map((release) => (
        <a
          key={release.url}
          href={release.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 md:p-4 bg-white/[0.02] rounded-lg border border-white/[0.04] hover:border-white/10 hover:bg-white/[0.03] transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-white">{release.company}</span>
              <span className="text-zinc-400 text-sm">{release.tag}</span>
              {release.isPrerelease && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-500/20 text-amber-400">pre</span>
              )}
            </div>
            <p className="text-xs text-zinc-600 mt-1 truncate">{release.repo}</p>
          </div>
          <span className="text-xs text-zinc-500 whitespace-nowrap ml-3">
            {formatRelativeTime(release.publishedAt)}
          </span>
        </a>
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

function formatRelativeTime(dateStr: string): string {
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
