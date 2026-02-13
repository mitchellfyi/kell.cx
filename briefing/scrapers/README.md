# Briefing Scrapers

## Overview

Data collection for competitive intelligence on AI coding tools.

## Scraper Types

### REST-based (run standalone via cron)
- `jobs.js` - LinkedIn job posts via DuckDuckGo, careers pages
- `discord.js` - Discord server stats (member counts, engagement)
- `github-activity.js` - GitHub stars, commits, releases

### Browser-based (run via agent session)
- `social-browser.js` - Twitter/X profiles (requires browser automation)

## Browser Automation Notes

Some sites block headless browsers (Cloudflare bot detection):
- ❌ Glassdoor - blocked
- ❌ Indeed - blocked  
- ❌ Wellfound - blocked
- ✅ Twitter/X - works
- ✅ YC Work at a Startup - works

Browser-based scrapers must be run through the Kell agent session using the browser tool, not as standalone scripts. The `social-browser.js` file documents the extraction logic but can't call the browser control server directly.

## Data Output

All scrapers save to `../data/<type>/`:
- `<type>-YYYY-MM-DD.json` - dated snapshots
- `<type>-latest.json` - most recent data

## Integration

The daily briefing pipeline (`../daily-briefing.js`) aggregates data from all sources.

Twitter data is collected when running through an agent session that has browser access.
