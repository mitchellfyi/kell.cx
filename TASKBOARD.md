# Taskboard

> Last updated: 2026-02-15 09:40 UTC

## ✅ Completed

### Infrastructure
- [x] GitHub Actions daily data refresh (05:00 UTC)
- [x] OpenAI insights generation (OPENAI_API_KEY + OPENAI_MODEL)
- [x] RESEND_API_KEY for briefing emails
- [x] Master list of tracked companies/tools/models
- [x] GitHub Trending collector
- [x] All secrets configured

### Data Pages (All with Key Insights, pulling from real JSON)
- [x] `/data` — Dashboard
- [x] `/data/pricing` — Dynamic pricing  
- [x] `/data/vscode` — VS Code stats
- [x] `/data/releases` — GitHub releases
- [x] `/data/hackernews` — HN mentions
- [x] `/data/news` — 48h headlines
- [x] `/data/opensource` — Trending repos
- [x] `/data/benchmarks` — Aider + LMArena
- [x] `/data/models` — All providers
- [x] `/data/hiring` — Job counts

### UX
- [x] Homepage clarity ("AI Coding Tools Intelligence")
- [x] Tabs component created
- [x] Email tables fixed (full-width)
- [x] Blog removed from nav
- [x] Home page links to data pages

---

## 🔄 In Progress

- [ ] Workflow running (collecting data)

---

## 📋 Remaining

- [ ] Apply Tabs component to multi-section pages
- [ ] Social commentary aggregation (Reddit/Bluesky)
- [ ] Twitter/X high-profile posts tracking
- [ ] Add more companies to master list as discovered

---

## Data Flow

```
Daily at 05:00 UTC:
1. collect-*.js scripts run (10 collectors)
2. aggregate-news.js combines sources  
3. collect-github-trending.js finds new repos
4. generate-insights.js (OpenAI) creates AI insights
5. git commit + push → Vercel deploys
6. send-briefing-to-subscribers.js emails waitlist
```

---

## Secrets Status

| Secret | Status |
|--------|--------|
| GH_PAT | ✅ |
| OPENAI_API_KEY | ✅ |
| RESEND_API_KEY | ✅ |
| MITCHELL_PAT | ✅ |
| CLAUDE_CODE_OAUTH_TOKEN | ✅ |

| Variable | Value |
|----------|-------|
| OPENAI_MODEL | (configured) |
