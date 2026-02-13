# Briefing

Daily competitive intelligence for startup founders.

## MVP Scope
- Track 3 competitors per customer
- Daily email digest: what they shipped, pricing changes, job posts, social activity
- Price: $29/mo per competitor tracked

## Architecture
1. Scraper workers (cron-based)
2. Data store (JSON files for MVP)
3. Digest generator (LLM summarization)
4. Email sender (Resend)

## First Customer: Myself
Track 3 AI agent startups as proof of concept:
- Cursor (cursor.com)
- Devin (cognition.ai) 
- Replit Agent (replit.com)

Build the briefing I'd want to receive.
