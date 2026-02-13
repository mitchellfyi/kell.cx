import { promises as fs } from 'fs';
import path from 'path';
import Link from 'next/link';

interface Release {
  repo: string;
  company: string;
  category: string;
  name: string;
  tag: string;
  url: string;
  publishedAt: string;
  isPrerelease: boolean;
  body: string;
}

interface ReleasesData {
  generatedAt: string;
  source: string;
  reposTracked: number;
  recentCount: number;
  totalReleasesFound: number;
  recentReleases: Release[];
}

async function getReleasesData(): Promise<ReleasesData | null> {
  try {
    const filePath = path.join(process.cwd(), '..', 'data', 'github-releases.json');
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load releases data:', error);
    return null;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncateBody(body: string, maxLength: number = 120): string {
  if (!body) return '';
  // Clean up markdown artifacts
  const cleaned = body
    .replace(/<details[^>]*>|<\/details>/g, '')
    .replace(/\*\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength).trim() + '...';
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    ide: 'bg-blue-500/20 text-blue-400',
    editor: 'bg-purple-500/20 text-purple-400',
    inference: 'bg-green-500/20 text-green-400',
    proxy: 'bg-yellow-500/20 text-yellow-400',
    cli: 'bg-orange-500/20 text-orange-400',
    api: 'bg-pink-500/20 text-pink-400',
  };
  return colors[category] || 'bg-zinc-500/20 text-zinc-400';
}

export const metadata = {
  title: 'GitHub Releases — Kell',
  description: 'Latest releases from AI coding tools and infrastructure projects.',
};

export default async function ReleasesPage() {
  const data = await getReleasesData();
  
  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight mb-4">GitHub Releases</h1>
        <p className="text-zinc-400">Failed to load releases data.</p>
      </div>
    );
  }

  // Group releases by date (day)
  const releasesByDate = data.recentReleases.reduce((acc, release) => {
    const date = new Date(release.publishedAt).toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(release);
    return acc;
  }, {} as Record<string, Release[]>);

  const generatedAt = new Date(data.generatedAt);
  const freshness = formatDate(data.generatedAt);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6">
        <Link href="/data" className="text-sm text-zinc-500 hover:text-zinc-300 mb-2 inline-block">
          ← Data Dashboard
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">📦 GitHub Releases</h1>
        <p className="text-zinc-400 mb-1">Latest releases from AI coding tools and infrastructure</p>
        <p className="text-sm text-zinc-600">
          {data.reposTracked} repos tracked · {data.recentCount} releases in last 7 days · Updated {freshness}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
          <div className="text-2xl font-semibold text-white">{data.reposTracked}</div>
          <div className="text-xs text-zinc-500">Repos Tracked</div>
        </div>
        <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
          <div className="text-2xl font-semibold text-green-400">{data.recentCount}</div>
          <div className="text-xs text-zinc-500">This Week</div>
        </div>
        <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
          <div className="text-2xl font-semibold text-white">{data.totalReleasesFound}</div>
          <div className="text-xs text-zinc-500">Total Found</div>
        </div>
      </div>

      {/* Releases by date */}
      <div className="space-y-8">
        {Object.entries(releasesByDate).map(([date, releases]) => (
          <section key={date}>
            <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-4 pb-2 border-b border-white/[0.08]">
              {date} · {releases.length} release{releases.length !== 1 ? 's' : ''}
            </h2>
            <div className="space-y-3">
              {releases.map((release, i) => (
                <a
                  key={`${release.repo}-${release.tag}-${i}`}
                  href={release.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg hover:border-white/20 hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-white truncate">
                          {release.company}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(release.category)}`}>
                          {release.category}
                        </span>
                        {release.isPrerelease && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                            prerelease
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-zinc-300 mb-1">
                        <span className="font-mono text-blue-400">{release.tag}</span>
                        {release.name !== release.tag && (
                          <span className="text-zinc-500 ml-2">— {release.name}</span>
                        )}
                      </div>
                      {release.body && (
                        <p className="text-xs text-zinc-500 mt-2">
                          {truncateBody(release.body)}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-zinc-600 whitespace-nowrap">
                      {formatDate(release.publishedAt)}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-600 mt-2">
                    {release.repo}
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Data source */}
      <div className="mt-12 pt-6 border-t border-white/[0.08]">
        <p className="text-xs text-zinc-600">
          Data source: {data.source} · Last updated: {generatedAt.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
