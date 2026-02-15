"use client";

import { useState } from "react";

interface SearchResult {
  title: string;
  description: string;
  url: string;
  type: 'tool' | 'news' | 'release' | 'benchmark';
}

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => SearchResult[];
}

export function SearchBar({ placeholder = "Search AI coding tools...", onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.length >= 2 && onSearch) {
      const searchResults = onSearch(value);
      setResults(searchResults);
      setIsOpen(searchResults.length > 0);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-colors text-sm"
        />
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-white/10 rounded-lg shadow-xl overflow-hidden">
          {results.slice(0, 8).map((result, i) => (
            <a
              key={i}
              href={result.url}
              className="block px-4 py-3 hover:bg-white/[0.05] border-b border-white/[0.05] last:border-0"
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center gap-2">
                <TypeBadge type={result.type} />
                <span className="font-medium text-white text-sm">{result.title}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{result.description}</p>
            </a>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-white/10 rounded-lg p-4 text-center">
          <p className="text-sm text-zinc-500">No results found for &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    tool: "bg-blue-500/20 text-blue-400",
    news: "bg-orange-500/20 text-orange-400",
    release: "bg-green-500/20 text-green-400",
    benchmark: "bg-purple-500/20 text-purple-400",
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${styles[type] || "bg-zinc-500/20 text-zinc-400"}`}>
      {type}
    </span>
  );
}

// Quick search utilities
export function createSearchIndex(data: {
  tools?: Array<{ name: string; website?: string; notes?: string }>;
  news?: Array<{ title: string; url: string; source?: string }>;
  releases?: Array<{ company: string; tag: string; url: string }>;
}) {
  return function search(query: string): SearchResult[] {
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search tools
    data.tools?.forEach(tool => {
      if (tool.name.toLowerCase().includes(q) || tool.notes?.toLowerCase().includes(q)) {
        results.push({
          title: tool.name,
          description: tool.notes || `Visit ${tool.website}`,
          url: `/data/pricing`,
          type: 'tool',
        });
      }
    });

    // Search news
    data.news?.forEach(item => {
      if (item.title.toLowerCase().includes(q)) {
        results.push({
          title: item.title,
          description: item.source || 'News',
          url: item.url,
          type: 'news',
        });
      }
    });

    // Search releases
    data.releases?.forEach(release => {
      if (release.company.toLowerCase().includes(q) || release.tag.toLowerCase().includes(q)) {
        results.push({
          title: `${release.company} ${release.tag}`,
          description: 'GitHub Release',
          url: release.url,
          type: 'release',
        });
      }
    });

    return results.slice(0, 20);
  };
}
