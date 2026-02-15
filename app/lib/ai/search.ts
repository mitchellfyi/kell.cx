/**
 * AI-Powered Search & Natural Language Queries
 * 
 * Handles natural language questions about AI coding tools.
 * Designed for use in serverless/edge functions.
 */

import { generateCompletion, AIResponse } from './client';

export interface SearchResult {
  answer: string;
  sources: string[];
  confidence: 'high' | 'medium' | 'low';
  relatedTopics: string[];
}

export interface SearchContext {
  pricing?: unknown;
  releases?: unknown;
  hnStories?: unknown;
  benchmarks?: unknown;
  hiring?: unknown;
}

const SEARCH_PROMPT = `You are an AI assistant that answers questions about AI coding tools.

Use ONLY the following data to answer the question. If the data doesn't contain enough information, say so.

CONTEXT DATA:
{CONTEXT}

USER QUESTION: {QUESTION}

Provide:
1. A clear, concise answer based on the data
2. List specific data sources used (e.g., "pricing data", "HN mentions")
3. Rate your confidence: high (data directly answers), medium (inference needed), low (limited data)
4. Suggest 2-3 related topics the user might want to explore

Format your response as:
ANSWER: [Your answer here]
SOURCES: [comma-separated list]
CONFIDENCE: [high/medium/low]
RELATED: [comma-separated topics]`;

const COMPARISON_PROMPT = `Compare these AI coding tools based on the provided data.

TOOLS TO COMPARE: {TOOLS}

DATA:
{DATA}

Provide a clear, factual comparison covering:
- Pricing differences
- Key features/strengths
- Best use cases
- Any notable recent activity

Format your response as a structured comparison that's easy to scan.`;

/**
 * Answer a natural language question about AI coding tools
 */
export async function answerQuestion(
  question: string,
  context: SearchContext
): Promise<AIResponse<SearchResult>> {
  const contextStr = JSON.stringify(context, null, 2).slice(0, 8000);
  
  const prompt = SEARCH_PROMPT
    .replace('{CONTEXT}', contextStr)
    .replace('{QUESTION}', question);

  const response = await generateCompletion(prompt, { maxTokens: 1500, temperature: 0.5 });

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to generate answer',
      latencyMs: response.latencyMs,
    };
  }

  // Parse the structured response
  const text = response.data;
  const answerMatch = text.match(/ANSWER:\s*([\s\S]*?)(?=SOURCES:|$)/);
  const sourcesMatch = text.match(/SOURCES:\s*(.*?)(?=CONFIDENCE:|$)/);
  const confidenceMatch = text.match(/CONFIDENCE:\s*(high|medium|low)/i);
  const relatedMatch = text.match(/RELATED:\s*(.*?)$/);

  return {
    success: true,
    data: {
      answer: answerMatch?.[1]?.trim() || text,
      sources: sourcesMatch?.[1]?.split(',').map(s => s.trim()).filter(Boolean) || [],
      confidence: (confidenceMatch?.[1]?.toLowerCase() as 'high' | 'medium' | 'low') || 'medium',
      relatedTopics: relatedMatch?.[1]?.split(',').map(s => s.trim()).filter(Boolean) || [],
    },
    usage: response.usage,
    latencyMs: response.latencyMs,
  };
}

/**
 * Generate a comparison between tools
 */
export async function compareTools(
  tools: string[],
  data: unknown
): Promise<AIResponse<string>> {
  const prompt = COMPARISON_PROMPT
    .replace('{TOOLS}', tools.join(' vs '))
    .replace('{DATA}', JSON.stringify(data, null, 2).slice(0, 6000));

  const response = await generateCompletion(prompt, { maxTokens: 1500, temperature: 0.5 });

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to generate comparison',
      latencyMs: response.latencyMs,
    };
  }

  return {
    success: true,
    data: response.data,
    usage: response.usage,
    latencyMs: response.latencyMs,
  };
}

/**
 * Pre-generate common questions and answers
 * For static sites, these can be generated at build time
 */
export const COMMON_QUESTIONS = [
  "What's the cheapest AI coding tool?",
  "Which AI coding tool is best for VS Code?",
  "Compare Cursor vs GitHub Copilot",
  "What AI coding tools have free tiers?",
  "Which tools support local/self-hosted models?",
  "What's happening in the AI coding tools market?",
];

/**
 * Generate static FAQ from common questions
 */
export async function generateFAQ(
  context: SearchContext
): Promise<Array<{ question: string; answer: string }>> {
  const faq: Array<{ question: string; answer: string }> = [];

  for (const question of COMMON_QUESTIONS) {
    const result = await answerQuestion(question, context);
    if (result.success && result.data) {
      faq.push({
        question,
        answer: result.data.answer,
      });
    }
    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return faq;
}
