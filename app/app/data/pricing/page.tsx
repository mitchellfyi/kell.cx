import Link from "next/link";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { DataNav, PageHeader, DataBreadcrumb } from "@/components/data-nav";
import { SectionNav } from "@/components/section-nav";

// Load pricing data
function loadPricing() {
  const paths = [
    join(process.cwd(), "..", "data", "pricing.json"),
    join(process.cwd(), "..", "site", "data", "pricing.json"),
  ];
  
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        return JSON.parse(readFileSync(p, "utf8"));
      } catch {
        continue;
      }
    }
  }
  return { categories: [], meta: {} };
}

const pricing = loadPricing();

// Calculate stats
function getStats() {
  let totalTools = 0;
  let freeCount = 0;
  let minPrice = Infinity;
  let maxPrice = 0;
  
  pricing.categories?.forEach((cat: any) => {
    cat.tools?.forEach((tool: any) => {
      totalTools++;
      if (tool.freeTier) freeCount++;
      if (tool.individual?.price) {
        minPrice = Math.min(minPrice, tool.individual.price);
        maxPrice = Math.max(maxPrice, tool.individual.price);
      }
    });
  });
  
  return {
    totalTools,
    freeCount,
    minPrice: minPrice === Infinity ? 0 : minPrice,
    maxPrice,
  };
}

const stats = getStats();

export const metadata = {
  title: "AI Coding Tool Pricing 2026 — Kell",
  description: "Live pricing comparison for every major AI coding tool. Updated daily.",
};

export default function PricingPage() {
  const lastUpdated = pricing.meta?.lastUpdated || "Recently";
  const categories = pricing.categories || [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <DataNav />
      
      <DataBreadcrumb current="Pricing" />
      <PageHeader 
        title="AI Coding Tool Pricing"
        description="Complete pricing comparison — updated daily"
        stats={`${stats.totalTools} tools compared · Last updated: ${lastUpdated}`}
      />

      {categories.length > 0 && (
        <SectionNav sections={[
          { id: "insights", label: "Insights", highlight: true },
          ...categories.map((cat: any) => ({
            id: cat.id,
            label: cat.name,
          })),
        ]} />
      )}

      {/* Key Insights */}
      <section id="insights" className="scroll-mt-32">
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-5 mb-8">
          <h2 className="text-xs uppercase tracking-wide text-green-400 mb-3">Key Insights</h2>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li>
              <strong className="text-white">{stats.freeCount} of {stats.totalTools}</strong> tools offer a free tier
            </li>
            <li>
              Individual plans range from <strong className="text-green-400">${stats.minPrice}</strong> to{" "}
              <strong className="text-green-400">${stats.maxPrice}</strong>/month
            </li>
            <li>
              Most tools follow a <strong className="text-white">Free → Pro → Team → Enterprise</strong> model
            </li>
            <li>
              Team pricing typically adds <strong className="text-white">50-100%</strong> premium over individual plans
            </li>
          </ul>
        </div>
      </section>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <StatCard value={String(stats.totalTools)} label="Tools Compared" />
        <StatCard value={String(stats.freeCount)} label="Free Tiers" />
        <StatCard value={`$${stats.minPrice}`} label="Lowest Pro" />
        <StatCard value={`$${stats.maxPrice}`} label="Highest Pro" />
      </div>

      {/* Pricing Tables by Category */}
      {categories.map((category: any) => (
        <section key={category.id} id={category.id} className="mb-10 scroll-mt-32">
          <h2 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
            {category.name}
          </h2>
          <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase">
                  <th className="pb-3 pr-4">Tool</th>
                  <th className="pb-3 pr-4">Free</th>
                  <th className="pb-3 pr-4">Individual</th>
                  <th className="pb-3 pr-4">Team</th>
                  <th className="pb-3 pr-4">Enterprise</th>
                  <th className="pb-3">Notes</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {category.tools?.map((tool: any) => (
                  <tr key={tool.name} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-3 pr-4">
                      <a
                        href={`https://${tool.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-white hover:text-blue-400"
                      >
                        {tool.name}
                      </a>
                    </td>
                    <td className="py-3 pr-4">
                      {tool.freeTier === true ? (
                        <span className="text-green-400">✓ Free</span>
                      ) : tool.freeTier ? (
                        <span className="text-zinc-400 text-xs">{tool.freeTier}</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {tool.individual?.price ? (
                        <span className="text-white font-medium">
                          ${tool.individual.price}<span className="text-zinc-500 text-xs">/{tool.individual.period}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {tool.team?.price ? (
                        <span className="text-white">
                          ${tool.team.price}<span className="text-zinc-500 text-xs">/{tool.team.period}</span>
                        </span>
                      ) : tool.team ? (
                        <span className="text-zinc-400 text-xs">{tool.team}</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {tool.enterprise?.price ? (
                        <span className="text-white">
                          ${tool.enterprise.price}<span className="text-zinc-500 text-xs">/{tool.enterprise.period}</span>
                        </span>
                      ) : tool.enterprise ? (
                        <span className="text-zinc-400 text-xs">{tool.enterprise}</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-3 text-zinc-500 text-xs max-w-[150px] truncate">{tool.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {/* Pricing Observations */}
      <section className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-5 mb-8">
        <h2 className="text-base font-medium text-white mb-4">Pricing Patterns</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-zinc-400">
          <div>
            <strong className="text-white block mb-1">The "Free" Trap</strong>
            <p>Most free tiers are heavily rate-limited. Cursor gives 2,000 completions/month, Windsurf is unlimited but slower models.</p>
          </div>
          <div>
            <strong className="text-white block mb-1">Team vs Individual</strong>
            <p>The jump from individual to team pricing often adds minimal features (SSO, admin controls) for 50-100% more cost per seat.</p>
          </div>
          <div>
            <strong className="text-white block mb-1">Enterprise Theater</strong>
            <p>"Custom pricing" usually means "we'll charge as much as we think you'll pay." Expect 2-5x team pricing.</p>
          </div>
          <div>
            <strong className="text-white block mb-1">BYOK Option</strong>
            <p>Tools like Continue, Cline, and Aider let you bring your own API keys — true $0 cost (beyond your API spend).</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="pt-6 border-t border-white/[0.08] text-xs text-zinc-600">
        <p>
          Pricing data collected from official websites. Verified daily. 
          Prices shown in USD. Some tools offer annual discounts not shown here.
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
