import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { AI_CONFIG, validateApiKey } from './config';
import { RateLimiter } from './rate-limiter';
import { CacheManager } from './cache';

// Initialize Anthropic client lazily
let anthropic: ReturnType<typeof createAnthropic> | null = null;

function getAnthropic() {
  if (!anthropic) {
    const apiKey = validateApiKey();
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    anthropic = createAnthropic({ apiKey });
  }
  return anthropic;
}

// Initialize rate limiter and cache
const rateLimiter = new RateLimiter(AI_CONFIG.rateLimits);
const cacheManager = new CacheManager();

// Types
export interface GenerateOptions {
  model?: keyof typeof AI_CONFIG.models;
  temperature?: number;
  cache?: boolean;
  cacheKey?: string;
  cacheTtl?: number;
}

// Main AI service class
export class AIService {
  /**
   * Generate text using AI
   */
  static async generateText(
    prompt: string,
    options: GenerateOptions = {}
  ): Promise<string> {
    const {
      model = 'insights',
      temperature = 0.7,
      cache = true,
      cacheKey,
      cacheTtl = AI_CONFIG.cache.ttl,
    } = options;

    // Check cache if enabled
    if (cache && cacheKey) {
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        return cached as string;
      }
    }

    // Check rate limit
    await rateLimiter.checkLimit();

    // Generate text
    const { text } = await generateText({
      model: getAnthropic()(AI_CONFIG.models[model]),
      prompt,
      temperature,
    });

    // Cache result if enabled
    if (cache && cacheKey) {
      await cacheManager.set(cacheKey, text, cacheTtl);
    }

    return text;
  }

  /**
   * Generate structured data using AI
   */
  static async generateObject<T>(
    prompt: string,
    schema: z.ZodType<T>,
    options: GenerateOptions = {}
  ): Promise<T> {
    const {
      model = 'analysis',
      temperature = 0.3,
      cache = true,
      cacheKey,
      cacheTtl = AI_CONFIG.cache.ttl,
    } = options;

    // Check cache if enabled
    if (cache && cacheKey) {
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        return cached as T;
      }
    }

    // Check rate limit
    await rateLimiter.checkLimit();

    // Generate object
    const { object } = await generateObject({
      model: getAnthropic()(AI_CONFIG.models[model]),
      prompt,
      schema,
      temperature,
    });

    // Cache result if enabled
    if (cache && cacheKey) {
      await cacheManager.set(cacheKey, object, cacheTtl);
    }

    return object;
  }

  /**
   * Generate competitive insights
   */
  static async generateInsights(data: any): Promise<string> {
    const prompt = `
      Analyze the following competitive data and provide strategic insights:

      ${JSON.stringify(data, null, 2)}

      Provide 3-5 key insights that are:
      1. Actionable
      2. Data-driven
      3. Strategic
      4. Specific to the competitive landscape

      Format as concise bullet points.
    `;

    return this.generateText(prompt, {
      model: 'insights',
      temperature: 0.7,
      cacheKey: `insights:${JSON.stringify(data)}`,
    });
  }
}