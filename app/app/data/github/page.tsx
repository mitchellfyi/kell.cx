import Link from "next/link";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

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

interface GitHubData {
  generatedAt: string;
  source: string;
  reposTracked: number;
  recentCount: number;
  totalReleasesFound: number;
  recentReleases: Release[];
}

function getGitHubData(): GitHubData | null {
  try {
    const dataPath = join(process.cwd(), "..", "data", "github-releases.json");
    if (!existsSync(dataPath)) return null;
    const raw = readFileSync(dataPath, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read GitHub data:", e);
    return null;
  }
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    proxy: "🔀",
    inference: "⚡",
    agent: "🤖",
    tool: "🔧",
    ide: "💻",
    model: "🧠",
  };
  return emojis[category] || "📦";
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    proxy: "text-purple-400",
    inference: "text-amber-400",
    agent: "text-green-400",
    tool: "text-blue-400",
    ide: "text-pink-400",
    model: "text-cyan-400",
  };
  return colors[category] || "text-zinc-400";
}

export const metadata = {
  title: "GitHub Releases — Kell",
  description: "Recent releases from AI coding tool repositories. Updated daily.",
};

export default function GitHubPage() {
  const data = getGitHubData();

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="text-sm text-zinc-500 mb-4">
          <Link href="/data" className="hover:text-white">Data</Link> → GitHub
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-4">GitHub Releases</h1>
        <p className="text-zinc-400">Data not available. Check back soon.</p>
      </div>
    );
  }

  const releasesByCategory = data.recentReleases.reduce((acc, release) => {
    const cat = release.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(release);
    return acc;
  }, {} as Record<string, Release[]>);

  const lastUpdated = new Date(data.generatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="text-sm text-zinc-500 mb-4">
        <Link href="/data" className="hover:text-white">Data</Link> → GitHub
      </div>
      
      <h1 className="text-2xl font-semibold tracking-tight mb-2">🐙 GitHub Releases</h1>
      <p className="text-zinc-400 mb-8">
        Recent releases from {data.reposTracked} tracked repositories · Updated: {lastUpdated}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard value={data.reposTracked.toString()} label="Repos Tracked" />
        <StatCard value={data.recentCount.toString()} label="Recent Releases" />
        <StatCard value={data.totalReleasesFound.toString()} label="Total Found" />
      </div>

      {/* Release List */}
      <div className="space-y-4">
        {data.recentReleases.slice(0, 30).map((release, idx) => (
          <div 
            key={`${release.repo}-${release.tag}`}
            className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-lg hover:border-white/[0.12] transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded ${getCategoryColor(release.category)} bg-white/[0.05]`}>
                    {getCategoryEmoji(release.category)} {release.category}
                  </span>
                  <span className="text-xs text-zinc-600">{release.company}</span>
                </div>
                <h3 className="font-medium text-white mt-2">
                  <a 
                    href={release.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-blue-400"
                  >
                    {release.repo}
                  </a>
                  <span className="text-zinc-500 font-normal ml-2">{release.tag}</span>
                </h3>
                {release.name !== release.tag && (
                  <p className="text-sm text-zinc-500 mt-1 truncate">{release.name}</p>
                )}
              </div>
              <div className="text-xs text-zinc-600 flex-shrink-0">
                {formatTimeAgo(release.publishedAt)}
              </div>
            </div>
            {release.body && (
              <p className="text-xs text-zinc-600 mt-2 line-clamp-2">
                {release.body.slice(0, 200)}...
              </p>
            )}
          </div>
        ))}
      </div>

      {data.recentReleases.length > 30 && (
        <p className="text-center text-sm text-zinc-500 mt-6">
          Showing 30 of {data.recentReleases.length} recent releases
        </p>
      )}

      <div className="mt-8 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg text-sm">
        <strong className="text-blue-400">📡 Want release alerts?</strong>
        <p className="text-zinc-400 mt-1">
          Get notified when important tools release updates.{" "}
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Join the waitlist →
          </Link>
        </p>
      </div>
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
