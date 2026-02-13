# Kell Launch Plan

*Created: 2026-02-13*
*Status: Soft Launch (internal)*

## Current Phase: Soft Launch

**Duration:** ~1 week starting 2026-02-13
**Subscribers:** Mitchell only
**Goal:** Validate digest quality, fix consistency issues, polish UX

---

## Decisions Made

### Competitor Targeting (for digests)
**Approach:** Inference + Override
- Default: Brief on all companies we currently track
- Future: Signup asks for company URL → we infer competitors → they can customize

### Pricing (needs decision)
- Pricing page shows: Free ($0) + Pro ($29/mo "Coming Soon")
- Originally discussed: Starter $49, Growth $149, Scale $499
- **Question for Mitchell:** Which pricing model?

### Data Freshness
- Benchmarks: Daily refresh
- Pricing: Daily (hourly for Scale tier later)

### Outreach
- **NO cold outreach until Mitchell signs off**
- Soft launch = organic only

---

## Mitchell's Preferences

- **Briefing scope:** All companies currently tracked
- **Feedback loop:** Direct via Slack
- **Launch approval:** Required before going public

---

## Website Audit Results (2026-02-13)

### ❌ Consistency Issues Found

1. **Page width varies wildly**
   - Home: `max-w-xl` (narrow)
   - About: `max-w-2xl`
   - Pricing: `max-w-3xl`
   - Data: `max-w-4xl` (wide)
   - **Fix:** Standardize to `max-w-2xl` or `max-w-3xl` for content, `max-w-4xl` for data-heavy pages

2. **Heading sizes inconsistent**
   - Home: `text-4xl`
   - Other pages: `text-3xl`
   - **Fix:** Pick one (recommend `text-3xl` everywhere)

3. **Border opacity chaos**
   - Uses: `border-white/[0.04]`, `border-white/[0.06]`, `border-white/[0.08]`, `border-white/[0.15]`
   - **Fix:** Standardize to 2-3 values (e.g., `0.05` for subtle, `0.10` for normal, `0.15` for emphasis)

4. **Email address mismatch**
   - Footer: `hi@kell.cx`
   - About page: `hello@kell.cx`
   - **Fix:** Pick one (recommend `hi@kell.cx`)

5. **Navigation inconsistency**
   - "← Back to home" only on About page
   - **Fix:** Either add to all pages or remove

6. **Broken/missing links**
   - `/sample` — linked from home, doesn't exist
   - `/blog/state-of-ai-coding-2026` — linked but may not exist
   - `/blog/ai-coding-tool-pricing-2026` — linked but may not exist
   - `/leaderboard` — linked from Data page
   - `/data/hiring` — in drill-down grid but may not exist
   - `/data/models` — in drill-down grid but may not exist
   - **Fix:** Create pages or remove links

7. **Data staleness**
   - Data page says "Last refresh: Feb 11, 2026" (hardcoded)
   - **Fix:** Make dynamic or remove

### ✅ What's Working

- Layout, header, footer are consistent
- Dark theme is cohesive
- Mobile responsive (header has mobile menu)
- Good typography hierarchy within pages
- Card/section styling is mostly consistent
- Waitlist form component is reused

---

## Priority Fixes (Do This Week)

### P0 — Blocking for soft launch
- [ ] Fix broken `/sample` link (create page or remove link)
- [ ] Fix email mismatch (`hi@kell.cx` vs `hello@kell.cx`)
- [ ] Verify daily digest sends to Mitchell

### P1 — Polish before feedback
- [ ] Standardize page widths
- [ ] Standardize border opacities
- [ ] Create or fix missing blog post links
- [ ] Remove or create `/leaderboard` page

### P2 — Nice to have
- [ ] Add "Back to home" consistently or remove from About
- [ ] Make data refresh timestamp dynamic
- [ ] Add missing data sub-pages (hiring, models)

---

## Pre-Public Launch Checklist

- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] Auth system (signup/login)
- [ ] Payment integration
- [ ] Email verification
- [ ] Subscriber preference management
- [ ] Unsubscribe flow
- [ ] Contact/support page

---

## Soft Launch Tasks (This Week)

1. **Daily digest to Mitchell** — start tomorrow
2. **Fix P0 issues** — today/tomorrow
3. **Fix P1 issues** — by end of week
4. **Collect feedback** — iterate based on Mitchell's input
5. **Document what companies we track** — for briefing scope

---

## Companies Currently Tracked

*To be populated — need to check scrapers/data sources*

---

## Notes

*Add learnings and decisions here as we go*

- 2026-02-13: Initial audit complete. Site design is good but has consistency issues across pages. Core functionality (waitlist, data pages) works. Need to fix broken links before Mitchell tests.
