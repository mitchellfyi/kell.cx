# AI Content Summarization & Sentiment Analysis Feature

## Overview

This feature adds AI-powered content summarization and sentiment analysis for various data sources, starting with Hacker News discussions about AI coding tools.

## Components

### 1. AI Content Analyzer Service (`briefing/services/ai-content-analyzer.js`)
- Provides content summarization using Claude API
- Performs sentiment analysis with scores from -1.0 to 1.0
- Tracks sentiment trends over time
- Supports HN stories, release notes, and articles

### 2. Enhanced HN Scraper (`scrapers/hn-ai-enhanced.js`)
- Extends the existing HN scraper with AI analysis
- Fetches discussion comments for context
- Caches summaries to avoid re-analyzing
- Maintains 30-day sentiment history

### 3. Enhanced HN Page UI (`app/app/data/hackernews/page.tsx`)
- Displays AI-generated summaries inline with stories
- Shows sentiment badges (positive/negative/mixed/neutral)
- Includes key quotes from discussions
- Adds sentiment analysis section with trends

## Data Format

### HN Summary Object
```json
{
  "storyId": "46978710",
  "summary": "Users report Claude Code quality degradation after recent updates. Common complaints include worse code suggestions and slower responses.",
  "sentiment": "negative",
  "sentimentScore": -0.45,
  "keyQuotes": [
    "The code completions are noticeably worse than a month ago",
    "Feels like they're cost-cutting on inference"
  ],
  "competitiveImplication": "Potential opportunity for Cursor/Copilot to capture dissatisfied users",
  "analyzedAt": "2026-02-15T10:30:00Z"
}
```

### Sentiment Trend Object
```json
{
  "trend": "declining",
  "average": -0.12,
  "recentAverage": -0.35,
  "shifts": [
    {
      "date": "2026-02-14",
      "direction": "negative",
      "magnitude": 0.23
    }
  ]
}
```

## Usage

### Running the Enhanced Scraper

```bash
# Set the Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run the enhanced scraper
node scrapers/hn-ai-enhanced.js
```

### API Key Configuration

The feature requires an Anthropic API key to be set as an environment variable:
- `ANTHROPIC_API_KEY`: Your Anthropic API key for Claude access

If no API key is provided, the scraper will still collect stories but skip AI analysis.

## Features

### Current Implementation
- ✅ HN story summarization for high-engagement content (50+ points)
- ✅ Sentiment analysis with visual badges
- ✅ Key quote extraction from discussions
- ✅ Competitive implication analysis
- ✅ 30-day sentiment trend tracking
- ✅ Summary caching to reduce API calls

### Future Enhancements
- Release notes analysis for GitHub releases
- News article summarization
- Real-time sentiment alerts
- Cross-platform sentiment comparison
- Daily briefing integration

## Cost Considerations

- Uses Claude 3 Haiku model for efficiency
- Analyzes only stories with 50+ points to limit API calls
- Caches all summaries to avoid re-analysis
- Estimated cost: ~$0.01-0.02 per analyzed story

## Testing

To test the implementation:

1. Set up environment variables
2. Run the enhanced scraper: `node scrapers/hn-ai-enhanced.js`
3. Check output files:
   - `data/hn-ai-mentions.json` - Main data with summaries
   - `data/hn-summaries.json` - Summary cache
   - `data/hn-sentiment-history.json` - Historical sentiment data
4. View the updated UI at `/data/hackernews`

## Integration Points

The feature integrates with:
- Existing HN data collection pipeline
- Daily briefing generation
- Data visualization pages
- Future alert systems for significant sentiment shifts