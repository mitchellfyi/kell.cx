# Taskboard

> Last updated: 2026-02-15 08:50 UTC

## Current Sprint: Data Quality & Automation

### ✅ Done
- [x] GitHub Actions daily data refresh workflow (05:00 UTC)
- [x] Wire up /data page with real data sources
- [x] Add source attribution links to all stats
- [x] Dynamic timestamps on data page

### 🔄 In Progress
- [ ] First data refresh running (GitHub Actions triggered)

### 📋 Up Next

**P1 - Data Freshness (This Week)**
- [ ] Verify all scripts run successfully in GitHub Actions
- [ ] Add missing data sources to workflow (arxiv, bluesky, devto)
- [ ] Fix any scripts writing to wrong directories (data/ vs site/data/)
- [ ] Add data validation to catch stale/broken sources

**P2 - New Tool Discovery**
- [ ] Auto-flag new AI coding tools from Product Hunt
- [ ] Track new repos gaining stars in AI coding category
- [ ] Monitor HuggingFace for new coding-relevant models
- [ ] Add Anthropic/OpenAI changelog RSS to news feed

**P3 - UI Polish**
- [ ] Add more drill-down pages (/data/vscode, /data/releases, etc.)
- [ ] Show "data as of X hours ago" on each section
- [ ] Add sparklines/mini charts for trends
- [ ] Mobile responsiveness pass

**P4 - Email Briefings**
- [ ] Test daily briefing generation
- [ ] Set up subscriber delivery (after manual testing)
- [ ] Add "subscribe" CTA to data pages

---

## Data Sources Status

| Source | Script | Frequency | Status |
|--------|--------|-----------|--------|
| VS Code Marketplace | collect-vscode-stats.js | Daily | ✅ |
| GitHub Releases | collect-releases.js | Daily | ✅ |
| GitHub Stats | collect-github-stats.js | Daily | ✅ |
| Hacker News | collect-hn-mentions.js | Daily | ✅ |
| npm Downloads | collect-npm-downloads.js | Daily | ✅ |
| PyPI Stats | collect-pypi-stats.js | Daily | ✅ |
| Homebrew | collect-homebrew-stats.js | Daily | ✅ |
| Reddit | collect-reddit-stats.js | Daily | ✅ |
| Stack Overflow | collect-stackoverflow-trends.js | Daily | ✅ |
| G2 Reviews | collect-g2-reviews.js | Daily | ✅ |
| Product Hunt | (in data) | Manual | ⚠️ |
| HuggingFace | (in data) | Manual | ⚠️ |
| ArXiv | (in data) | Manual | ⚠️ |

---

## Quick Commands

```bash
# Run data refresh locally
node scripts/collect-releases.js
node scripts/aggregate-news.js

# Regenerate taskboard
doyaken tasks

# Check workflow status
gh run list --workflow=daily-data-refresh.yml
```
