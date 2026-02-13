# Briefing (kell.cx) — Product Requirements Document

## Problem

The current site is vibe-coded static HTML. Every page has different styling, headers don't match, mobile is broken. Data goes stale because there's no systematic refresh. This isn't sustainable and doesn't represent quality work.

## Goals

1. **Consistent, polished UI** — shared components for layout, nav, footer
2. **Fresh data** — automated pipelines that keep information current
3. **Sustainable development** — proper engineering, not one-off HTML files
4. **Iteration loops** — dev process that catches issues before Mitchell does

---

## Architecture Decision

### Framework: **Next.js 14 + App Router**
- Server components for data fetching
- Shared layouts enforce consistency
- Easy deployment to Vercel

### Styling: **Tailwind CSS + shadcn/ui**
- Utility-first CSS prevents style drift
- shadcn gives polished, accessible components
- Dark mode built-in

### Data Layer
- JSON files for static data (refreshed by cron jobs)
- Server-side fetch for real-time data
- Separate data collection scripts from presentation

---

## Data Freshness Strategy

### Sources to integrate
1. **LLM-stats.com** — hourly AI news, model releases, benchmarks
2. **GitHub API** — stars, releases, activity
3. **Company blogs/changelogs** — Anthropic, OpenAI, Google announcements
4. **Aider leaderboard** — benchmark scores
5. **HN API** — mentions and discussions

### Collection cadence
- **Hourly**: News headlines, HN mentions
- **Daily**: GitHub stats, benchmark scores, releases
- **Weekly**: Pricing changes (requires manual verification)

### Implementation
- Cron jobs run data collection scripts
- Scripts output to `/data/*.json`
- Next.js reads JSON at build/request time
- Stale data triggers alerts

---

## Dev Process

### Option A: Ralph (autonomous loop)
- Set up PRD → Ralph runs Claude Code in loop until done
- Good for: big feature builds, overnight work
- Risk: can go off-rails without checkpoints

### Option B: Doyaken (task-based)
- Break work into discrete tasks
- `dk run 3` executes 3 tasks with fresh context each
- Good for: incremental progress, clear accountability
- Already installed and configured

### Decision: **Use Doyaken for this rebuild**
- Tasks provide clear checkpoints
- Can review after each task
- Better for learning what works

---

## Implementation Plan

### Phase 1: Foundation (Day 1)
- [ ] Initialize Next.js 14 project with TypeScript
- [ ] Set up Tailwind CSS + shadcn/ui
- [ ] Create shared layout (header, nav, footer)
- [ ] Deploy skeleton to Vercel
- [ ] Migrate homepage content

### Phase 2: Data Pages (Day 2-3)
- [ ] Create data page components (tables, cards, stats)
- [ ] Migrate: /data/index, pricing, benchmarks, github
- [ ] Set up data fetching from JSON files
- [ ] Ensure mobile responsiveness

### Phase 3: Data Pipelines (Day 3-4)
- [ ] Consolidate existing scraper scripts
- [ ] Add benchmark data collection (Aider, SWE-bench)
- [ ] Add news feed integration
- [ ] Set up cron jobs for automated refresh
- [ ] Add staleness alerts

### Phase 4: Polish (Day 5)
- [ ] QA all pages on mobile
- [ ] Fix any style inconsistencies
- [ ] Add loading states
- [ ] Performance optimization
- [ ] Documentation

---

## Success Criteria

1. **Consistency**: Header/nav/footer identical on every page
2. **Mobile**: All pages work on mobile without horizontal scroll
3. **Freshness**: Benchmark data < 24h old, news < 1h old
4. **Alerts**: I get notified when data goes stale
5. **Process**: Can add new data page in < 30 minutes

---

## Next Action

Initialize Doyaken project and create tasks for Phase 1.
