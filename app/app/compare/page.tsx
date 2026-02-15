import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import Link from 'next/link';
import type { ComparisonPage } from '@/lib/ai-content';

const CONTENT_DIR = join(process.cwd(), 'content', 'ai-generated', 'comparisons');

export const metadata = {
  title: 'Tool Comparisons - AI Coding Tools | kell.cx',
  description: 'Side-by-side comparisons of AI coding tools. Features, pricing, and recommendations updated weekly.',
};

function getAvailableComparisons(): ComparisonPage[] {
  if (!existsSync(CONTENT_DIR)) {
    return [];
  }

  const files = readdirSync(CONTENT_DIR).filter(f => f.endsWith('.json'));

  return files.map(file => {
    try {
      const content = readFileSync(join(CONTENT_DIR, file), 'utf8');
      return JSON.parse(content) as ComparisonPage;
    } catch {
      return null;
    }
  }).filter((c): c is ComparisonPage => c !== null);
}

export default function CompareIndexPage() {
  const comparisons = getAvailableComparisons();

  // Popular comparisons to suggest
  const suggestedComparisons = [
    ['Cursor', 'GitHub Copilot'],
    ['Cursor', 'Windsurf'],
    ['Claude Code', 'Aider'],
    ['Cody', 'Continue'],
    ['v0', 'Bolt'],
    ['Replit Agent', 'Devin']
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Compare AI Coding Tools</h1>
        <p className="text-lg text-muted-foreground">
          Side-by-side comparisons updated weekly with live data
        </p>
      </div>

      {/* Available Comparisons */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Available Comparisons</h2>
        {comparisons.length === 0 ? (
          <p className="text-muted-foreground">
            No comparisons generated yet. They will appear here after the first content generation run.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {comparisons.map(comparison => (
              <Link
                key={comparison.slug}
                href={`/compare/${comparison.slug}`}
                className="block border rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-semibold mb-2">
                  {comparison.tools.join(' vs ')}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {comparison.overview}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {comparison.featureComparison.length} features compared
                  </span>
                  <span className="text-primary text-sm">Compare →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Suggested Comparisons */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Popular Comparisons</h2>
        <p className="text-muted-foreground mb-4">
          These comparisons are frequently requested:
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {suggestedComparisons.map(tools => {
            const slug = tools.map(t => t.toLowerCase().replace(/\s+/g, '-')).join('-vs-');
            const exists = comparisons.some(c => c.slug === slug);

            return (
              <Link
                key={slug}
                href={exists ? `/compare/${slug}` : '#'}
                className={`block border rounded p-4 text-center ${
                  exists ? 'hover:bg-accent' : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <span className="font-medium">{tools.join(' vs ')}</span>
                {!exists && (
                  <span className="block text-xs text-muted-foreground mt-1">
                    Coming soon
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* What's Compared */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">What We Compare</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Features</h3>
            <p className="text-sm text-muted-foreground">
              Code completion, chat, refactoring, and more
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Pricing</h3>
            <p className="text-sm text-muted-foreground">
              Free tiers, pro plans, and enterprise options
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Community</h3>
            <p className="text-sm text-muted-foreground">
              Sentiment analysis from HN, Reddit, and more
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Verdict</h3>
            <p className="text-sm text-muted-foreground">
              AI-generated recommendations based on data
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t text-sm text-muted-foreground">
        <p>
          All comparisons are regenerated weekly with fresh data.
          Powered by Claude Opus 4 and objective data analysis.
        </p>
      </div>
    </div>
  );
}