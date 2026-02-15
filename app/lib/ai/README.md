# AI Integration Architecture

This directory contains the server-side AI infrastructure for generating insights and analysis without external dependencies.

## Architecture

### Core Components

1. **AI Service** (`service.ts`)
   - Main interface for AI operations
   - Supports text and structured data generation
   - Built-in caching and rate limiting

2. **Configuration** (`config.ts`)
   - Model configurations
   - Rate limits and cache settings
   - Environment variable validation

3. **Rate Limiter** (`rate-limiter.ts`)
   - Per-minute, per-day, and per-month limits
   - Token usage tracking
   - Graceful error handling

4. **Cache Manager** (`cache.ts`)
   - In-memory caching with TTL
   - Automatic eviction when full
   - Cache statistics

5. **Middleware** (`middleware.ts`)
   - Error handling
   - Request tracking
   - API key validation

## API Endpoints

### Generate Insights
```
POST /api/ai/insights
```

Request:
```json
{
  "data": {
    "competitors": [
      { "name": "Company A", "metrics": {...} }
    ],
    "market": {...},
    "trends": [...]
  },
  "type": "competitive"
}
```

Response:
```json
{
  "insights": [
    "Market share has grown 15% YoY",
    "Competitor A launching new product line"
  ],
  "confidence": 0.85,
  "metadata": {
    "generatedAt": "2024-01-01T00:00:00Z",
    "model": "claude-3-5-sonnet-20241022",
    "cached": false
  }
}
```

### Generate Analysis
```
POST /api/ai/analyze
```

Request:
```json
{
  "type": "competitive",
  "context": "Q4 2024 market analysis",
  "data": {...}
}
```

Response:
```json
{
  "success": true,
  "analysis": {
    "summary": "...",
    "strengths": ["..."],
    "weaknesses": ["..."],
    "opportunities": ["..."],
    "threats": ["..."],
    "recommendations": [
      {
        "priority": "high",
        "action": "...",
        "impact": "...",
        "timeframe": "..."
      }
    ]
  }
}
```

## Usage Examples

### Basic Text Generation
```typescript
import { AIService } from '@/lib/ai';

const text = await AIService.generateText(
  'Summarize this data: ...',
  { model: 'summary', temperature: 0.5 }
);
```

### Structured Data Generation
```typescript
import { AIService } from '@/lib/ai';
import { z } from 'zod';

const schema = z.object({
  title: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
});

const result = await AIService.generateObject(
  'Analyze this report: ...',
  schema,
  { model: 'analysis' }
);
```

### With Caching
```typescript
const insights = await AIService.generateInsights(data, {
  cacheKey: `insights:${dataId}`,
  cacheTtl: 3600, // 1 hour
});
```

## Configuration

### Environment Variables

Required:
- `ANTHROPIC_API_KEY`: Your Anthropic API key

Optional:
- `AI_MODEL_INSIGHTS`: Model for insights (default: claude-3-5-sonnet-20241022)
- `AI_MODEL_SUMMARY`: Model for summaries (default: claude-3-5-haiku-20241022)
- `AI_MODEL_ANALYSIS`: Model for analysis (default: claude-3-5-sonnet-20241022)
- `AI_RATE_LIMIT_PER_MINUTE`: Requests per minute (default: 10)
- `AI_RATE_LIMIT_PER_DAY`: Requests per day (default: 1000)
- `AI_TOKEN_LIMIT_PER_MONTH`: Tokens per month (default: 1000000)

### Cost Management

1. **Caching**: Responses are cached by default to reduce API calls
2. **Rate Limiting**: Built-in limits prevent excessive usage
3. **Model Selection**: Use smaller models for simple tasks
4. **Token Tracking**: Monitor usage through the GET endpoints

## Error Handling

The service provides detailed error responses:

- `400`: Invalid request data
- `401`: Invalid or missing API key
- `429`: Rate limit exceeded
- `500`: Service error

Example error response:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded: 10 requests per minute",
    "details": { "resetIn": 45000 }
  }
}
```

## Future Enhancements

- Phase 2: Build-time content generation
- Phase 3: Real-time features (search, Q&A)
- Redis/KV backing for distributed caching
- WebSocket support for streaming responses
- Fine-tuning support for domain-specific tasks