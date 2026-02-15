/**
 * AI-Powered Competitive Analysis Engine
 * 
 * Generates competitive analysis, threat scores, and strategic insights.
 */

import { generateJSON, AIResponse } from './client';

export interface CompetitiveAlert {
  type: 'pricing' | 'feature' | 'positioning' | 'funding' | 'hiring';
  tool: string;
  headline: string;
  change: string;
  strategicRead: string;
  userImpact: string;
  opportunity?: string;
  threatLevel: 'high' | 'medium' | 'low';
  generatedAt: string;
}

export interface MarketAnalysis {
  date: string;
  marketLeaders: string[];
  emergingThreats: string[];
  pricingTrends: string;
  hiringSignals: string;
  strategicOutlook: string;
  generatedAt: string;
}

export interface ToolComparison {
  tools: string[];
  comparisonDate: string;
  pricingSummary: string;
  featureHighlights: string[];
  recommendations: {
    bestValue: string;
    bestFeatures: string;
    bestForEnterprise: string;
  };
  generatedAt: string;
}

const COMPETITIVE_ALERT_PROMPT = `Analyze this competitive intelligence data and generate an alert.

Event Type: {TYPE}
Tool: {TOOL}
Data:
{DATA}

Generate a competitive analysis alert with:
1. A clear headline summarizing the change
2. What exactly changed
3. Strategic interpretation (what this means for the market)
4. How this impacts users/customers
5. Potential opportunity for competitors
6. Threat level: high (major market shift), medium (notable change), low (minor update)

Respond with JSON:
{
  "headline": "string",
  "change": "string",
  "strategicRead": "string",
  "userImpact": "string",
  "opportunity": "string or null",
  "threatLevel": "high|medium|low"
}`;

const MARKET_ANALYSIS_PROMPT = `Analyze the current state of the AI coding tools market based on this data.

Pricing Data:
{PRICING}

Release Activity:
{RELEASES}

Hiring Data:
{HIRING}

Provide a market analysis:
1. Current market leaders (top 3-5)
2. Emerging threats or rising competitors
3. Pricing trends (are prices going up/down, any patterns)
4. What hiring patterns suggest about company strategies
5. Strategic outlook for the next quarter

Respond with JSON:
{
  "marketLeaders": ["string"],
  "emergingThreats": ["string"],
  "pricingTrends": "string",
  "hiringSignals": "string",
  "strategicOutlook": "string"
}`;

const TOOL_COMPARISON_PROMPT = `Compare these AI coding tools for a developer trying to choose.

Tools to compare: {TOOLS}

Pricing info:
{PRICING}

Feature highlights from recent releases/news:
{FEATURES}

Provide:
1. Brief pricing summary comparing the tools
2. Key feature differentiators (3-5 points)
3. Recommendations for different use cases

Respond with JSON:
{
  "pricingSummary": "string",
  "featureHighlights": ["string"],
  "recommendations": {
    "bestValue": "string",
    "bestFeatures": "string",
    "bestForEnterprise": "string"
  }
}`;

/**
 * Generate a competitive alert for a specific event
 */
export async function generateCompetitiveAlert(
  type: CompetitiveAlert['type'],
  tool: string,
  data: Record<string, unknown>
): Promise<AIResponse<CompetitiveAlert>> {
  const prompt = COMPETITIVE_ALERT_PROMPT
    .replace('{TYPE}', type)
    .replace('{TOOL}', tool)
    .replace('{DATA}', JSON.stringify(data, null, 2));

  const response = await generateJSON<Omit<CompetitiveAlert, 'type' | 'tool' | 'generatedAt'>>(
    prompt,
    { maxTokens: 1000, temperature: 0.6 }
  );

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to generate competitive alert',
      latencyMs: response.latencyMs,
    };
  }

  return {
    success: true,
    data: {
      type,
      tool,
      ...response.data,
      generatedAt: new Date().toISOString(),
    },
    usage: response.usage,
    latencyMs: response.latencyMs,
  };
}

/**
 * Generate market analysis from multiple data sources
 */
export async function generateMarketAnalysis(
  pricing: unknown,
  releases: unknown,
  hiring: unknown
): Promise<AIResponse<MarketAnalysis>> {
  const prompt = MARKET_ANALYSIS_PROMPT
    .replace('{PRICING}', JSON.stringify(pricing, null, 2).slice(0, 2000))
    .replace('{RELEASES}', JSON.stringify(releases, null, 2).slice(0, 2000))
    .replace('{HIRING}', JSON.stringify(hiring, null, 2).slice(0, 1000));

  const response = await generateJSON<Omit<MarketAnalysis, 'date' | 'generatedAt'>>(
    prompt,
    { maxTokens: 1500, temperature: 0.6 }
  );

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to generate market analysis',
      latencyMs: response.latencyMs,
    };
  }

  return {
    success: true,
    data: {
      date: new Date().toISOString().split('T')[0],
      ...response.data,
      generatedAt: new Date().toISOString(),
    },
    usage: response.usage,
    latencyMs: response.latencyMs,
  };
}

/**
 * Generate a comparison between specific tools
 */
export async function generateToolComparison(
  tools: string[],
  pricing: unknown,
  features: unknown
): Promise<AIResponse<ToolComparison>> {
  const prompt = TOOL_COMPARISON_PROMPT
    .replace('{TOOLS}', tools.join(', '))
    .replace('{PRICING}', JSON.stringify(pricing, null, 2).slice(0, 2000))
    .replace('{FEATURES}', JSON.stringify(features, null, 2).slice(0, 1500));

  const response = await generateJSON<Omit<ToolComparison, 'tools' | 'comparisonDate' | 'generatedAt'>>(
    prompt,
    { maxTokens: 1200, temperature: 0.6 }
  );

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to generate tool comparison',
      latencyMs: response.latencyMs,
    };
  }

  return {
    success: true,
    data: {
      tools,
      comparisonDate: new Date().toISOString().split('T')[0],
      ...response.data,
      generatedAt: new Date().toISOString(),
    },
    usage: response.usage,
    latencyMs: response.latencyMs,
  };
}
