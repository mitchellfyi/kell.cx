import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import type { ToolGuide } from '@/lib/ai-content';

const CONTENT_DIR = join(process.cwd(), 'content', 'ai-generated', 'tools');

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
  const guide = getToolGuide(params.slug);
  if (!guide) {
    return { title: 'Tool Not Found' };
  }

  return {
    title: `${guide.toolName}: Complete Guide (Auto-Updated) | kell.cx`,
    description: guide.overview,
    openGraph: {
      title: `${guide.toolName}: Complete Guide`,
      description: guide.overview,
    },
  };
}

function getToolGuide(slug: string): ToolGuide | null {
  const filePath = join(CONTENT_DIR, `${slug}.json`);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content) as ToolGuide;
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

function SentimentBadge({ score }: { score: number }) {
  const color = score > 0.7 ? 'bg-green-100 text-green-800' :
                score > 0.4 ? 'bg-blue-100 text-blue-800' :
                score > 0 ? 'bg-gray-100 text-gray-800' :
                'bg-red-100 text-red-800';

  const label = score > 0.7 ? 'Very Positive' :
                score > 0.4 ? 'Positive' :
                score > 0 ? 'Mixed' : 'Limited Data';

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm ${color}`}>
      {label}
    </span>
  );
}

export default function ToolGuidePage({ params }: { params: { slug: string } }) {
  const guide = getToolGuide(params.slug);

  if (!guide) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href="/tools" className="hover:text-foreground">Tools</Link>
          <span>/</span>
          <span className="text-foreground">{guide.toolName}</span>
        </div>

        <h1 className="text-4xl font-bold mb-2">
          {guide.toolName}: Complete Guide (Auto-Updated)
        </h1>
        <p className="text-sm text-muted-foreground">
          Last updated: {formatDate(guide.lastUpdated)} | AI-generated from live data
        </p>
      </div>

      {/* Overview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Overview</h2>
        <p className="text-lg leading-relaxed">{guide.overview}</p>
      </section>

      {/* Key Features */}
      {guide.features.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Key Features</h2>
          <ul className="space-y-2">
            {guide.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Pricing */}
      {guide.pricing && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Pricing</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {guide.pricing.tiers.map((tier, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">{tier.name}</h3>
                <p className="text-2xl font-bold mb-4">{tier.price}</p>
                <ul className="space-y-1 text-sm">
                  {tier.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-start gap-2">
                      <span className="text-primary">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {guide.pricing.enterprise && (
            <p className="mt-4 text-sm text-muted-foreground">
              Enterprise pricing available on request
            </p>
          )}
        </section>
      )}

      {/* Recent Activity */}
      {guide.recentActivity.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {guide.recentActivity.map((activity, idx) => (
              <div key={idx} className="border-l-2 pl-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <span className="capitalize">{activity.type}</span>
                  <span>•</span>
                  <span>{formatDate(activity.date)}</span>
                </div>
                <h3 className="font-medium mb-1">
                  <a
                    href={activity.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary"
                  >
                    {activity.title}
                  </a>
                </h3>
                {activity.summary && (
                  <p className="text-sm text-muted-foreground">{activity.summary}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Community Sentiment */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Community Sentiment</h2>
        <div className="flex items-center gap-4 mb-4">
          <SentimentBadge score={guide.sentiment.score} />
          <p className="text-muted-foreground">{guide.sentiment.summary}</p>
        </div>
      </section>

      {/* Strengths & Weaknesses */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Strengths & Weaknesses</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-green-600 mb-3">Strengths</h3>
            <ul className="space-y-2">
              {guide.strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-green-600">+</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-orange-600 mb-3">Weaknesses</h3>
            <ul className="space-y-2">
              {guide.weaknesses.map((weakness, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-orange-600">-</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Comparisons */}
      {guide.comparisons.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Compare With</h2>
          <div className="flex flex-wrap gap-2">
            {guide.comparisons.map((comparison, idx) => (
              <Link
                key={idx}
                href={`/compare/${guide.slug}-vs-${comparison.toLowerCase().replace(/\s+/g, '-')}`}
                className="inline-block px-4 py-2 border rounded hover:bg-accent"
              >
                {guide.toolName} vs {comparison}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <div className="mt-16 pt-8 border-t text-sm text-muted-foreground">
        <p>
          This page is automatically generated and updated daily from live data sources.
          Content is created using AI analysis of market data, community sentiment, and product information.
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