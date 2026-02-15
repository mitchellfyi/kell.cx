import type { AIInsightsData } from "@/lib/data";

interface AIInsightsProps {
  data: AIInsightsData | null;
}

export function AIInsights({ data }: AIInsightsProps) {
  if (!data || !data.insights?.length) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">AI-Generated Insights</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Last updated: {new Date(data.generatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
            AI
          </span>
        </div>

        {/* Market Summary */}
        {data.marketSummary && (
          <p className="text-sm text-zinc-300 mb-4 pb-4 border-b border-white/10">
            {data.marketSummary}
          </p>
        )}

        {/* Insights List */}
        <div className="space-y-3">
          {data.insights.slice(0, 5).map((insight, i) => (
            <div key={i} className="flex gap-3">
              <SignificanceBadge level={insight.significance} />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white">{insight.headline}</h3>
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{insight.summary}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs text-zinc-600">{insight.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SignificanceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const bgColor = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-zinc-500",
  }[level];

  return (
    <span
      className={`flex-shrink-0 w-1.5 h-full min-h-[2rem] rounded-full ${bgColor}`}
      title={`${level} significance`}
    />
  );
}
