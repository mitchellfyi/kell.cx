import React from "react";
import Link from "next/link";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { notFound } from "next/navigation";

interface BriefingPageProps {
  params: Promise<{ date: string }>;
}

function getBriefingDates(): string[] {
  // Try content directory first (for Vercel builds), then parent directory (for local dev)
  const contentDir = join(process.cwd(), "content", "briefings");
  const legacyDir = join(process.cwd(), "..", "briefing", "digests");
  
  const briefingsDir = existsSync(contentDir) ? contentDir : legacyDir;
  
  if (!existsSync(briefingsDir)) return [];
  
  return readdirSync(briefingsDir)
    .filter(f => f.startsWith("briefing-") && f.endsWith(".md"))
    .map(f => f.match(/briefing-(\d{4}-\d{2}-\d{2})\.md/)?.[1])
    .filter((d): d is string => d !== undefined)
    .sort()
    .reverse();
}

function getBriefingContent(date: string): { markdown: string; html: string | null } | null {
  // Try content directory first (for Vercel builds), then parent directory (for local dev)
  const contentDir = join(process.cwd(), "content", "briefings");
  const legacyDir = join(process.cwd(), "..", "briefing");
  
  const useContent = existsSync(contentDir);
  
  const mdPath = useContent 
    ? join(contentDir, `briefing-${date}.md`)
    : join(legacyDir, "digests", `briefing-${date}.md`);
  const htmlPath = useContent
    ? join(contentDir, "html", `briefing-${date}.html`)
    : join(legacyDir, "emails", `briefing-${date}.html`);
  
  if (!existsSync(mdPath)) return null;
  
  const markdown = readFileSync(mdPath, "utf8");
  const html = existsSync(htmlPath) ? readFileSync(htmlPath, "utf8") : null;
  
  return { markdown, html };
}

export async function generateStaticParams() {
  const dates = getBriefingDates();
  // Must return at least one param for static export when using dynamic routes
  // If no briefings found, return a placeholder that will show 404
  if (dates.length === 0) {
    return [{ date: 'no-briefings' }];
  }
  return dates.map(date => ({ date }));
}

export async function generateMetadata({ params }: BriefingPageProps) {
  const { date } = await params;
  const formattedDate = formatDate(date);
  
  return {
    title: `Briefing ${formattedDate} — Kell`,
    description: `Daily competitive intelligence briefing for ${formattedDate}`,
  };
}

export default async function BriefingPage({ params }: BriefingPageProps) {
  const { date } = await params;
  const briefing = getBriefingContent(date);
  
  if (!briefing) {
    notFound();
  }
  
  const dates = getBriefingDates();
  const currentIndex = dates.indexOf(date);
  const prevDate = currentIndex < dates.length - 1 ? dates[currentIndex + 1] : null;
  const nextDate = currentIndex > 0 ? dates[currentIndex - 1] : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/archive" className="text-sm text-zinc-500 hover:text-zinc-400">
          ← All Briefings
        </Link>
        <div className="flex gap-4 text-sm">
          {prevDate && (
            <Link href={`/archive/${prevDate}`} className="text-zinc-500 hover:text-zinc-400">
              ← Older
            </Link>
          )}
          {nextDate && (
            <Link href={`/archive/${nextDate}`} className="text-zinc-500 hover:text-zinc-400">
              Newer →
            </Link>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="mb-8 pb-6 border-b border-white/[0.08]">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Daily Briefing
        </h1>
        <p className="text-zinc-400">{formatDate(date)}</p>
      </div>

      {/* Email Preview */}
      {briefing.html ? (
        <div className="bg-white rounded-lg overflow-hidden shadow-lg">
          <div 
            className="briefing-email"
            dangerouslySetInnerHTML={{ __html: briefing.html }} 
          />
        </div>
      ) : (
        <div className="prose prose-invert prose-zinc max-w-none">
          <BriefingMarkdown content={briefing.markdown} />
        </div>
      )}

      {/* Footer Nav */}
      <div className="mt-10 pt-6 border-t border-white/[0.08] flex items-center justify-between">
        {prevDate ? (
          <Link 
            href={`/archive/${prevDate}`} 
            className="text-sm text-zinc-500 hover:text-white transition-colors"
          >
            ← {formatDateShort(prevDate)}
          </Link>
        ) : <span />}
        
        <Link 
          href="/archive" 
          className="text-sm text-zinc-500 hover:text-white transition-colors"
        >
          All Briefings
        </Link>
        
        {nextDate ? (
          <Link 
            href={`/archive/${nextDate}`} 
            className="text-sm text-zinc-500 hover:text-white transition-colors"
          >
            {formatDateShort(nextDate)} →
          </Link>
        ) : <span />}
      </div>

      {/* CTA */}
      <div className="mt-8 p-6 bg-blue-500/5 border border-blue-500/20 rounded-lg text-center">
        <p className="text-zinc-300 mb-4">
          Get briefings like this delivered to your inbox every morning.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-colors"
        >
          Subscribe for Free
        </Link>
      </div>
    </div>
  );
}

function BriefingMarkdown({ content }: { content: string }) {
  // Simple markdown to HTML conversion for display
  const lines = content.split("\n");
  const elements: React.ReactElement[] = [];
  
  let i = 0;
  for (const line of lines) {
    if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-2xl font-bold text-white mb-4">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-xl font-semibold text-white mt-8 mb-4">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-lg font-medium text-white mt-6 mb-3">{line.slice(4)}</h3>);
    } else if (line.startsWith("---")) {
      elements.push(<hr key={i} className="my-6 border-white/[0.08]" />);
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      elements.push(
        <li key={i} className="text-zinc-300 ml-4" dangerouslySetInnerHTML={{ 
          __html: formatInlineMarkdown(line.slice(2)) 
        }} />
      );
    } else if (line.match(/^[🔥🚀💰📈📌📅💼📰📚💵📦]/)) {
      elements.push(
        <p key={i} className="text-zinc-300 my-2" dangerouslySetInnerHTML={{ 
          __html: formatInlineMarkdown(line) 
        }} />
      );
    } else if (line.trim()) {
      elements.push(
        <p key={i} className="text-zinc-400 my-2" dangerouslySetInnerHTML={{ 
          __html: formatInlineMarkdown(line) 
        }} />
      );
    }
    i++;
  }
  
  return <>{elements}</>;
}

function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">$1</a>');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00Z");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00Z");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
