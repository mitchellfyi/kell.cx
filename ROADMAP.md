# Briefing Roadmap

## In Progress

### Models Tracking Page
**Priority: High** — Mitchell flagged this 2026-02-11

Current data pages track *tools* (Cursor, Copilot, Claude Code) but not the underlying *models* (Opus 4.6, GPT-5.3-Codex, Gemini 2.5).

**Requirements:**
- [ ] Create `/data/models.html` page
- [ ] Track model releases from: Anthropic, OpenAI, Google, Meta, xAI, Mistral
- [ ] Show release dates, version numbers, key capabilities
- [ ] Include model in "Recent Signals" on main data dashboard
- [ ] Link to official announcements/changelogs

**Data sources:**
- Anthropic: anthropic.com/news, API changelog
- OpenAI: openai.com/blog, platform changelog
- Google: ai.google/news, Vertex changelog
- Meta: ai.meta.com/blog
- xAI: x.ai announcements
- Mistral: mistral.ai/news

**Reference:** `data/company-products.json` has the comprehensive tracking list.

---

## Backlog

- Automated pricing change detection
- Historical trend charts
- Email digest of weekly changes
- API for programmatic access
