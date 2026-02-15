import Link from "next/link";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Load model data
function loadModels() {
  const path = join(process.cwd(), "..", "data", "model-releases.json");
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      return { recentReleases: [], byProvider: {} };
    }
  }
  return { recentReleases: [], byProvider: {} };
}

function loadMasterList() {
  const path = join(process.cwd(), "..", "data", "master-list.json");
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      return { models: [] };
    }
  }
  return { models: [] };
}

function loadInsights() {
  const path = join(process.cwd(), "..", "data", "insights.json");
  if (existsSync(path)) {
    try {
      const data = JSON.parse(readFileSync(path, "utf8"));
      return data.models || data.market || [];
    } catch {
      return [];
    }
  }
  return [];
}

const modelData = loadModels();
const masterList = loadMasterList();
const insights = loadInsights();

// Organize by provider
const providers = Object.entries(modelData.byProvider || {}).map(([key, data]: [string, any]) => ({
  id: key,
  ...data,
}));

export const metadata = {
  title: "AI Models — Kell",
  description: "Track all major AI models from Anthropic, OpenAI, Google, and more.",
};

export default function ModelsPage() {
  const lastUpdated = modelData.lastUpdated
    ? new Date(modelData.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "Recently";

  const recentReleases = modelData.recentReleases || [];
  const totalModels = modelData.summary?.totalModels || masterList.models?.length || 17;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-6">
        <Link href="/data" className="text-sm text-zinc-500 hover:text-zinc-400">
          ← Back to Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight mb-2">AI Models</h1>
      <p className="text-zinc-400 mb-1">All major AI models for coding and general use</p>
      <p className="text-sm text-zinc-600 mb-6">
        {totalModels} models tracked · {providers.length} providers · Last updated: {lastUpdated}
      </p>

      {/* Key Insights */}
      <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-5 mb-8">
        <h2 className="text-xs uppercase tracking-wide text-purple-400 mb-4">🤖 Key Insights</h2>
        <ul className="space-y-2 text-sm text-zinc-300">
          <li>
            Latest release: <strong className="text-white">{modelData.summary?.newestModel || "Claude Opus 4.6"}</strong> ({modelData.summary?.newestRelease || "Feb 10"})
          </li>
          <li>
            <strong className="text-white">{recentReleases.length}</strong> new models in the past month
          </li>
          <li>
            Major providers: <strong className="text-white">Anthropic, OpenAI, Google, Meta, xAI, Mistral, DeepSeek</strong>
          </li>
          {insights.slice(0, 2).map((insight: string, i: number) => (
            <li key={i}>{insight}</li>
          ))}
        </ul>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard value={String(totalModels)} label="Models Tracked" />
        <StatCard value={String(providers.length || 7)} label="Providers" />
        <StatCard value={String(recentReleases.length || 3)} label="Recent Releases" />
        <StatCard value={modelData.summary?.newestModel?.split(' ')[0] || "Claude"} label="Latest Provider" />
      </div>

      {/* Recent Releases */}
      {recentReleases.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-white/[0.08]">
            🆕 Recent Releases
          </h2>
          <div className="space-y-3">
            {recentReleases.map((model: any, i: number) => (
              <div
                key={i}
                className="flex items-start justify-between p-4 bg-white/[0.02] rounded-lg border border-white/[0.04]"
              >
                <div>
                  <div className="font-medium text-white">{model.name}</div>
                  <div className="text-sm text-zinc-500 mt-1">
                    {model.provider} · {model.type} · Released {model.released}
                  </div>
                  {model.highlights && (
                    <div className="flex gap-2 mt-2">
                      {model.highlights.slice(0, 3).map((h: string, j: number) => (
                        <span key={j} className="text-xs px-2 py-0.5 bg-white/[0.05] rounded text-zinc-400">
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {model.pricingInput && (
                  <div className="text-right text-sm">
                    <div className="text-zinc-400">${model.pricingInput}/M in</div>
                    <div className="text-zinc-500">${model.pricingOutput}/M out</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* By Provider */}
      <section className="mb-10">
        <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-white/[0.08]">
          📊 Models by Provider
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {providers.map((provider: any) => (
            <div
              key={provider.id}
              className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.08]"
            >
              <h3 className="font-medium text-white mb-3">{provider.name}</h3>
              <div className="space-y-2">
                {provider.models?.slice(0, 4).map((model: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-zinc-300">{model.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      model.status === 'current' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-500'
                    }`}>
                      {model.status || model.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* From Master List if no provider data */}
      {providers.length === 0 && masterList.models?.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-white/[0.08]">
            All Tracked Models
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase">
                  <th className="pb-3 pr-4">Model</th>
                  <th className="pb-3 pr-4">Provider</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3">Released</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {masterList.models.map((model: any, i: number) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    <td className="py-3 pr-4 font-medium text-white">{model.name}</td>
                    <td className="py-3 pr-4 text-zinc-500 capitalize">{model.provider}</td>
                    <td className="py-3 pr-4 text-zinc-500">{model.type}</td>
                    <td className="py-3 text-zinc-500">{model.released || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Model Categories */}
      <section className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-5 mb-8">
        <h3 className="text-sm font-medium text-white mb-3">Model Categories</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-zinc-500 mb-1">Flagship</div>
            <div className="text-zinc-300">Claude Opus, GPT-5, Gemini Pro</div>
          </div>
          <div>
            <div className="text-zinc-500 mb-1">Coding-Optimized</div>
            <div className="text-zinc-300">Codestral, GPT-5.3-Codex</div>
          </div>
          <div>
            <div className="text-zinc-500 mb-1">Reasoning</div>
            <div className="text-zinc-300">o3, Claude Thinking</div>
          </div>
          <div>
            <div className="text-zinc-500 mb-1">Fast/Efficient</div>
            <div className="text-zinc-300">Haiku, Flash, Llama Scout</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-white/[0.08] text-xs text-zinc-600">
        <p>
          Model data tracked from official provider announcements and API documentation.
          Updated daily at 05:00 UTC.
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
