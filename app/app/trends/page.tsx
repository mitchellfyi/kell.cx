import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import Link from 'next/link';
import type { TrendReport } from '@/lib/ai-content';

const CONTENT_DIR = join(process.cwd(), 'content', 'ai-generated', 'trends');

export const metadata = {
  title: 'AI Coding Trends & Reports | kell.cx',
  description: 'Weekly and monthly trend reports on AI coding tools. Market leaders, emerging players, and predictions.',
};

function getAvailableReports(): TrendReport[] {
  if (!existsSync(CONTENT_DIR)) {
    return [];
  }

  const files = readdirSync(CONTENT_DIR).filter(f => f.endsWith('.json'));

  return files.map(file => {
    try {
      const content = readFileSync(join(CONTENT_DIR, file), 'utf8');
      return JSON.parse(content) as TrendReport;
    } catch {
      return null;
    }
  })
  .filter((r): r is TrendReport => r !== null)
  .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TrendsIndexPage() {
  const reports = getAvailableReports();
  const weeklyReports = reports.filter(r => r.period === 'week');
  const monthlyReports = reports.filter(r => r.period === 'month');

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">AI Coding Trends</h1>
        <p className="text-lg text-muted-foreground">
          Data-driven insights regenerated weekly and monthly
        </p>
      </div>

      {/* Latest Reports */}
      {reports.length === 0 ? (
        <section className="mb-12">
          <p className="text-muted-foreground">
            No trend reports generated yet. They will appear here after the first content generation run.
          </p>
        </section>
      ) : (
        <>
          {/* Weekly Reports */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Weekly Reports</h2>
            <div className="grid gap-4">
              {weeklyReports.length === 0 ? (
                <p className="text-muted-foreground">No weekly reports available yet.</p>
              ) : (
                weeklyReports.slice(0, 4).map(report => (
                  <Link
                    key={report.slug}
                    href={`/trends/${report.slug}`}
                    className="block border rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-semibold">{report.title}</h3>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(report.generatedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {report.overview}
                    </p>
                    <div className="flex items-center gap-6 text-sm">
                      <span>
                        {report.marketLeaders.length} market leaders
                      </span>
                      <span>
                        {report.emergingTools.length} emerging tools
                      </span>
                      <span>
                        {report.keyDevelopments.length} key developments
                      </span>
                      <span className="text-primary ml-auto">Read Report →</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Monthly Reports */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">Monthly Reports</h2>
            <div className="grid gap-4">
              {monthlyReports.length === 0 ? (
                <p className="text-muted-foreground">No monthly reports available yet.</p>
              ) : (
                monthlyReports.slice(0, 3).map(report => (
                  <Link
                    key={report.slug}
                    href={`/trends/${report.slug}`}
                    className="block border rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-semibold">{report.title}</h3>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(report.generatedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {report.overview}
                    </p>
                    <div className="flex items-center gap-6 text-sm">
                      <span>
                        {report.marketLeaders.length} market leaders
                      </span>
                      <span>
                        {report.emergingTools.length} emerging tools
                      </span>
                      <span>
                        {report.predictions.length} predictions
                      </span>
                      <span className="text-primary ml-auto">Read Report →</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </>
      )}

      {/* What's Included */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Report Contents</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Weekly Reports Include:</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Top 5 market leaders by installs and momentum</li>
              <li>• Emerging tools with high growth rates</li>
              <li>• Major releases and announcements</li>
              <li>• 7-day activity summary</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Monthly Reports Include:</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Comprehensive market analysis</li>
              <li>• Long-term trends and patterns</li>
              <li>• Detailed predictions and forecasts</li>
              <li>• 30-day development roundup</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Related Links */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Explore More</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/leaderboard"
            className="inline-block px-4 py-2 border rounded hover:bg-accent"
          >
            Live Leaderboard
          </Link>
          <Link
            href="/data/vscode"
            className="inline-block px-4 py-2 border rounded hover:bg-accent"
          >
            VS Code Marketplace Stats
          </Link>
          <Link
            href="/data/github"
            className="inline-block px-4 py-2 border rounded hover:bg-accent"
          >
            GitHub Releases
          </Link>
          <Link
            href="/data/news"
            className="inline-block px-4 py-2 border rounded hover:bg-accent"
          >
            Latest News
          </Link>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t text-sm text-muted-foreground">
        <p>
          Trend reports are generated automatically: weekly every Sunday, monthly on the 1st.
          All analysis is data-driven and powered by Claude Opus 4.
        </p>
      </div>
    </div>
  );
}