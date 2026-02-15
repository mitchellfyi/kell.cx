export const AI_CONFIG = {
  // Model configurations
  models: {
    insights: 'claude-3-5-sonnet-20241022', // For generating competitive insights
    summary: 'claude-3-5-haiku-20241022',    // For quick summaries and simple tasks
    analysis: 'claude-3-5-sonnet-20241022',  // For deep analysis
  },

  // Rate limiting
  rateLimits: {
    requestsPerMinute: 10,
    requestsPerDay: 1000,
    tokensPerMonth: 1000000,
  },

  // Caching
  cache: {
    ttl: 3600, // 1 hour default TTL
    maxSize: 100, // Max cached items
  },

  // Error handling
  retry: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,
  },
} as const;

// Environment variable validation
export function validateApiKey(): string | undefined {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // During build time or if not set, return undefined
  if (!apiKey || process.env.NODE_ENV === 'development') {
    return undefined;
  }

  if (!apiKey.startsWith('sk-ant-')) {
    console.warn('Warning: ANTHROPIC_API_KEY may have invalid format');
  }

  return apiKey;
}