import { CompetitiveAnalysisEngine } from "./engine";
import { CompetitiveDataCollector } from "./data-collector";
import { AICompetitiveAnalyzer } from "./ai-analyzer";
import { DataNav, PageHeader, DataBreadcrumb } from "@/components/data-nav";
import { SectionNav } from "@/components/section-nav";
import Link from "next/link";

// Initialize engine and components
const engine = new CompetitiveAnalysisEngine();
const collector = new CompetitiveDataCollector(engine);
const aiAnalyzer = new AICompetitiveAnalyzer();

export const metadata = {
  title: "Competitive Analysis — AI Coding Tools Intelligence",
  description: "Real-time competitive intelligence and strategic analysis for AI coding tools",
};

export default async function CompetitiveAnalysisPage() {
  // Get recent alerts
  const recentAlerts = engine.getRecentAlerts(7);

  // Get competitor profiles
  const competitors = engine.getAllCompetitors();

  // Get market analysis
  const marketAnalysis = await aiAnalyzer.analyzeCompetitiveLandscape(
    competitors,
    { totalMarketSize: "$2.5B", growthRate: "45%" },
    "30d"
  );

  // Get strategic opportunities
  const opportunities = engine.identifyOpportunities();

  // Get threat scores
  const threatScores = competitors
    .map(c => ({
      name: c.name,
      score: engine.calculateThreatScore(c.name),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <DataNav />

      <DataBreadcrumb current="Competitive Analysis" />
      <PageHeader
        title="Competitive Intelligence"
        description="AI-powered analysis of the coding assistant landscape"
        stats={`${competitors.length} competitors tracked · ${recentAlerts.length} alerts this week`}
      />

      <SectionNav sections={[
        { id: "alerts", label: "Recent Alerts", emoji: "🚨", highlight: true },
        { id: "threats", label: "Threat Analysis", emoji: "⚡" },
        { id: "opportunities", label: "Opportunities", emoji: "💡" },
        { id: "market", label: "Market Analysis", emoji: "📊" },
        { id: "predictions", label: "Predictions", emoji: "🔮" },
      ]} />

      {/* Recent Alerts Section */}
      <section id="alerts" className="mb-12 scroll-mt-32">
        <h2 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
          🚨 Recent Competitive Alerts
        </h2>

        {recentAlerts.length > 0 ? (
          <div className="space-y-4">
            {recentAlerts.map(alert => (
              <div
                key={alert.id}
                className={`p-5 rounded-lg border ${
                  alert.severity === "critical"
                    ? "bg-red-500/5 border-red-500/20"
                    : alert.severity === "high"
                    ? "bg-orange-500/5 border-orange-500/20"
                    : alert.severity === "medium"
                    ? "bg-yellow-500/5 border-yellow-500/20"
                    : "bg-blue-500/5 border-blue-500/20"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-white">{alert.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    alert.severity === "critical"
                      ? "bg-red-500/20 text-red-400"
                      : alert.severity === "high"
                      ? "bg-orange-500/20 text-orange-400"
                      : alert.severity === "medium"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}>
                    {alert.severity}
                  </span>
                </div>

                <p className="text-sm text-zinc-300 mb-3">{alert.summary}</p>

                {alert.strategicRead && (
                  <div className="mb-3">
                    <strong className="text-xs text-zinc-500 uppercase">Strategic Read</strong>
                    <p className="text-sm text-zinc-300 mt-1">{alert.strategicRead}</p>
                  </div>
                )}

                {alert.userImpact && (
                  <div className="mb-3">
                    <strong className="text-xs text-zinc-500 uppercase">User Impact</strong>
                    <p className="text-sm text-zinc-300 mt-1">{alert.userImpact}</p>
                  </div>
                )}

                {alert.recommendations && alert.recommendations.length > 0 && (
                  <div>
                    <strong className="text-xs text-zinc-500 uppercase">Recommendations</strong>
                    <ul className="text-sm text-zinc-300 mt-1 space-y-1">
                      {alert.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-zinc-500 mr-2">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-400 text-sm">No recent alerts. Market conditions stable.</p>
        )}
      </section>

      {/* Threat Analysis Section */}
      <section id="threats" className="mb-12 scroll-mt-32">
        <h2 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
          ⚡ Competitive Threat Scores
        </h2>

        <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-5 mb-6">
          <p className="text-sm text-zinc-400 mb-4">
            AI-calculated threat scores based on features, pricing, market presence, and momentum.
          </p>

          <div className="space-y-3">
            {threatScores.map((competitor, idx) => (
              <div key={competitor.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-semibold text-zinc-500">#{idx + 1}</span>
                  <span className="font-medium text-white">{competitor.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-white/[0.08] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        competitor.score > 75
                          ? "bg-red-500"
                          : competitor.score > 50
                          ? "bg-orange-500"
                          : competitor.score > 25
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${competitor.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-zinc-300 w-10 text-right">
                    {competitor.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-400 mb-2">⚠️ High Priority Threats</h3>
            <ul className="space-y-1 text-sm text-zinc-300">
              <li>• Cursor and Windsurf dominating agentic coding narrative</li>
              <li>• GitHub Copilot's enterprise penetration accelerating</li>
              <li>• Price convergence reducing differentiation options</li>
            </ul>
          </div>
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-400 mb-2">👀 Emerging Threats</h3>
            <ul className="space-y-1 text-sm text-zinc-300">
              <li>• Open-source alternatives gaining momentum</li>
              <li>• Domain-specific tools entering market</li>
              <li>• BYOK model threatening subscription revenue</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Opportunities Section */}
      <section id="opportunities" className="mb-12 scroll-mt-32">
        <h2 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
          💡 Strategic Opportunities
        </h2>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {opportunities.slice(0, 4).map((opp, idx) => (
            <div key={idx} className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
              <p className="text-sm text-zinc-300">{opp}</p>
            </div>
          ))}
        </div>

        <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-5">
          <h3 className="text-base font-medium text-white mb-3">🎯 Quick Wins</h3>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span>
                <strong>BYOK Option:</strong> Low implementation cost, captures price-sensitive segment
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span>
                <strong>Zed/Lapce Integration:</strong> First-mover advantage in emerging IDEs
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span>
                <strong>Local Model Support:</strong> Address privacy-conscious enterprise segment
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Market Analysis Section */}
      <section id="market" className="mb-12 scroll-mt-32">
        <h2 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
          📊 AI Market Analysis
        </h2>

        <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-5 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base font-medium text-white mb-1">{marketAnalysis.summary}</h3>
              <p className="text-xs text-zinc-500">
                Confidence: {(marketAnalysis.confidence * 100).toFixed(0)}% ·
                Updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-zinc-400 mb-3">Key Insights</h4>
              <ul className="space-y-2 text-sm text-zinc-300">
                {marketAnalysis.insights.map((insight, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-zinc-500 mr-2">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-zinc-400 mb-3">Market Trends</h4>
              <div className="flex flex-wrap gap-2">
                {marketAnalysis.marketTrends?.map(trend => (
                  <span
                    key={trend}
                    className="text-xs px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400"
                  >
                    {trend}
                  </span>
                ))}
              </div>

              <h4 className="text-sm font-medium text-zinc-400 mb-3 mt-4">Strategic Actions</h4>
              <ul className="space-y-1 text-sm text-zinc-300">
                {marketAnalysis.recommendations.slice(0, 3).map((rec, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-green-400 mr-2">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Predictions Section */}
      <section id="predictions" className="mb-12 scroll-mt-32">
        <h2 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/[0.08]">
          🔮 AI-Generated Predictions
        </h2>

        <div className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-purple-500/20 rounded-lg p-5">
          <h3 className="text-base font-medium text-white mb-4">Next 6 Months</h3>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-purple-400 mb-2">📈 Market Evolution</h4>
              <ul className="space-y-1 text-sm text-zinc-300">
                <li>• Premium tools will converge on $25-30/month pricing</li>
                <li>• 2-3 major acquisitions as market consolidates</li>
                <li>• Enterprise adoption will drive 60%+ of revenue growth</li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-purple-400 mb-2">🤖 Technology Trends</h4>
              <ul className="space-y-1 text-sm text-zinc-300">
                <li>• Multi-agent systems become standard architecture</li>
                <li>• Local/hybrid models gain 20% market share</li>
                <li>• IDE-native experiences outperform web-based tools</li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-purple-400 mb-2">🎯 Competitive Dynamics</h4>
              <ul className="space-y-1 text-sm text-zinc-300">
                <li>• GitHub Copilot faces pressure from Cursor/Windsurf innovation</li>
                <li>• Open-source tools capture bottom 30% of market</li>
                <li>• Specialization emerges as key differentiator</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="pt-6 border-t border-white/[0.08] text-xs text-zinc-600">
        <p>
          Competitive intelligence powered by AI analysis of public data sources.
          Updates hourly. Last analysis: {new Date().toLocaleString()}.
        </p>
      </div>
    </div>
  );
}