import Link from "next/link";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  emoji?: string;
}

// Hardcoded for now - could be dynamic from frontmatter later
const blogPosts: BlogPost[] = [
  {
    slug: "state-of-ai-coding-2026",
    title: "State of AI Coding Tools 2026",
    description: "The market has exploded. Here's who's winning, who's struggling, and where it's all heading.",
    date: "2026-02-10",
    emoji: "📊",
  },
  {
    slug: "ai-coding-tool-pricing-2026",
    title: "AI Coding Tool Pricing 2026",
    description: "Complete pricing comparison across 40+ AI coding tools — from free tiers to enterprise.",
    date: "2026-02-09",
    emoji: "💰",
  },
];

export const metadata = {
  title: "Blog — Kell",
  description: "Analysis, insights, and deep dives on the AI coding tool landscape.",
};

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Blog</h1>
      <p className="text-zinc-400 mb-8">Analysis and insights on AI coding tools</p>

      <div className="space-y-6">
        {blogPosts.map((post) => (
          <article 
            key={post.slug}
            className="group p-5 -mx-5 rounded-lg hover:bg-white/[0.02] transition-colors"
          >
            <Link href={`/blog/${post.slug}`} className="block">
              <div className="flex items-start gap-4">
                {post.emoji && (
                  <span className="text-2xl flex-shrink-0">{post.emoji}</span>
                )}
                <div>
                  <h2 className="text-lg font-medium text-white group-hover:text-blue-400 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-zinc-400 mt-1 text-sm">{post.description}</p>
                  <time className="text-xs text-zinc-600 mt-2 block">
                    {new Date(post.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>

      {blogPosts.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <p>No posts yet. Check back soon.</p>
        </div>
      )}

      <div className="mt-12 pt-6 border-t border-white/[0.08]">
        <p className="text-sm text-zinc-500">
          Want to be notified of new posts?{" "}
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Join the waitlist
          </Link>
        </p>
      </div>
    </div>
  );
}
