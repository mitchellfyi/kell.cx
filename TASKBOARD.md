# Taskboard

> Last updated: 2026-02-15 09:35 UTC

## ✅ Completed Today

### Infrastructure
- [x] GitHub Actions daily data refresh (05:00 UTC)
- [x] RESEND_API_KEY added to repo secrets
- [x] Claude Code CLI integration for AI insights
- [x] Master list of tracked companies/tools/models
- [x] GitHub Trending collector
- [x] AI insights generator

### Pages (All with Key Insights at top, pulling from real data)
- [x] `/data` — Dashboard with live stats
- [x] `/data/pricing` — Dynamic pricing comparison  
- [x] `/data/vscode` — VS Code extension stats
- [x] `/data/releases` — GitHub releases
- [x] `/data/hackernews` — HN mentions
- [x] `/data/news` — Last 48h headlines
- [x] `/data/opensource` — Trending repos
- [x] `/data/benchmarks` — Aider + LMArena leaderboards
- [x] `/data/models` — All providers
- [x] `/data/hiring` — Job counts by company

### Content
- [x] Homepage clarity ("AI Coding Tools Intelligence")
- [x] Converted pricing blog → dynamic page

---

## 🔄 In Progress

- [ ] Workflow running (testing fixed git commit)

---

## 📋 Remaining Tasks

**P2 - UX Polish**
- [ ] Tabs component for multi-section pages
- [ ] Full-width email tables
- [ ] Remove blog section (redirect to data pages)
- [ ] Social commentary page (Reddit + Bluesky aggregation)

**P3 - Data Quality**
- [ ] Add more companies to master-list.json as discovered
- [ ] Improve jobs scraping (some return 0)
- [ ] Add Twitter/X high-profile posts

---

## Data Flow

```
Daily at 05:00 UTC:
1. collect-*.js scripts run
2. aggregate-news.js combines sources  
3. generate-insights.js creates AI insights
4. git commit + push
5. Vercel auto-deploys
6. send-briefing-to-subscribers.js emails waitlist
```

---

## Secrets Status

| Secret | Status |
|--------|--------|
| GH_PAT | ✅ |
| CLAUDE_CODE_OAUTH_TOKEN | ✅ |
| RESEND_API_KEY | ✅ |
| MITCHELL_PAT | ✅ |
