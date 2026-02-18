import Link from "next/link";
import { DataNav, DataBreadcrumb } from "@/components/data-nav";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

// Load latest jobs data
function loadJobsData() {
  // Try content directory first (Vercel), then parent directory (local dev)
  const contentDir = join(process.cwd(), "content", "briefings", "data");
  const legacyDir = join(process.cwd(), "..", "briefing", "data");
  
  const briefingDataDir = existsSync(contentDir) ? contentDir : legacyDir;
  
  try {
    if (!existsSync(briefingDataDir)) return {};
    
    // Find the latest jobs file
    const files = readdirSync(briefingDataDir)
      .filter(f => f.startsWith('jobs-') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    if (files.length === 0) return {};
    
    const latestFile = join(briefingDataDir, files[0]);
    return JSON.parse(readFileSync(latestFile, "utf8"));
  } catch {
    return {};
  }
}

function loadInsights() {
  // Try content directory first (Vercel), then parent directory (local dev)
  const contentPath = join(process.cwd(), "content", "data", "insights.json");
  const legacyPath = join(process.cwd(), "..", "data", "insights.json");
  
  const path = existsSync(contentPath) ? contentPath : legacyPath;
  
  if (existsSync(path)) {
    try {
      const data = JSON.parse(readFileSync(path, "utf8"));
      return data.hiring || data.market || [];
    } catch {
      return [];
    }
  }
  return [];
}

interface JobData {
  company: string;
  careersUrl?: string;
  estimatedCount?: number;
  roles?: string[];
  signals?: string[];
  status?: string;
  scrapedAt?: string;
}

const jobsData = loadJobsData() as Record<string, JobData>;
const insights = loadInsights();

// Process jobs data
const companies = Object.entries(jobsData).map(([id, data]) => ({
  id,
  name: data.company,
  careersUrl: data.careersUrl,
  count: data.estimatedCount || 0,
  roles: data.roles || [],
  signals: data.signals || [],
  status: data.status,
  scrapedAt: data.scrapedAt,
})).filter(c => c.status !== 'error').sort((a, b) => b.count - a.count);

const totalJobs = companies.reduce((sum, c) => sum + c.count, 0);
const hiringCompanies = companies.filter(c => c.count > 0);

export const metadata = {
  title: "AI Coding Tool Hiring — Kell",
  description: "Who's hiring in AI coding tools. Track open roles across major companies.",
};

export default function HiringPage() {
  const lastUpdated = companies[0]?.scrapedAt
    ? new Date(companies[0].scrapedAt).toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "Recently";

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <DataNav />
      <DataBreadcrumb current="Data" />
      <div className="hidden">
        <Link href="/data" className="text-sm text-zinc-500 hover:text-zinc-400">
          ← Back to Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight mb-2">Who&apos;s Hiring</h1>
      <p className="text-zinc-400 mb-1">Open roles at AI coding tool companies</p>
      <p className="text-sm text-zinc-600 mb-6">
        {companies.length} companies tracked · Last updated: {lastUpdated}
      </p>

      {/* Key Insights */}
      <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-5 mb-8">
        <h2 className="text-xs uppercase tracking-wide text-green-400 mb-4">Key Insights</h2>
        <ul className="space-y-2 text-sm text-zinc-300">
          <li>
            <strong className="text-white">{totalJobs}+</strong> open roles across{" "}
            <strong className="text-white">{hiringCompanies.length}</strong> companies
          </li>
          {hiringCompanies[0] && (
            <li>
              <strong className="text-white">{hiringCompanies[0].name}</strong> is hiring the most: {hiringCompanies[0].count}+ roles
            </li>
          )}
          {hiringCompanies[0]?.signals?.[0] && (
            <li>{hiringCompanies[0].signals[0]}</li>
          )}
          {insights.slice(0, 2).map((insight: string, i: number) => (
            <li key={i}>{insight}</li>
          ))}
        </ul>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard value={`${totalJobs}+`} label="Open Roles" />
        <StatCard value={String(hiringCompanies.length)} label="Actively Hiring" />
        <StatCard value={String(companies.length)} label="Companies Tracked" />
        <StatCard value={hiringCompanies[0]?.name?.split(' ')[0] || "—"} label="Top Hiring" />
      </div>

      {/* Companies */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-4 pb-2 border-b border-white/[0.08]">
          All Companies
        </h2>
        <div className="space-y-4">
          {companies.map((company) => (
            <div
              key={company.id}
              className="p-4 bg-white/[0.02] rounded-lg border border-white/[0.04] hover:border-white/[0.08]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <a
                    href={company.careersUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-white hover:text-blue-400"
                  >
                    {company.name}
                  </a>
                  {company.signals.length > 0 && (
                    <p className="text-sm text-green-400 mt-1">{company.signals[0]}</p>
                  )}
                  {company.roles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {company.roles.slice(0, 3).map((role: string, i: number) => (
                        <p key={i} className="text-sm text-zinc-500">• {role}</p>
                      ))}
                      {company.roles.length > 3 && (
                        <p className="text-sm text-zinc-600">+ {company.roles.length - 3} more</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {company.count > 0 ? (
                    <>
                      <span className="text-2xl font-bold text-green-400">{company.count}</span>
                      <span className="text-xs text-zinc-500 block">open roles</span>
                    </>
                  ) : (
                    <span className="text-sm text-zinc-600">No data</span>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.04]">
                <a
                  href={company.careersUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  View careers page ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Note for job seekers */}
      <div className="bg-white/[0.02] border border-white/[0.08] rounded-lg p-5 mb-8">
        <h3 className="text-sm font-medium text-white mb-2">For Job Seekers</h3>
        <p className="text-sm text-zinc-400">
          These are the hottest companies in AI coding tools right now. 
          High role counts typically indicate rapid growth and more opportunities.
          Click through to each careers page for current openings.
        </p>
      </div>

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-white/[0.08] text-xs text-zinc-600">
        <p>
          Job data collected from company career pages. Role counts are estimates based on page content.
          Updated daily at 05:00 UTC.
        </p>
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="p-4 bg-white/[0.02] border border-white/[0.08] rounded-lg text-center">
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
    </div>
  );
}
