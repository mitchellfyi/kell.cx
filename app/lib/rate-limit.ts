import { NextRequest } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number = 10, windowMs: number = 60000) { // 10 requests per minute
    this.limit = limit;
    this.windowMs = windowMs;
  }

  async check(request: NextRequest): Promise<{ error?: boolean }> {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();

    // Clean up expired entries
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });

    // Check current IP
    if (!this.store[ip]) {
      this.store[ip] = {
        count: 1,
        resetTime: now + this.windowMs
      };
      return {};
    }

    if (this.store[ip].count >= this.limit) {
      return { error: true };
    }

    this.store[ip].count++;
    return {};
  }
}

export const rateLimit = new RateLimiter();