import Link from "next/link";
import { getVSCodeStats, sources } from "@/lib/data";

const data = getVSCodeStats();

export const metadata = {
  title: "VS Code Extensions — Kell",
  description: "Live AI coding extension stats from the VS Code marketplace.",
};

// Key insights generated from data
function getKeyInsights() {
  const sorted = [...data.extensions].sort((a, b) => b.installs - a.installs);
  const topExtension = sorted[0];
  const totalInstalls = data.totalInstalls;
  const avgRating = sorted.reduce((sum, e) => sum + e.averageRating, 0) / sorted.length;
  
  return {
    topExtension,
    totalInstalls,
    avgRating,
    extensionCount: data.extensions.length,
  };
}

const insights = getKeyInsights();

export default function VSCodePage() {
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

      <h1 className="text-3xl font-semibold tracking-tight mb-2">VS Code Extensions</h1>
      <p className="text-zinc-400 mb-1">AI coding extension adoption in the VS Code marketplace</p>
      <p className="text-sm text-zinc-600 mb-6">
        {insights.extensionCount} extensions tracked · Last updated: {lastUpdated} ·{" "}
        <a href={sources.vscode} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
          Source: VS Code Marketplace ↗
        </a>
      </p>

      {/* Key Insights */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-5 mb-8">
        <h2 className="text-xs uppercase tracking-wide text-blue-400 mb-4">📊 Key Insights</h2>
        <ul className="space-y-2 text-sm text-zinc-300">
          <li>
            <strong className="text-white">{insights.topExtension?.name}</strong> leads with{" "}
            <strong className="text-green-400">{formatNumber(insights.topExtension?.installs || 0)}</strong> installs
          </li>
          <li>
            Total installs across all tracked extensions:{" "}
            <strong className="text-white">{formatNumber(insights.totalInstalls)}</strong>
          </li>
          <li>
            Average rating: <strong className="text-white">⭐ {insights.avgRating.toFixed(1)}</strong> across {insights.extensionCount} extensions
          </li>
        </ul>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard value={formatNumber(insights.totalInstalls)} label="Total Installs" />
        <StatCard value={String(insights.extensionCount)} label="Extensions Tracked" />
        <StatCard value={`⭐ ${insights.avgRating.toFixed(1)}`} label="Avg Rating" />
        <StatCard value={insights.topExtension?.publisher || "-"} label="Top Publisher" />
      </div>

      {/* Extensions Table */}
      <section>
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/[0.08]">
          <h2 className="text-xs uppercase tracking-wide text-zinc-500">All Extensions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Extension</th>
                <th className="pb-3 pr-4">Publisher</th>
                <th className="pb-3 pr-4 text-right">Installs</th>
                <th className="pb-3 text-right">Rating</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {data.extensions
                .sort((a, b) => b.installs - a.installs)
                .map((ext, i) => (
                  <tr key={ext.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 text-zinc-500">{i + 1}</td>
                    <td className="py-3 pr-4">
                      <a
                        href={`https://marketplace.visualstudio.com/items?itemName=${ext.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-white hover:text-blue-400"
                      >
                        {ext.name}
                      </a>
                    </td>
                    <td className="py-3 pr-4 text-zinc-500">{ext.publisher}</td>
                    <td className="py-3 pr-4 text-right text-green-400 font-medium">
                      {formatNumber(ext.installs)}
                    </td>
                    <td className="py-3 text-right text-zinc-400">
                      ⭐ {ext.averageRating.toFixed(1)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Data freshness footer */}
      <div className="mt-10 pt-6 border-t border-white/[0.08] text-xs text-zinc-600">
        <p>
          Data collected automatically from{" "}
          <a href={sources.vscode} className="text-zinc-500 hover:text-zinc-400">
            VS Code Marketplace API
          </a>
          . Updated daily at 05:00 UTC.
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

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}
