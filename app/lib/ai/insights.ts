/**
 * AI-Powered Insight Generation
 * 
 * Generates daily insights by analyzing scraped data from multiple sources.
 */

import { generateJSON, AIResponse } from './client';

export interface DailyInsight {
  headline: string;
  summary: string;
  significance: 'high' | 'medium' | 'low';
  sources: string[];
  category: 'release' | 'trend' | 'pricing' | 'hiring' | 'community' | 'benchmark';
}

export interface DailyInsightsResponse {
  date: string;
  insights: DailyInsight[];
  marketSummary: string;
  generatedAt: string;
}

export interface DataSources {
  hnStories?: Array<{ title: string; points: number; comments: number; url: string }>;
  releases?: Array<{ company: string; tag: string; publishedAt: string }>;
  hiring?: Array<{ company: string; openRoles: number; change?: number }>;
  pricing?: Array<{ tool: string; price: number; tier: string }>;
  benchmarks?: Array<{ model: string; score: number; rank: number }>;
}

const INSIGHT_PROMPT = `You are an AI industry analyst specializing in AI coding tools. Analyze the following data and identify the 3-5 most important insights.

For each insight:
- Write a concise headline (under 10 words)
- Provide a 1-2 sentence summary explaining what happened and why it matters
- Rate significance as high/medium/low based on industry impact
- List the relevant data sources
- Categorize as: release, trend, pricing, hiring, community, or benchmark

Also provide a brief market summary (2-3 sentences) capturing the overall state of AI coding tools today.

DATA:
{DATA}

Respond with this exact JSON structure:
{
  "insights": [
    {
      "headline": "string",
      "summary": "string",
      "significance": "high|medium|low",
      "sources": ["string"],
      "category": "release|trend|pricing|hiring|community|benchmark"
    }
  ],
  "marketSummary": "string"
}`;

/**
 * Generate daily insights from multiple data sources
 */
export async function generateDailyInsights(
  data: DataSources
): Promise<AIResponse<DailyInsightsResponse>> {
  const dataStr = JSON.stringify(data, null, 2);
  const prompt = INSIGHT_PROMPT.replace('{DATA}', dataStr);
  
  const response = await generateJSON<{ insights: DailyInsight[]; marketSummary: string }>(
    prompt,
    { maxTokens: 8000, temperature: 0.7 }  // Higher limit for reasoning models
  );
  
  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to generate insights',
      latencyMs: response.latencyMs,
    };
  }
  
  return {
    success: true,
    data: {
      date: new Date().toISOString().split('T')[0],
      insights: response.data.insights,
      marketSummary: response.data.marketSummary,
      generatedAt: new Date().toISOString(),
    },
    usage: response.usage,
    latencyMs: response.latencyMs,
  };
}

/**
 * Summarize a HN discussion thread
 */
export async function summarizeHNThread(
  title: string,
  points: number,
  topComments: string[]
): Promise<AIResponse<{ summary: string; sentiment: 'positive' | 'negative' | 'mixed' | 'neutral'; keyPoints: string[] }>> {
  const prompt = `Summarize this Hacker News discussion about AI coding tools.

Title: ${title}
Points: ${points}
Top Comments:
${topComments.slice(0, 10).map((c, i) => `${i + 1}. ${c}`).join('\n')}

Provide:
1. A 2-3 sentence summary of the discussion
2. Overall sentiment (positive, negative, mixed, or neutral)
3. 3-5 key points or takeaways

Respond with JSON:
{
  "summary": "string",
  "sentiment": "positive|negative|mixed|neutral",
  "keyPoints": ["string"]
}`;

  return generateJSON(prompt, { maxTokens: 500, temperature: 0.5 });
}

/**
 * Analyze a release and explain its significance
 */
export async function analyzeRelease(
  company: string,
  version: string,
  changelog: string
): Promise<AIResponse<{ summary: string; significance: string; userImpact: string }>> {
  const prompt = `Analyze this software release for AI coding tools.

Company: ${company}
Version: ${version}
Changelog:
${changelog.slice(0, 2000)}

Provide:
1. A brief summary of what changed (1-2 sentences)
2. Why this release is significant (or not)
3. How it impacts users

Respond with JSON:
{
  "summary": "string",
  "significance": "string",
  "userImpact": "string"
}`;

  return generateJSON(prompt, { maxTokens: 400, temperature: 0.5 });
}
