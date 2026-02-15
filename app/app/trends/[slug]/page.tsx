import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import type { TrendReport } from '@/lib/ai-content';

const CONTENT_DIR = join(process.cwd(), 'content', 'ai-generated', 'trends');

export async function generateStaticParams() {
  if (!existsSync(CONTENT_DIR)) {
    return [];
  }

  const files = readdirSync(CONTENT_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => ({ slug: f.replace('.json', '') }));

  return files;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const report = getTrendReport(params.slug);
  if (!report) {
    return { title: 'Report Not Found' };
  }

  return {
    title: `${report.title} | kell.cx`,
    description: report.overview,
    openGraph: {
      title: report.title,
      description: report.overview,
    },
  };
}

function getTrendReport(slug: string): TrendReport | null {
  const filePath = join(CONTENT_DIR, `${slug}.json`);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content) as TrendReport;
  } catch {
    return null;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export default function TrendReportPage({ params }: { params: { slug: string } }) {
  const report = getTrendReport(params.slug);

  if (!report) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href="/trends" className="hover:text-foreground">Trends</Link>
          <span>/</span>
          <span className="text-foreground">{report.period} Report</span>
        </div>

        <h1 className="text-4xl font-bold mb-2">{report.title}</h1>
        <p className="text-sm text-muted-foreground">
          Regenerated {report.period === 'week' ? 'weekly' : 'monthly'} |
          Last updated: {formatDate(report.lastUpdated)}
        </p>
      </div>

      {/* Overview */}
      <section className="mb-12">
        <p className="text-lg leading-relaxed">{report.overview}</p>
      </section>

      {/* Market Leaders */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Market Leaders</h2>
        <div className="space-y-6">
          {report.marketLeaders.map((leader, idx) => (
            <div key={idx} className="border rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-semibold">
                  #{idx + 1} {leader.name}
                </h3>
                {leader.installs && (
                  <span className="text-sm text-muted-foreground">
                    {formatNumber(leader.installs)} installs
                  </span>
                )}
              </div>
              {leader.momentum > 0 && (
                <div className="mb-3">
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    +{formatNumber(leader.momentum)} momentum
                  </span>
                </div>
              )}
              {leader.highlights.length > 0 && (
                <ul className="space-y-1">
                  {leader.highlights.map((highlight, hidx) => (
                    <li key={hidx} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Emerging Tools */}
      {report.emergingTools.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Emerging Players</h2>
          <div className="grid gap-4">
            {report.emergingTools.map((tool, idx) => (
              <div key={idx} className="border-l-4 border-primary pl-4">
                <h3 className="font-semibold mb-1">{tool.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{tool.description}</p>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600 font-medium">{tool.growth}</span>
                  <span className="text-muted-foreground">{tool.potential}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Key Developments */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Key Developments</h2>
        <div className="space-y-6">
          {report.keyDevelopments.map((dev, idx) => (
            <div key={idx} className="border-b pb-4 last:border-b-0">
              <h3 className="font-semibold text-lg mb-2">{dev.title}</h3>
              <p className="mb-3">{dev.summary}</p>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-muted-foreground">
                  Impact: <span className="text-foreground">{dev.impact}</span>
                </span>
                {dev.relatedTools.length > 0 && (
                  <span className="text-muted-foreground">
                    Related: {dev.relatedTools.join(', ')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Predictions */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Predictions</h2>
        <div className="bg-accent/30 rounded-lg p-6">
          <ul className="space-y-3">
            {report.predictions.map((prediction, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="text-primary font-bold">{idx + 1}.</span>
                <span>{prediction}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Navigation */}
      <section className="mb-12">
        <h3 className="text-lg font-semibold mb-3">Explore More</h3>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/trends"
            className="inline-block px-4 py-2 border rounded hover:bg-accent"
          >
            All Trend Reports
          </Link>
          <Link
            href="/leaderboard"
            className="inline-block px-4 py-2 border rounded hover:bg-accent"
          >
            Live Leaderboard
          </Link>
          <Link
            href="/tools"
            className="inline-block px-4 py-2 border rounded hover:bg-accent"
          >
            Tool Guides
          </Link>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t text-sm text-muted-foreground">
        <p>
          This trend report is automatically generated {report.period === 'week' ? 'weekly' : 'monthly'}
          from market data, release activity, and community sentiment analysis.
        </p>
        <p className="mt-2">
          Generated with{' '}
          <a href="https://claude.com" className="hover:text-foreground" target="_blank" rel="noopener noreferrer">
            Claude Opus 4
          </a>
        </p>
      </div>
    </div>
  );
}