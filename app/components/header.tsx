"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { href: "/tools", label: "Tools" },
  { href: "/compare", label: "Compare" },
  { href: "/trends", label: "Trends" },
  { href: "/data", label: "Data" },
  { href: "/data/pricing", label: "Pricing" },
  { href: "/archive", label: "Archive" },
  { href: "/about", label: "About" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="border-b border-white/10 sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-white hover:text-white/90 flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <span>Kell</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex md:items-center md:gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                isActive(link.href)
                  ? "text-white bg-white/[0.05]"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden p-2 text-zinc-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 px-6 py-4 space-y-1 bg-zinc-950">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                isActive(link.href)
                  ? "text-white bg-white/[0.05]"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          
          {/* Quick links in mobile */}
          <div className="pt-3 mt-3 border-t border-white/10">
            <div className="text-xs text-zinc-600 uppercase tracking-wide mb-2 px-3">Quick Access</div>
            <div className="grid grid-cols-2 gap-1">
              <Link
                href="/data/benchmarks"
                className="px-3 py-2 text-xs text-zinc-500 hover:text-white hover:bg-white/[0.03] rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                🏆 Benchmarks
              </Link>
              <Link
                href="/data/pricing"
                className="px-3 py-2 text-xs text-zinc-500 hover:text-white hover:bg-white/[0.03] rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                💰 Pricing
              </Link>
              <Link
                href="/data/models"
                className="px-3 py-2 text-xs text-zinc-500 hover:text-white hover:bg-white/[0.03] rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                🤖 Models
              </Link>
              <Link
                href="/data/releases"
                className="px-3 py-2 text-xs text-zinc-500 hover:text-white hover:bg-white/[0.03] rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                🚀 Releases
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
