import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import type { ComparisonPage } from '@/lib/ai-content';

const CONTENT_DIR = join(process.cwd(), 'content', 'ai-generated', 'comparisons');

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
  const comparison = getComparison(params.slug);
  if (!comparison) {
    return { title: 'Comparison Not Found' };
  }

  return {
    title: `${comparison.title} | kell.cx`,
    description: comparison.overview,
    openGraph: {
      title: comparison.title,
      description: comparison.overview,
    },
  };
}

function getComparison(slug: string): ComparisonPage | null {
  const filePath = join(CONTENT_DIR, `${slug}.json`);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content) as ComparisonPage;
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

function SentimentScore({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const color = score > 0.7 ? 'text-green-600' :
                score > 0.4 ? 'text-blue-600' :
                score > 0 ? 'text-gray-600' :
                'text-red-600';

  return <span className={`font-semibold ${color}`}>{percentage}%</span>;
}

export default function ComparisonPage({ params }: { params: { slug: string } }) {
  const comparison = getComparison(params.slug);

  if (!comparison) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href="/compare" className="hover:text-foreground">Compare</Link>
          <span>/</span>
          <span className="text-foreground">{comparison.tools.join(' vs ')}</span>
        </div>

        <h1 className="text-4xl font-bold mb-2">{comparison.title}</h1>
        <p className="text-sm text-muted-foreground">
          Last updated: {formatDate(comparison.lastUpdated)} | Live comparison data
        </p>
      </div>

      {/* Overview */}
      <section className="mb-12">
        <p className="text-lg leading-relaxed">{comparison.overview}</p>
      </section>

      {/* Quick Stats */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Community Sentiment</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {comparison.tools.map(tool => (
            <div key={tool} className="text-center p-4 border rounded">
              <h3 className="font-medium mb-2">{tool}</h3>
              <SentimentScore score={comparison.sentiment[tool].score} />
              <p className="text-xs text-muted-foreground mt-1">
                {comparison.sentiment[tool].summary}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Feature Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-4 border-b font-medium">Feature</th>
                {comparison.tools.map(tool => (
                  <th key={tool} className="text-center p-4 border-b font-medium">
                    {tool}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.featureComparison.map((feature, idx) => (
                <tr key={idx} className="hover:bg-accent/50">
                  <td className="p-4 border-b">{feature.feature}</td>
                  {comparison.tools.map(tool => (
                    <td key={tool} className="text-center p-4 border-b">
                      {typeof feature.comparison[tool] === 'boolean' ? (
                        feature.comparison[tool] ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-gray-400">✗</span>
                        )
                      ) : (
                        <span className="text-sm">{feature.comparison[tool]}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Pricing Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-4 border-b font-medium">Tier</th>
                {comparison.tools.map(tool => (
                  <th key={tool} className="text-center p-4 border-b font-medium">
                    {tool}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.pricingComparison.map((pricing, idx) => (
                <tr key={idx} className="hover:bg-accent/50">
                  <td className="p-4 border-b font-medium">{pricing.tier}</td>
                  {comparison.tools.map(tool => (
                    <td key={tool} className="text-center p-4 border-b">
                      <span className="font-semibold">{pricing.prices[tool]}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recommendation */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Our Analysis</h2>
        <div className="bg-accent/30 rounded-lg p-6">
          <p className="text-lg">{comparison.recommendation}</p>
        </div>
      </section>

      {/* Individual Tool Links */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Deep Dive</h2>
        <div className="flex flex-wrap gap-4">
          {comparison.tools.map(tool => (
            <Link
              key={tool}
              href={`/tools/${tool.toLowerCase().replace(/\s+/g, '-')}`}
              className="inline-block px-6 py-3 border rounded hover:bg-accent"
            >
              View {tool} Complete Guide →
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t text-sm text-muted-foreground">
        <p>
          This comparison is automatically generated and updated weekly from live data sources.
          Content is created using AI analysis of features, pricing, and community feedback.
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