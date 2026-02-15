# Taskboard

> Last updated: 2026-02-15 09:25 UTC

## Current Sprint: Complete Data Infrastructure

### ✅ Done Today
- [x] GitHub Actions daily data refresh (05:00 UTC)
- [x] Wire up /data page with real data + source links
- [x] Key Insights at top of every drill-down page
- [x] Master list of tracked companies/tools/models (data/master-list.json)
- [x] Convert pricing blog → /data/pricing (dynamic)
- [x] Create /data/news (24-48h headlines, ranked)
- [x] Create /data/opensource (GitHub trending, releases)
- [x] GitHub Trending collector script
- [x] AI insights generator (Claude API)
- [x] Briefing automation in workflow
- [x] Homepage clarity (AI Coding Tools Intelligence)

### 🔄 In Progress
- [ ] Workflow running (collecting + insight generation)
- [ ] Need to add ANTHROPIC_API_KEY + RESEND_API_KEY to repo secrets

### 📋 Next Up

**P1 - Complete Automation**
- [ ] Add GitHub repo secrets: ANTHROPIC_API_KEY, RESEND_API_KEY
- [ ] Test full workflow with briefing send
- [ ] Verify insights are generated correctly

**P2 - Data Pages**
- [ ] /data/benchmarks (Aider + LMArena leaderboards)
- [ ] /data/models (all providers + pricing)
- [ ] /data/hiring (jobs by company + listings)
- [ ] Social commentary page (Reddit + Twitter + Bluesky)

**P3 - UX Improvements**
- [ ] Tabs component for multi-section pages
- [ ] Full-width email tables
- [ ] Remove blog, redirect to data pages
- [ ] More consistent key insights formatting

---

## Data Sources Status

| Source | Script | Automated | Status |
|--------|--------|-----------|--------|
| VS Code Marketplace | collect-vscode-stats.js | ✅ | Working |
| GitHub Releases | collect-releases.js | ✅ | Working |
| GitHub Stats | collect-github-stats.js | ✅ | Working |
| GitHub Trending | collect-github-trending.js | ✅ | New |
| Hacker News | collect-hn-mentions.js | ✅ | Working |
| npm Downloads | collect-npm-downloads.js | ✅ | Working |
| PyPI Stats | collect-pypi-stats.js | ✅ | Working |
| Homebrew | collect-homebrew-stats.js | ✅ | Working |
| Reddit | collect-reddit-stats.js | ✅ | Working |
| Stack Overflow | collect-stackoverflow-trends.js | ✅ | Working |
| G2 Reviews | collect-g2-reviews.js | ✅ | Working |
| News Aggregation | aggregate-news.js | ✅ | Working |
| AI Insights | generate-insights.js | ✅ | New |

---

## Page Status

| Page | Data Source | Status |
|------|------------|--------|
| /data | Dashboard | ✅ Live |
| /data/pricing | pricing.json | ✅ Live |
| /data/vscode | vscode-stats.json | ✅ Live |
| /data/releases | github-releases.json | ✅ Live |
| /data/hackernews | hn-ai-mentions.json | ✅ Live |
| /data/news | latest-news.json + hn | ✅ Live |
| /data/opensource | github-trending.json | ✅ Live |
| /data/benchmarks | aider-benchmark.json | 🔄 Hardcoded |
| /data/models | model-releases.json | 🔄 Hardcoded |
| /data/hiring | - | 🔄 Hardcoded |
