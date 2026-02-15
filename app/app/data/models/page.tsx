import Link from "next/link";
import { getLMArenaLeaderboard, getAiderBenchmark, sources } from "@/lib/data";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { DataNav, PageHeader, DataBreadcrumb } from "@/components/data-nav";
import { SectionNav } from "@/components/section-nav";

// Load model releases
function loadModelReleases() {
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

const modelData = loadModelReleases();
const masterList = loadMasterList();
const lmarena = getLMArenaLeaderboard();
const aider = getAiderBenchmark();

// Group LMArena by organization
const byOrg: Record<string, any[]> = {};
lmarena.models.forEach((m) => {
  if (!byOrg[m.organization]) byOrg[m.organization] = [];
  byOrg[m.organization].push(m);
});

const organizations = Object.entries(byOrg)
  .map(([name, models]) => ({ name, models, count: models.length }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 8);

export const metadata = {
  title: "AI Models — Kell",
  description: "Track all major AI models from Anthropic, OpenAI, Google, and more.",
};

export default function ModelsPage() {
  const recentReleases = modelData.recentReleases || [];
  const totalModels = lmarena.total_models || masterList.models?.length || 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <DataNav />
      
      <DataBreadcrumb current="Models" />
      <PageHeader 
        title="AI Models"
        description="All major AI models for coding and general use"
        stats={`${totalModels} models · ${organizations.length}+ providers · LMArena rankings`}
      />

      <SectionNav sections={[
        { id: "rankings", label: "Rankings", emoji: "🏆", highlight: true },
        { id: "providers", label: "By Provider", emoji: "🏢" },
        ...(recentReleases.length > 0 ? [{ id: "releases", label: "Recent Releases", emoji: "🆕" }] : []),
      ]} />

      {/* Key Insights */}
      <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-5 mb-8">
        <h2 className="text-xs uppercase tracking-wide text-purple-400 mb-3">🤖 Key Insights</h2>
        <ul className="space-y-2 text-sm text-zinc-300">
          <li>
            <strong className="text-white">{totalModels}</strong> models tracked across{" "}
            <strong className="text-white">{organizations.length}+</strong> providers
          </li>
          <li>
            Top coding model: <strong className="text-white">{aider.topModel || "GPT-5"}</strong> ({aider.topScore}% on Aider)
          </li>
          <li>
            LMArena #1 overall: <strong className="text-white">{lmarena.models[0]?.name || "Claude Opus 4.6"}</strong>
          </li>
        </ul>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <StatCard value={String(totalModels)} label="Total Models" />
        <StatCard value={String(organizations.length)} label="Providers" />
        <StatCard value={`${aider.topScore}%`} label="Top Aider Score" />
        <StatCard value="#1" label={lmarena.models[0]?.organization || "Anthropic"} />
      </div>

      {/* LMArena Top Rankings */}
      <section id="rankings" className="mb-10 scroll-mt-32">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 pb-2 border-b border-white/[0.08] gap-2">
          <div>
            <h2 className="text-lg font-semibold text-white">🏆 LMArena Top 20</h2>
            <p className="text-sm text-zinc-500">Overall rankings from 7M+ human votes</p>
          </div>
          <a href={sources.lmarena} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-zinc-400 whitespace-nowrap">
            Source ↗
          </a>
        </div>
        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase">
                <th className="pb-3 pr-4 w-14">Rank</th>
                <th className="pb-3 pr-4">Model</th>
                <th className="pb-3 pr-4">Provider</th>
                <th className="pb-3 text-center">Coding</th>
                <th className="pb-3 text-center">Math</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {lmarena.models.slice(0, 20).map((model, i) => (
                <tr key={model.name} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className={`py-2.5 pr-4 ${getRankStyle(model.rank_overall)}`}>#{model.rank_overall}</td>
                  <td className="py-2.5 pr-4 font-medium text-white">{model.name}</td>
                  <td className="py-2.5 pr-4">
                    <span className="px-2 py-0.5 bg-white/[0.05] text-zinc-400 rounded text-xs">
                      {model.organization}
                    </span>
                  </td>
                  <td className="py-2.5 text-center text-zinc-500">
                    {model.rank_coding ? `#${model.rank_coding}` : "—"}
                  </td>
                  <td className="py-2.5 text-center text-zinc-500">
                    {model.rank_math ? `#${model.rank_math}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* By Provider */}
      <section id="providers" className="mb-10 scroll-mt-32">
        <h2 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
          🏢 Models by Provider
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <div key={org.name} className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.08]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-white">{org.name}</h3>
                <span className="text-xs text-zinc-500">{org.count} models</span>
              </div>
              <div className="space-y-1.5">
                {org.models.slice(0, 4).map((model: any) => (
                  <div key={model.name} className="flex justify-between text-sm">
                    <span className="text-zinc-300 truncate pr-2">{model.name}</span>
                    <span className="text-zinc-500 whitespace-nowrap">#{model.rank_overall}</span>
                  </div>
                ))}
                {org.count > 4 && (
                  <p className="text-xs text-zinc-600 mt-2">+{org.count - 4} more</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Releases */}
      {recentReleases.length > 0 && (
        <section id="releases" className="mb-10 scroll-mt-32">
          <h2 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            🆕 Recent Model Releases
          </h2>
          <div className="space-y-2">
            {recentReleases.slice(0, 8).map((model: any, i: number) => (
              <div
                key={i}
                className="flex items-start justify-between p-3 md:p-4 bg-white/[0.02] rounded-lg border border-white/[0.04]"
              >
                <div>
                  <div className="font-medium text-white">{model.name}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {model.provider} · {model.type} · Released {model.released}
                  </div>
                </div>
                {model.pricingInput && (
                  <div className="text-right text-xs text-zinc-500">
                    ${model.pricingInput}/M in
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Model Categories */}
      <section className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-5 mb-8">
        <h3 className="text-sm font-medium text-white mb-3">Model Categories</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-zinc-500 mb-1 text-xs uppercase">Flagship</div>
            <div className="text-zinc-300 text-xs">Claude Opus, GPT-5, Gemini Pro</div>
          </div>
          <div>
            <div className="text-zinc-500 mb-1 text-xs uppercase">Coding</div>
            <div className="text-zinc-300 text-xs">Codestral, GPT-5.3-Codex</div>
          </div>
          <div>
            <div className="text-zinc-500 mb-1 text-xs uppercase">Reasoning</div>
            <div className="text-zinc-300 text-xs">o3, Claude Thinking</div>
          </div>
          <div>
            <div className="text-zinc-500 mb-1 text-xs uppercase">Fast</div>
            <div className="text-zinc-300 text-xs">Haiku, Flash, Llama Scout</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="pt-6 border-t border-white/[0.08] text-xs text-zinc-600">
        <p>
          Model rankings from{" "}
          <a href={sources.lmarena} className="text-zinc-500 hover:text-zinc-400">LMArena</a> and{" "}
          <a href={sources.aider} className="text-zinc-500 hover:text-zinc-400">Aider</a>.
          Updated daily at 05:00 UTC.
        </p>
      </div>
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

function getRankStyle(rank: number): string {
  if (rank === 1) return "text-amber-400 font-bold";
  if (rank === 2) return "text-zinc-300 font-semibold";
  if (rank === 3) return "text-orange-400 font-semibold";
  return "text-zinc-500";
}
