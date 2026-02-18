# Kell Priorities

**Last updated:** 2026-02-15 22:00 UTC
**Goal:** First paying customer

---

## P0 — Do Now

1. **Live testing phase** ✅ COMPLETING TODAY
   - Need 5 days of live testing before any real outreach
   - Track: Digest deliveries, site stability, subscriber flow
   - Started: 2026-02-14
   - **Day 5/5 (2026-02-18)**: Final day of testing
   - Status: Site 200 ✓, Digest cron healthy (last OK: 2026-02-17 06:00 UTC)
   - All 4 previous days: No incidents, all digests delivered
   - Outreach unlocks after today's 06:00 UTC digest completes successfully

---

## P1 — This Week

2. ~~**Add missing pages**~~ ✅
   - /about, /blog, /pricing (top-level), /data/github, /data/vscode
   - Status: DONE (2026-02-13)

3. **Daily digest actually sends**
   - ✅ Digest generator: scripts/generate-daily-digest.js
   - ✅ Email service: ~/clawd/services/email/send.js (Resend)
   - ✅ Waitlist: 1 subscriber (Mitchell, for testing)
   - Status: LIVE - first delivery scheduled for 06:00 UTC tomorrow

---

## P2 — Next

5. **Content that drives signups**
   - Blog posts, comparisons, analysis
   - Status: 3 posts live (added "Cursor vs Windsurf vs Copilot" comparison 2026-02-14)

---

## P4 → P1 (unlocks 2026-02-18 after 06:00 UTC digest)

4. **Outreach to potential customers**
   - ✅ Swyx draft ready (outreach/drafts/swyx-latentspace.md)
   - ⏳ Unlocks after 5-day test completes (today, after 06:00 UTC digest)
   - Mitchell explicitly asked for this delay on 2026-02-14
   - When unlocked: Confirm with Mitchell before sending first outreach

---

## Blocked

_Nothing currently blocked. If something blocks, ask Mitchell._

---

## Recently Completed

- [x] Add comparison blog post (2026-02-14) — "Cursor vs Windsurf vs Copilot" for SEO/signups
- [x] Fix blog post pages (2026-02-13) — Added full content for /blog/state-of-ai-coding-2026 and /blog/ai-coding-tool-pricing-2026
- [x] Add missing pages (2026-02-13) — /about, /blog, /pricing, /data/github, /data/vscode
- [x] Wire real data into Next.js app (2026-02-13) — benchmarks and pricing now read from JSON
- [x] Deploy Next.js app to kell.cx (2026-02-12)
- [x] Build 8 data pages with consistent layout
- [x] Create master company/product list
- [x] Deep research on AI coding landscape
