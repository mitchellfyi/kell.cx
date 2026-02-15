import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import Link from 'next/link';
import type { ToolGuide } from '@/lib/ai-content';
import { getAllProducts } from '@/lib/companies';

const CONTENT_DIR = join(process.cwd(), 'content', 'ai-generated', 'tools');

export const metadata = {
  title: 'AI Coding Tools - Complete Guides | kell.cx',
  description: 'Comprehensive, auto-updated guides for every AI coding tool. Deep dives into features, pricing, and community sentiment.',
};

function getAvailableGuides(): ToolGuide[] {
  if (!existsSync(CONTENT_DIR)) {
    return [];
  }

  const files = readdirSync(CONTENT_DIR).filter(f => f.endsWith('.json'));

  return files.map(file => {
    try {
      const content = readFileSync(join(CONTENT_DIR, file), 'utf8');
      return JSON.parse(content) as ToolGuide;
    } catch {
      return null;
    }
  }).filter((g): g is ToolGuide => g !== null);
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
    <span className={`inline-block px-2 py-0.5 rounded text-xs ${color}`}>
      {label}
    </span>
  );
}

export default function ToolsIndexPage() {
  const guides = getAvailableGuides();
  const allProducts = getAllProducts();

  // Separate available and coming soon
  const availableTools = guides.map(g => g.toolName);
  const comingSoonTools = allProducts
    .filter(p => !availableTools.includes(p.name))
    .map(p => p.name);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">AI Coding Tools</h1>
        <p className="text-lg text-muted-foreground">
          Comprehensive guides that update automatically with fresh data
        </p>
      </div>

      {/* Available Guides */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Available Tool Guides</h2>
        {guides.length === 0 ? (
          <p className="text-muted-foreground">
            No guides generated yet. They will appear here after the first content generation run.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {guides.map(guide => (
              <Link
                key={guide.slug}
                href={`/tools/${guide.slug}`}
                className="block border rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-semibold">{guide.toolName}</h3>
                  <SentimentBadge score={guide.sentiment.score} />
                </div>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {guide.overview}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {guide.recentActivity.length} recent activities
                  </span>
                  <span className="text-primary">View Guide →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Coming Soon */}
      {comingSoonTools.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
          <p className="text-muted-foreground mb-4">
            These tools will have auto-generated guides available soon:
          </p>
          <div className="flex flex-wrap gap-2">
            {comingSoonTools.map(tool => (
              <span
                key={tool}
                className="inline-block px-3 py-1 bg-accent rounded text-sm"
              >
                {tool}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">What's Included</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Live Pricing Data</h3>
            <p className="text-sm text-muted-foreground">
              Always up-to-date pricing information pulled from official sources
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Recent Activity</h3>
            <p className="text-sm text-muted-foreground">
              Latest releases, news mentions, and community discussions
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Sentiment Analysis</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered analysis of community feedback and reception
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t text-sm text-muted-foreground">
        <p>
          All tool guides are regenerated daily with fresh data.
          Powered by Claude Opus 4 and live data feeds.
        </p>
      </div>
    </div>
  );
}