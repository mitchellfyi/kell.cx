import type { MarketAnalysisData } from "@/lib/data";

interface MarketAnalysisProps {
  data: MarketAnalysisData | null;
}

export function MarketAnalysis({ data }: MarketAnalysisProps) {
  if (!data?.current) {
    return null;
  }

  const analysis = data.current;

  return (
    <section className="mb-8">
      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Market Intelligence</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Updated: {new Date(analysis.generatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
            AI Analysis
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Market Leaders */}
          <div>
            <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Market Leaders</h3>
            <div className="flex flex-wrap gap-1.5">
              {analysis.marketLeaders.map((leader, i) => (
                <span key={i} className="px-2 py-0.5 bg-white/[0.05] text-zinc-300 text-xs rounded">
                  {leader}
                </span>
              ))}
            </div>
          </div>

          {/* Emerging Threats */}
          <div>
            <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Rising Competitors</h3>
            <div className="flex flex-wrap gap-1.5">
              {analysis.emergingThreats.map((threat, i) => (
                <span key={i} className="px-2 py-0.5 bg-orange-500/10 text-orange-400 text-xs rounded">
                  {threat}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
          <div>
            <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Pricing Trends</h3>
            <p className="text-sm text-zinc-300">{analysis.pricingTrends}</p>
          </div>
          
          <div>
            <h3 className="text-xs uppercase tracking-wide text-zinc-500 mb-1">Strategic Outlook</h3>
            <p className="text-sm text-zinc-300">{analysis.strategicOutlook}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
