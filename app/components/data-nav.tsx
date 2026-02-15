"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const dataPages = [
  { href: "/data", label: "Overview", emoji: "📊" },
  { href: "/data/benchmarks", label: "Benchmarks", emoji: "🏆" },
  { href: "/data/pricing", label: "Pricing", emoji: "💰" },
  { href: "/data/models", label: "Models", emoji: "🤖" },
  { href: "/data/releases", label: "Releases", emoji: "🚀" },
  { href: "/data/hackernews", label: "HN", emoji: "🔥" },
  { href: "/data/news", label: "News", emoji: "📰" },
  { href: "/data/opensource", label: "Open Source", emoji: "⭐" },
  { href: "/data/hiring", label: "Hiring", emoji: "💼" },
];

export function DataNav() {
  const pathname = usePathname();
  
  // Normalize pathname for comparison
  const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  
  return (
    <nav className="mb-8 -mx-6 px-6 overflow-x-auto scrollbar-hide">
      <div className="flex gap-1 min-w-max pb-2 border-b border-white/[0.08]">
        {dataPages.map((page) => {
          const isActive = normalizedPath === page.href || 
            (page.href !== '/data' && normalizedPath.startsWith(page.href));
          
          return (
            <Link
              key={page.href}
              href={page.href}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-white/[0.05] text-white border-b-2 border-blue-500 -mb-[2px]"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
              }`}
            >
              <span className="mr-1.5">{page.emoji}</span>
              {page.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Section navigation for pages with multiple sections
interface SectionNavProps {
  sections: Array<{
    id: string;
    label: string;
    emoji?: string;
  }>;
  activeSection?: string;
  onSectionChange?: (id: string) => void;
}

export function SectionNav({ sections, activeSection, onSectionChange }: SectionNavProps) {
  const handleClick = (id: string) => {
    if (onSectionChange) {
      onSectionChange(id);
    }
    // Scroll to section
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-sm -mx-6 px-6 py-3 mb-6 border-b border-white/[0.06]">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => handleClick(section.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
              activeSection === section.id
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "bg-white/[0.03] text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300 border border-white/[0.06]"
            }`}
          >
            {section.emoji && <span className="mr-1">{section.emoji}</span>}
            {section.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Breadcrumb component
export function DataBreadcrumb({ current }: { current: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
      <Link href="/data" className="hover:text-zinc-400 transition-colors">
        Data
      </Link>
      <span className="text-zinc-700">/</span>
      <span className="text-zinc-400">{current}</span>
    </div>
  );
}

// Page header component for consistency
interface PageHeaderProps {
  title: string;
  description: string;
  stats?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, stats, children }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">{title}</h1>
      <p className="text-zinc-400 mb-1">{description}</p>
      {stats && <p className="text-sm text-zinc-600">{stats}</p>}
      {children}
    </div>
  );
}
