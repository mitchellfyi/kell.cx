/**
 * AI-Generated Evergreen Content
 * 
 * Generates and updates tool guides, comparisons, and reports.
 */

import { generateCompletion, AIResponse } from './client';

export interface ToolGuide {
  toolId: string;
  name: string;
  overview: string;
  pricingSummary: string;
  strengths: string[];
  weaknesses: string[];
  bestFor: string;
  recentActivity: string;
  lastUpdated: string;
}

export interface ComparisonPage {
  tools: string[];
  title: string;
  introduction: string;
  pricingComparison: string;
  featureComparison: string;
  verdict: string;
  lastUpdated: string;
}

export interface TrendReport {
  period: string;
  title: string;
  marketOverview: string;
  leaders: string[];
  risers: string[];
  keyDevelopments: string[];
  outlook: string;
  lastUpdated: string;
}

const TOOL_GUIDE_PROMPT = `Generate a comprehensive guide for this AI coding tool.

TOOL: {TOOL_NAME}
DATA:
{DATA}

Write in a professional but accessible style. Include:
1. Overview (2-3 sentences describing what it does and who it's for)
2. Pricing summary (compare to alternatives)
3. 3-5 key strengths
4. 2-3 weaknesses or limitations
5. Best for (specific use cases)
6. Recent activity summary (what's been happening with this tool)

Format as:
OVERVIEW: [text]
PRICING: [text]
STRENGTHS: [bullet points separated by |]
WEAKNESSES: [bullet points separated by |]
BEST_FOR: [text]
RECENT: [text]`;

const COMPARISON_PROMPT = `Generate a comparison between these AI coding tools.

TOOLS: {TOOLS}
DATA:
{DATA}

Write a fair, data-driven comparison. Include:
1. Brief introduction (why this comparison matters)
2. Pricing comparison (specific numbers, value analysis)
3. Feature comparison (key differentiators)
4. Verdict (which to choose based on needs)

Format as:
INTRO: [text]
PRICING: [text]
FEATURES: [text]
VERDICT: [text]`;

const TREND_REPORT_PROMPT = `Generate a trend report for the AI coding tools market.

PERIOD: {PERIOD}
DATA:
{DATA}

Write an insightful market analysis. Include:
1. Market overview (current state, key themes)
2. Top 3-5 market leaders
3. Rising/emerging tools
4. 3-5 key developments
5. Outlook for next period

Format as:
OVERVIEW: [text]
LEADERS: [comma-separated]
RISERS: [comma-separated]
DEVELOPMENTS: [bullet points separated by |]
OUTLOOK: [text]`;

/**
 * Generate a tool guide
 */
export async function generateToolGuide(
  toolId: string,
  toolName: string,
  data: unknown
): Promise<AIResponse<ToolGuide>> {
  const prompt = TOOL_GUIDE_PROMPT
    .replace('{TOOL_NAME}', toolName)
    .replace('{DATA}', JSON.stringify(data, null, 2).slice(0, 4000));

  const response = await generateCompletion(prompt, { maxTokens: 2000, temperature: 0.6 });

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to generate tool guide',
      latencyMs: response.latencyMs,
    };
  }

  const text = response.data;
  
  // Parse structured response
  const getSection = (label: string): string => {
    const match = text.match(new RegExp(`${label}:\\s*([\\s\\S]*?)(?=(?:OVERVIEW|PRICING|STRENGTHS|WEAKNESSES|BEST_FOR|RECENT):|$)`));
    return match?.[1]?.trim() || '';
  };

  const parseList = (text: string): string[] => 
    text.split('|').map(s => s.trim()).filter(Boolean);

  return {
    success: true,
    data: {
      toolId,
      name: toolName,
      overview: getSection('OVERVIEW'),
      pricingSummary: getSection('PRICING'),
      strengths: parseList(getSection('STRENGTHS')),
      weaknesses: parseList(getSection('WEAKNESSES')),
      bestFor: getSection('BEST_FOR'),
      recentActivity: getSection('RECENT'),
      lastUpdated: new Date().toISOString(),
    },
    usage: response.usage,
    latencyMs: response.latencyMs,
  };
}

/**
 * Generate a comparison page
 */
export async function generateComparison(
  tools: string[],
  data: unknown
): Promise<AIResponse<ComparisonPage>> {
  const prompt = COMPARISON_PROMPT
    .replace('{TOOLS}', tools.join(' vs '))
    .replace('{DATA}', JSON.stringify(data, null, 2).slice(0, 5000));

  const response = await generateCompletion(prompt, { maxTokens: 2000, temperature: 0.6 });

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to generate comparison',
      latencyMs: response.latencyMs,
    };
  }

  const text = response.data;
  
  const getSection = (label: string): string => {
    const match = text.match(new RegExp(`${label}:\\s*([\\s\\S]*?)(?=(?:INTRO|PRICING|FEATURES|VERDICT):|$)`));
    return match?.[1]?.trim() || '';
  };

  return {
    success: true,
    data: {
      tools,
      title: `${tools.join(' vs ')}: Complete Comparison`,
      introduction: getSection('INTRO'),
      pricingComparison: getSection('PRICING'),
      featureComparison: getSection('FEATURES'),
      verdict: getSection('VERDICT'),
      lastUpdated: new Date().toISOString(),
    },
    usage: response.usage,
    latencyMs: response.latencyMs,
  };
}

/**
 * Generate a trend report
 */
export async function generateTrendReport(
  period: string,
  data: unknown
): Promise<AIResponse<TrendReport>> {
  const prompt = TREND_REPORT_PROMPT
    .replace('{PERIOD}', period)
    .replace('{DATA}', JSON.stringify(data, null, 2).slice(0, 6000));

  const response = await generateCompletion(prompt, { maxTokens: 2000, temperature: 0.6 });

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to generate trend report',
      latencyMs: response.latencyMs,
    };
  }

  const text = response.data;
  
  const getSection = (label: string): string => {
    const match = text.match(new RegExp(`${label}:\\s*([\\s\\S]*?)(?=(?:OVERVIEW|LEADERS|RISERS|DEVELOPMENTS|OUTLOOK):|$)`));
    return match?.[1]?.trim() || '';
  };

  return {
    success: true,
    data: {
      period,
      title: `State of AI Coding Tools - ${period}`,
      marketOverview: getSection('OVERVIEW'),
      leaders: getSection('LEADERS').split(',').map(s => s.trim()).filter(Boolean),
      risers: getSection('RISERS').split(',').map(s => s.trim()).filter(Boolean),
      keyDevelopments: getSection('DEVELOPMENTS').split('|').map(s => s.trim()).filter(Boolean),
      outlook: getSection('OUTLOOK'),
      lastUpdated: new Date().toISOString(),
    },
    usage: response.usage,
    latencyMs: response.latencyMs,
  };
}
