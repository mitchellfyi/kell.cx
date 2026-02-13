import { readFileSync, existsSync } from "fs";
import { join } from "path";
import Link from "next/link";
import { notFound } from "next/navigation";

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  emoji?: string;
  content: string;
}

// Blog posts data - content stored inline for static export
const blogPosts: Record<string, BlogPost> = {
  "state-of-ai-coding-2026": {
    slug: "state-of-ai-coding-2026",
    title: "State of AI Coding Tools 2026",
    description: "The market has exploded. Here's who's winning, who's struggling, and where it's all heading.",
    date: "2026-02-10",
    emoji: "📊",
    content: `
The AI coding tool landscape has fundamentally transformed in the past year. What was once a two-horse race between GitHub Copilot and a handful of startups has become a sprawling ecosystem of specialized tools, each carving out their niche.

## The Big Players

**Cursor** continues to dominate mindshare among professional developers. Their $10B valuation reflects the market's belief that the IDE itself will be rebuilt around AI. With 500 fast requests per month on their $20/mo Pro tier, they've found the sweet spot between utility and monetization.

**GitHub Copilot** maintains the largest user base due to enterprise adoption and the free tier for students and open source maintainers. At $10/month for individuals, it remains the "safe" choice for corporate environments already in the Microsoft ecosystem.

**Windsurf (Codeium)** has emerged as the serious free alternative. Their unlimited completions on the free tier and aggressive $10/mo pro pricing puts pressure on the entire market. The Windsurf editor launch shows they're not content being just a plugin.

## The Open Source Movement

The most interesting development has been the rise of open-source alternatives:

- **Aider** (40K+ GitHub stars) - Paul Gauthier's terminal-first approach has found a devoted following among developers who prefer working in their existing environment
- **Continue** (31K+ stars) - The most polished open-source VS Code extension, now with solid JetBrains support
- **Cline** - Gaining momentum as the "agent-first" approach to coding assistance

## What's Actually Working

Based on our data tracking, the tools seeing the most organic growth share common traits:

1. **Fast iteration** - Weekly updates beat monthly releases
2. **Model flexibility** - BYOK (Bring Your Own Key) options are increasingly expected
3. **Agent capabilities** - Multi-file edits and autonomous task completion are table stakes now
4. **Context awareness** - Understanding the full codebase, not just the current file

## Where It's Heading

Three trends to watch:

1. **Consolidation** - Expect 2-3 acquisitions of smaller players by big tech in 2026
2. **Specialization** - Vertical-specific tools (legal code, fintech, infrastructure) will emerge
3. **Agent evolution** - The line between "assistant" and "autonomous developer" continues to blur

The winners will be those who balance capability with predictability. Developers want AI that helps them ship faster without introducing chaos.

---

*We track 40+ AI coding tools daily. [Join the waitlist](/) for competitive intelligence delivered to your inbox.*
    `.trim(),
  },
  "ai-coding-tool-pricing-2026": {
    slug: "ai-coding-tool-pricing-2026",
    title: "AI Coding Tool Pricing 2026",
    description: "Complete pricing comparison across 40+ AI coding tools — from free tiers to enterprise.",
    date: "2026-02-09",
    emoji: "💰",
    content: `
We've compiled pricing data for every major AI coding tool on the market. Here's what you need to know.

## The Pricing Landscape

The market has settled into three distinct tiers:

| Tier | Price Range | Examples |
|------|-------------|----------|
| Free/Freemium | $0 | Codeium Free, Tabnine Starter, Cody Free |
| Individual | $10-20/mo | Copilot ($10), Cursor Pro ($20), Windsurf Pro ($10) |
| Team/Enterprise | $19-50+/user/mo | Copilot Business ($19), Cursor Business ($40) |

## IDE-Based Assistants

**Cursor** - $20/mo Pro, $40/user/mo Business
- 500 fast requests/month on Pro
- Custom pricing for enterprise
- Two-week free trial

**GitHub Copilot** - $10/mo Individual, $19/user/mo Business, $39/user/mo Enterprise
- Free for verified students and OSS maintainers
- Enterprise includes Copilot Chat, code review, and security features

**Windsurf (Codeium)** - Free tier, $10/mo Pro, $25/user/mo Team
- Unlimited completions on free tier (!)
- This aggressive pricing puts pressure on the whole market

**Zed AI** - $15/mo or BYOK
- Built directly into the Zed editor
- Bring your own API key option keeps costs predictable

## Terminal & CLI Tools

**Aider** - Free (OSS), BYOK
- No subscription fee - you pay your LLM provider directly
- Works with Claude, GPT-4, local models

**Claude Code** - BYOK
- Anthropic's official CLI
- Metered by API usage

## VS Code Extensions

**Continue** - Free (OSS), BYOK
- Enterprise support available
- Model-agnostic

**Cline** - Free (OSS), BYOK
- Agent-first architecture
- Rapidly gaining users

## What You're Actually Paying For

The hidden costs that matter:

1. **Request limits** - "Unlimited" often has fine print
2. **Model quality** - Free tiers usually get slower/smaller models
3. **Context window** - Bigger context = better results = higher cost
4. **Team features** - SSO, audit logs, admin controls add up

## Our Recommendation

For most developers:
- **Budget-conscious**: Codeium Free + Aider with Claude API
- **Individual Pro**: Cursor Pro ($20/mo) for the full IDE experience
- **Teams**: GitHub Copilot Business ($19/user/mo) for enterprise compliance

The sweet spot is around $15-20/month for meaningful productivity gains. Below that, you're often fighting the tool. Above that, make sure you're using the advanced features.

---

*Pricing data updated weekly. [Subscribe](/) to get notified when tools change their pricing.*
    `.trim(),
  },
};

export async function generateStaticParams() {
  return Object.keys(blogPosts).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogPosts[slug];
  if (!post) return { title: "Post Not Found" };
  
  return {
    title: `${post.title} — Kell`,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogPosts[slug];
  
  if (!post) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-2xl px-6 py-12">
      <Link 
        href="/blog" 
        className="text-sm text-zinc-500 hover:text-zinc-300 mb-8 inline-block"
      >
        ← Back to blog
      </Link>
      
      <header className="mb-8">
        {post.emoji && (
          <span className="text-4xl mb-4 block">{post.emoji}</span>
        )}
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          {post.title}
        </h1>
        <p className="text-zinc-400 mb-4">{post.description}</p>
        <time className="text-sm text-zinc-600">
          {new Date(post.date).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </time>
      </header>

      <div className="prose prose-invert prose-zinc max-w-none
        prose-headings:font-semibold prose-headings:tracking-tight
        prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
        prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
        prose-p:text-zinc-300 prose-p:leading-relaxed
        prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
        prose-strong:text-white prose-strong:font-medium
        prose-code:text-zinc-200 prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
        prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-white/10
        prose-li:text-zinc-300
        prose-table:text-sm
        prose-th:text-left prose-th:text-zinc-300 prose-th:font-medium prose-th:pb-2 prose-th:border-b prose-th:border-white/10
        prose-td:py-2 prose-td:text-zinc-400 prose-td:border-b prose-td:border-white/5
        prose-hr:border-white/10 prose-hr:my-8
      ">
        {post.content.split('\n\n').map((paragraph, i) => {
          // Handle headers
          if (paragraph.startsWith('## ')) {
            return <h2 key={i}>{paragraph.slice(3)}</h2>;
          }
          if (paragraph.startsWith('### ')) {
            return <h3 key={i}>{paragraph.slice(4)}</h3>;
          }
          // Handle horizontal rules
          if (paragraph.trim() === '---') {
            return <hr key={i} />;
          }
          // Handle lists
          if (paragraph.includes('\n- ') || paragraph.startsWith('- ')) {
            const items = paragraph.split('\n').filter(l => l.startsWith('- '));
            return (
              <ul key={i}>
                {items.map((item, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ 
                    __html: formatInlineMarkdown(item.slice(2)) 
                  }} />
                ))}
              </ul>
            );
          }
          // Handle numbered lists
          if (/^\d+\.\s/.test(paragraph)) {
            const items = paragraph.split('\n').filter(l => /^\d+\.\s/.test(l));
            return (
              <ol key={i}>
                {items.map((item, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ 
                    __html: formatInlineMarkdown(item.replace(/^\d+\.\s/, '')) 
                  }} />
                ))}
              </ol>
            );
          }
          // Handle tables
          if (paragraph.includes('|')) {
            const lines = paragraph.split('\n').filter(l => l.includes('|'));
            if (lines.length >= 2) {
              const headers = lines[0].split('|').filter(c => c.trim()).map(c => c.trim());
              const rows = lines.slice(2).map(l => l.split('|').filter(c => c.trim()).map(c => c.trim()));
              return (
                <table key={i}>
                  <thead>
                    <tr>
                      {headers.map((h, j) => <th key={j}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, j) => (
                      <tr key={j}>
                        {row.map((cell, k) => <td key={k}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            }
          }
          // Regular paragraphs
          return (
            <p key={i} dangerouslySetInnerHTML={{ 
              __html: formatInlineMarkdown(paragraph) 
            }} />
          );
        })}
      </div>

      <footer className="mt-12 pt-8 border-t border-white/10">
        <p className="text-sm text-zinc-500">
          Want more competitive intelligence?{" "}
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Join the waitlist
          </Link>
          {" "}for daily updates.
        </p>
      </footer>
    </article>
  );
}

function formatInlineMarkdown(text: string): string {
  return text
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}
