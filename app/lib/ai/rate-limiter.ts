interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
  tokensPerMonth: number;
}

interface RateLimitState {
  minute: { count: number; resetAt: number };
  day: { count: number; resetAt: number };
  month: { tokens: number; resetAt: number };
}

export class RateLimiter {
  private state: RateLimitState = {
    minute: { count: 0, resetAt: 0 },
    day: { count: 0, resetAt: 0 },
    month: { tokens: 0, resetAt: 0 },
  };

  constructor(private config: RateLimitConfig) {}

  async checkLimit(): Promise<void> {
    const now = Date.now();

    // Check minute limit
    if (now >= this.state.minute.resetAt) {
      this.state.minute = {
        count: 0,
        resetAt: now + 60 * 1000, // 1 minute
      };
    }

    if (this.state.minute.count >= this.config.requestsPerMinute) {
      const waitTime = this.state.minute.resetAt - now;
      throw new Error(
        `Rate limit exceeded: ${this.config.requestsPerMinute} requests per minute. Wait ${Math.ceil(
          waitTime / 1000
        )} seconds.`
      );
    }

    // Check day limit
    if (now >= this.state.day.resetAt) {
      this.state.day = {
        count: 0,
        resetAt: now + 24 * 60 * 60 * 1000, // 24 hours
      };
    }

    if (this.state.day.count >= this.config.requestsPerDay) {
      throw new Error(
        `Daily rate limit exceeded: ${this.config.requestsPerDay} requests per day.`
      );
    }

    // Increment counters
    this.state.minute.count++;
    this.state.day.count++;
  }

  updateTokenUsage(tokens: number): void {
    const now = Date.now();

    // Check month limit
    if (now >= this.state.month.resetAt) {
      this.state.month = {
        tokens: 0,
        resetAt: new Date(
          now + 30 * 24 * 60 * 60 * 1000
        ).setDate(1), // First day of next month
      };
    }

    this.state.month.tokens += tokens;

    if (this.state.month.tokens >= this.config.tokensPerMonth) {
      throw new Error(
        `Monthly token limit exceeded: ${this.config.tokensPerMonth} tokens per month.`
      );
    }
  }

  getUsage(): {
    minute: { used: number; limit: number; resetIn: number };
    day: { used: number; limit: number; resetIn: number };
    month: { tokensUsed: number; limit: number; resetIn: number };
  } {
    const now = Date.now();

    return {
      minute: {
        used: this.state.minute.count,
        limit: this.config.requestsPerMinute,
        resetIn: Math.max(0, this.state.minute.resetAt - now),
      },
      day: {
        used: this.state.day.count,
        limit: this.config.requestsPerDay,
        resetIn: Math.max(0, this.state.day.resetAt - now),
      },
      month: {
        tokensUsed: this.state.month.tokens,
        limit: this.config.tokensPerMonth,
        resetIn: Math.max(0, this.state.month.resetAt - now),
      },
    };
  }
}