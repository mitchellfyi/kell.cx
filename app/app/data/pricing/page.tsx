import Link from "next/link";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface PriceTier {
  price: number | string;
  period: string;
  note?: string;
}

interface Tool {
  name: string;
  website: string;
  freeTier: string | boolean | null;
  individual: PriceTier | string | null;
  team: PriceTier | string | null;
  enterprise: PriceTier | string | null;
  notes: string;
  pricingModel: string;
  highlight?: boolean;
  badge?: string;
}

interface Category {
  id: string;
  name: string;
  emoji: string;
  tools: Tool[];
}

interface LLMModel {
  name: string;
  input: number;
  output: number;
  unit: string;
}

interface LLMProvider {
  name: string;
  models: LLMModel[];
}

interface PricingData {
  meta: {
    lastUpdated: string;
    description: string;
  };
  categories: Category[];
  llmApiPricing?: {
    description: string;
    providers: LLMProvider[];
  };
}

function getPricingData(): PricingData | null {
  try {
    const dataPath = join(process.cwd(), "..", "data", "pricing.json");
    if (!existsSync(dataPath)) return null;
    const raw = readFileSync(dataPath, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read pricing data:", e);
    return null;
  }
}

function formatFreeTier(freeTier: string | boolean | null): string {
  if (freeTier === true) return "Yes";
  if (freeTier === false || freeTier === null) return "—";
  return freeTier;
}

function formatPrice(tier: PriceTier | string | null): string {
  if (tier === null) return "—";
  if (typeof tier === "string") return tier;
  const prefix = typeof tier.price === "string" ? "" : "$";
  return `${prefix}${tier.price}/${tier.period}`;
}

function getFreeTierStyle(freeTier: string | boolean | null): string {
  if (freeTier === true || freeTier === "Yes" || freeTier === "Open Source") {
    return "text-green-400";
  }
  if (freeTier === null || freeTier === false) {
    return "text-zinc-600";
  }
  return "";
}

function getPriceStyle(tier: PriceTier | string | null): string {
  if (tier === null) return "text-zinc-600";
  if (typeof tier === "string") {
    if (tier === "—") return "text-zinc-600";
    if (tier.includes("BYOK") || tier.includes("Usage")) return "text-amber-400";
    return "";
  }
  return "";
}

export const metadata = {
  title: "AI Coding Tool Pricing — Kell",
  description: "Comprehensive pricing comparison for AI coding assistants: Cursor, Copilot, Claude Code, Windsurf, and more.",
};

export default function PricingPage() {
  const data = getPricingData();

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="text-sm text-zinc-500 mb-4">
          <Link href="/data" className="hover:text-white">Data</Link> → Pricing
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-4">AI Coding Tool Pricing</h1>
        <p className="text-zinc-400">Data not available. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="text-sm text-zinc-500 mb-4">
        <Link href="/data" className="hover:text-white">Data</Link> → Pricing
      </div>
      
      <h1 className="text-2xl font-semibold tracking-tight mb-2">💰 AI Coding Tool Pricing</h1>
      <p className="text-zinc-400 mb-8">Last updated: {data.meta.lastUpdated}</p>

      <div className="flex flex-wrap gap-6 mb-8 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-zinc-400">Free tier available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-zinc-400">Subscription-based</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-zinc-400">Usage/BYOK pricing</span>
        </div>
      </div>

      {/* Categories */}
      {data.categories.map((category) => (
        <PricingSection key={category.id} category={category} />
      ))}

      {/* LLM API Pricing */}
      {data.llmApiPricing && (
        <section className="mb-8">
          <h2 className="text-lg font-medium text-white mb-2">🔑 LLM API Pricing (BYOK Reference)</h2>
          <p className="text-sm text-zinc-500 mb-4">{data.llmApiPricing.description}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 uppercase border-b border-white/[0.08]">
                  <th className="pb-3 pr-4">Provider</th>
                  <th className="pb-3 pr-4">Model</th>
                  <th className="pb-3 pr-4">Input</th>
                  <th className="pb-3 pr-4">Output</th>
                  <th className="pb-3">Unit</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                {data.llmApiPricing.providers.flatMap((provider) =>
                  provider.models.map((model, idx) => (
                    <tr key={`${provider.name}-${model.name}`} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-3 pr-4 font-medium text-white">
                        {idx === 0 ? provider.name : ""}
                      </td>
                      <td className="py-3 pr-4">{model.name}</td>
                      <td className="py-3 pr-4 text-zinc-400">${model.input.toFixed(2)}</td>
                      <td className="py-3 pr-4 text-zinc-400">${model.output.toFixed(2)}</td>
                      <td className="py-3 text-zinc-500">{model.unit}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Notes */}
      <div className="space-y-4 mt-8">
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-4 text-sm text-zinc-400">
          <strong className="text-zinc-300">Usage-Based Pricing Notes:</strong>
          <ul className="mt-2 space-y-1">
            <li>• <strong className="text-white">BYOK tools:</strong> Aider, Cline, Continue let you use any LLM. Costs vary by provider.</li>
            <li>• <strong className="text-white">Claude Code:</strong> Uses Anthropic API. Heavy coding session = $1-10+</li>
            <li>• Annual plans typically save 15-20%. Enterprise pricing varies by seats and requirements.</li>
          </ul>
        </div>

        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 text-sm">
          <strong className="text-blue-400">💡 Quick Picks:</strong>
          <ul className="mt-2 space-y-1 text-zinc-400">
            <li>• <strong className="text-white">Best free:</strong> Windsurf (unlimited completions)</li>
            <li>• <strong className="text-white">Cheapest paid:</strong> Cody at $9/mo</li>
            <li>• <strong className="text-white">Most flexible:</strong> Aider + local models (truly free)</li>
            <li>• <strong className="text-white">Most powerful:</strong> Claude Code or Cursor Pro</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function PricingSection({ category }: { category: Category }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-medium text-white mb-4">{category.emoji} {category.name}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500 uppercase border-b border-white/[0.08]">
              <th className="pb-3 pr-4">Tool</th>
              <th className="pb-3 pr-4">Free Tier</th>
              <th className="pb-3 pr-4">Individual</th>
              <th className="pb-3 pr-4">Team</th>
              <th className="pb-3 pr-4">Enterprise</th>
              <th className="pb-3">Notes</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {category.tools.map((tool) => (
              <tr 
                key={tool.name} 
                className={`border-b border-white/[0.04] hover:bg-white/[0.02] ${tool.highlight ? "bg-blue-500/5" : ""}`}
              >
                <td className="py-3 pr-4 font-medium text-white">
                  <a href={`https://${tool.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">
                    {tool.name}
                  </a>
                  {tool.badge && (
                    <span className="ml-2 text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded uppercase">{tool.badge}</span>
                  )}
                </td>
                <td className={`py-3 pr-4 ${getFreeTierStyle(tool.freeTier)}`}>
                  {formatFreeTier(tool.freeTier)}
                </td>
                <td className={`py-3 pr-4 ${getPriceStyle(tool.individual)}`}>
                  {formatPrice(tool.individual)}
                </td>
                <td className={`py-3 pr-4 ${getPriceStyle(tool.team)}`}>
                  {formatPrice(tool.team)}
                </td>
                <td className={`py-3 pr-4 ${getPriceStyle(tool.enterprise)}`}>
                  {formatPrice(tool.enterprise)}
                </td>
                <td className="py-3 text-zinc-500">{tool.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
