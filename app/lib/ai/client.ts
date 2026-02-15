/**
 * AI Client Library for kell.cx
 * 
 * Provides a unified interface for AI operations with:
 * - Cost tracking and budgets
 * - Retry logic with exponential backoff
 * - Debug logging
 * - Graceful fallbacks
 */

import OpenAI from 'openai';

// Types
export interface AIConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface AIResponse<T = string> {
  success: boolean;
  data?: T;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  latencyMs?: number;
}

export interface AILogger {
  debug: (msg: string, meta?: Record<string, unknown>) => void;
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
}

// Default logger - outputs to console with timestamps
const defaultLogger: AILogger = {
  debug: (msg, meta) => {
    if (process.env.AI_DEBUG === 'true') {
      console.log(`[AI:DEBUG] ${new Date().toISOString()} ${msg}`, meta || '');
    }
  },
  info: (msg, meta) => console.log(`[AI:INFO] ${new Date().toISOString()} ${msg}`, meta || ''),
  warn: (msg, meta) => console.warn(`[AI:WARN] ${new Date().toISOString()} ${msg}`, meta || ''),
  error: (msg, meta) => console.error(`[AI:ERROR] ${new Date().toISOString()} ${msg}`, meta || ''),
};

// Cost estimates per 1M tokens (input/output)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS['gpt-4o'];
  return (promptTokens * costs.input + completionTokens * costs.output) / 1_000_000;
}

// Create OpenAI client
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    defaultLogger.warn('OPENAI_API_KEY not set');
    return null;
  }
  return new OpenAI({ apiKey });
}

// Retry with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const isRetryable = 
        error instanceof Error && 
        (error.message.includes('rate limit') || 
         error.message.includes('timeout') ||
         error.message.includes('503') ||
         error.message.includes('529'));
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }
      
      const delay = baseDelayMs * Math.pow(2, attempt);
      defaultLogger.warn(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms`, { error: lastError.message });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Generate text completion using OpenAI
 */
export async function generateCompletion(
  prompt: string,
  config: AIConfig = {},
  logger: AILogger = defaultLogger
): Promise<AIResponse<string>> {
  const startTime = Date.now();
  const model = config.model || process.env.OPENAI_MODEL || 'gpt-4o';
  
  logger.debug('Starting completion', { model, promptLength: prompt.length });
  
  const client = getOpenAIClient();
  if (!client) {
    return {
      success: false,
      error: 'OpenAI client not configured - check OPENAI_API_KEY',
    };
  }
  
  try {
    const response = await withRetry(async () => {
      // Newer models (o1, gpt-5, o3) use different parameters
      const isReasoningModel = model.includes('o1') || model.includes('gpt-5') || model.includes('o3');
      
      const params: Record<string, unknown> = {
        model,
        messages: [{ role: 'user', content: prompt }],
      };
      
      // Token limit param
      if (isReasoningModel) {
        params.max_completion_tokens = config.maxTokens || 2000;
      } else {
        params.max_tokens = config.maxTokens || 2000;
        params.temperature = config.temperature ?? 0.7;
      }
      
      return client.chat.completions.create(params as Parameters<typeof client.chat.completions.create>[0]);
    });
    
    const latencyMs = Date.now() - startTime;
    const usage = response.usage;
    const content = response.choices[0]?.message?.content || '';
    
    const result: AIResponse<string> = {
      success: true,
      data: content,
      latencyMs,
    };
    
    if (usage) {
      result.usage = {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        estimatedCost: estimateCost(model, usage.prompt_tokens, usage.completion_tokens),
      };
      
      logger.info('Completion success', {
        model,
        tokens: usage.total_tokens,
        cost: `$${result.usage.estimatedCost.toFixed(4)}`,
        latencyMs,
      });
    }
    
    return result;
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Completion failed', { error: errorMessage, latencyMs });
    
    return {
      success: false,
      error: errorMessage,
      latencyMs,
    };
  }
}

/**
 * Generate structured JSON output
 */
export async function generateJSON<T>(
  prompt: string,
  config: AIConfig = {},
  logger: AILogger = defaultLogger
): Promise<AIResponse<T>> {
  const jsonPrompt = `${prompt}

Respond with valid JSON only. No markdown, no code blocks, just the JSON object.`;

  const response = await generateCompletion(jsonPrompt, config, logger);
  
  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'No data returned',
      latencyMs: response.latencyMs,
    };
  }
  
  try {
    // Clean up common formatting issues
    let jsonStr = response.data.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();
    
    const data = JSON.parse(jsonStr) as T;
    
    return {
      success: true,
      data,
      usage: response.usage,
      latencyMs: response.latencyMs,
    };
  } catch (parseError) {
    logger.error('JSON parse failed', { 
      error: parseError instanceof Error ? parseError.message : 'Parse error',
      rawResponse: response.data.slice(0, 200),
    });
    
    return {
      success: false,
      error: 'Failed to parse AI response as JSON',
      latencyMs: response.latencyMs,
    };
  }
}

/**
 * Check if AI is available and configured
 */
export function isAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Get current AI configuration
 */
export function getAIConfig(): { model: string; available: boolean } {
  return {
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    available: isAIAvailable(),
  };
}
