# AI-Powered Insight Generation

This system replaces rule-based trend detection with AI-powered analysis that generates compelling daily insights automatically.

## Overview

The AI insight system analyzes data from multiple sources (HN discussions, VS Code extensions, GitHub releases, hiring data, pricing changes) to:
- Identify meaningful patterns and connections
- Explain *why* trends matter, not just *what* happened
- Generate human-readable narratives
- Discover insights humans might miss

## Key Components

### 1. AI Insight Generator (`scripts/lib/ai-insights.js`)
- Uses Claude API to analyze data and generate insights
- Builds comprehensive prompts with all data sources
- Returns structured JSON with categorized insights
- Falls back gracefully if API unavailable

### 2. Cross-Source Analyzer (`scripts/lib/cross-source-analyzer.js`)
- Detects patterns across different data sources:
  - **Expansion signals**: Companies hiring + releasing + growing installs
  - **Competitive moves**: Multiple companies making similar changes
  - **Market shifts**: Category growth, momentum changes
  - **Sentiment mismatches**: User concerns vs adoption trends
  - **Emerging themes**: Hot topics in discussions

### 3. Enhanced Scripts
- `briefing/detect-trends.js`: Now uses AI to identify meaningful trends
- `scripts/generate-insights.js`: Prefers Claude API, falls back to OpenAI or rules

## Usage

### Environment Setup
```bash
# Required for AI insights
export ANTHROPIC_API_KEY=your-claude-api-key

# Optional: specify model
export ANTHROPIC_MODEL=claude-3-5-sonnet-latest

# Alternative: OpenAI fallback
export OPENAI_API_KEY=your-openai-key
```

### Running the System

1. **Generate AI insights**:
   ```bash
   node scripts/generate-insights.js
   ```

2. **Detect trends with AI**:
   ```bash
   node briefing/detect-trends.js
   ```

3. **Demo the capabilities**:
   ```bash
   node scripts/demo-ai-insights.js
   ```

## Example Output

### Cross-Source Pattern
```json
{
  "type": "expansion",
  "company": "GitHub",
  "message": "GitHub showing strong expansion signals: 7+ new positions, 2 recent releases, 8686K install growth",
  "strength": 7
}
```

### AI-Generated Insight
```json
{
  "summary": "GitHub Copilot maintains dominant market position with 71M+ installs while newer AI coding agents like Cline and Continue show rapid growth, amid industry concerns about AI agent reliability",
  "vscode": [
    "GitHub Copilot dominates with 71.4M installs, representing 7x larger than all other tracked tools combined",
    "Newer AI agent tools (Cline at 3.1M with 45.3% growth) indicate market appetite for alternatives"
  ],
  "market": [
    "The market shows clear bifurcation: GitHub's ecosystem versus fragmented alternatives growing fastest",
    "Enterprise focus evident in LiteLLM's Opus 4.6 integration, indicating parallel consumer vs enterprise tracks"
  ]
}
```

## How It Works

1. **Data Collection**: System loads data from various scrapers
2. **Pattern Detection**: Cross-source analyzer finds connections
3. **AI Analysis**: Claude analyzes all data to generate insights
4. **Narrative Generation**: AI creates compelling stories explaining trends
5. **Output**: Structured insights saved as JSON for briefings

## Benefits

- **Deeper Analysis**: Goes beyond simple threshold detection
- **Context Understanding**: Explains market implications
- **Cross-Source Intelligence**: Connects dots humans might miss
- **Narrative Quality**: Generates briefing-ready content
- **Adaptive**: Learns from all available data sources

## Fallback Behavior

If AI APIs are unavailable, the system:
1. Uses cross-source pattern analysis
2. Falls back to rule-based detection
3. Still generates useful (though less nuanced) insights

This ensures the system remains functional even without API access.