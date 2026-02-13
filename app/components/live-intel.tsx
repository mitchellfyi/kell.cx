"use client";

import { useEffect, useState } from "react";

interface IntelStat {
  icon: string;
  value: string;
  label: string;
  subject: string;
}

interface IntelData {
  generatedAt: string;
  featured: IntelStat[];
}

const defaultStats: IntelStat[] = [
  { icon: "📊", value: "71.2M", label: "VS Code installs", subject: "GitHub Copilot" },
  { icon: "💼", value: "98+", label: "Open roles", subject: "Lovable" },
  { icon: "⭐", value: "4.76", label: "Top rated", subject: "Codeium" },
  { icon: "🎯", value: "15", label: "Competitors tracked", subject: "AI coding tools" },
];

export function LiveIntel() {
  const [stats, setStats] = useState<IntelStat[]>(defaultStats);
  const [lastUpdated, setLastUpdated] = useState<string>("Updated just now");

  useEffect(() => {
    async function loadIntel() {
      try {
        const res = await fetch("/data/live-intel.json");
        if (!res.ok) return;
        const data: IntelData = await res.json();

        if (data.featured?.length) {
          setStats(data.featured);
        }

        if (data.generatedAt) {
          const mins = Math.round((Date.now() - new Date(data.generatedAt).getTime()) / 60000);
          setLastUpdated(
            mins < 5 ? "Updated just now" :
            mins < 60 ? `Updated ${mins}m ago` :
            mins < 1440 ? `Updated ${Math.round(mins / 60)}h ago` :
            "Updated recently"
          );
        }
      } catch {
        // Fail silently, use default stats
      }
    }

    loadIntel();
  }, []);

  return (
    <div className="text-left mb-10 p-6 bg-gradient-to-br from-red-500/5 to-red-500/[0.02] rounded-xl border border-red-500/20">
      <h3 className="text-xs uppercase tracking-wide text-red-400 mb-4 flex items-center gap-3">
        🔴 Live Intel
        <span className="text-[10px] bg-red-500/15 px-2 py-1 rounded normal-case tracking-normal text-red-300">
          {lastUpdated}
        </span>
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white/[0.03] rounded-lg p-4 text-center">
            <div className="text-xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">{stat.label}</div>
            <div className="text-xs text-zinc-600 mt-1">{stat.subject}</div>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-600 text-center mt-4">
        Real data from our monitoring.{" "}
        <a href="/data" className="text-blue-400 hover:text-blue-300">
          See live dashboard →
        </a>
      </p>
    </div>
  );
}
