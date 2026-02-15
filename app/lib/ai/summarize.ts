/**
 * AI Content Summarization & Sentiment Analysis
 * 
 * Summarizes HN discussions, release notes, and news articles.
 * Tracks sentiment for AI coding tools.
 */

import { generateJSON, AIResponse } from './client';

export interface HNSummary {
  storyId: string;
  title: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'mixed' | 'neutral';
  keyPoints: string[];
  toolsMentioned: string[];
  competitiveImplication?: string;
  generatedAt: string;
}

export interface ReleaseSummary {
  repo: string;
  version: string;
  summary: string;
  significance: 'major' | 'minor' | 'patch';
  breakingChanges: boolean;
  highlights: string[];
  userImpact: string;
}

export interface SentimentData {
  tool: string;
  date: string;
  sentiment: number; // -1 to 1
  volume: number;
  sources: string[];
}

const HN_SUMMARY_PROMPT = `Analyze this Hacker News discussion about AI coding tools.

Story: {TITLE}
Points: {POINTS}
URL: {URL}

Provide a concise analysis:
1. A 2-3 sentence summary of the discussion and main viewpoints
2. Overall sentiment: positive, negative, mixed, or neutral
3. 3-5 key points or takeaways from the discussion
4. Any AI coding tools specifically mentioned
5. (Optional) Competitive implications for the AI coding tools market

Respond with JSON:
{
  "summary": "string",
  "sentiment": "positive|negative|mixed|neutral",
  "keyPoints": ["string"],
  "toolsMentioned": ["string"],
  "competitiveImplication": "string or null"
}`;

const RELEASE_SUMMARY_PROMPT = `Analyze this software release for an AI coding tool.

Repository: {REPO}
Version: {VERSION}
Release Notes:
{NOTES}

Provide:
1. A brief summary of what changed (2-3 sentences)
2. Significance level: major (new features/breaking), minor (improvements), or patch (fixes)
3. Whether there are breaking changes
4. Top 3-5 highlights
5. How this impacts users

Respond with JSON:
{
  "summary": "string",
  "significance": "major|minor|patch",
  "breakingChanges": boolean,
  "highlights": ["string"],
  "userImpact": "string"
}`;

/**
 * Summarize a Hacker News story
 */
export async function summarizeHNStory(
  storyId: string,
  title: string,
  points: number,
  url: string
): Promise<AIResponse<HNSummary>> {
  const prompt = HN_SUMMARY_PROMPT
    .replace('{TITLE}', title)
    .replace('{POINTS}', String(points))
    .replace('{URL}', url);

  const response = await generateJSON<Omit<HNSummary, 'storyId' | 'title' | 'generatedAt'>>(
    prompt,
    { maxTokens: 1000, temperature: 0.5 }
  );

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to summarize HN story',
      latencyMs: response.latencyMs,
    };
  }

  return {
    success: true,
    data: {
      storyId,
      title,
      ...response.data,
      generatedAt: new Date().toISOString(),
    },
    usage: response.usage,
    latencyMs: response.latencyMs,
  };
}

/**
 * Summarize a GitHub release
 */
export async function summarizeRelease(
  repo: string,
  version: string,
  releaseNotes: string
): Promise<AIResponse<ReleaseSummary>> {
  const prompt = RELEASE_SUMMARY_PROMPT
    .replace('{REPO}', repo)
    .replace('{VERSION}', version)
    .replace('{NOTES}', releaseNotes.slice(0, 3000)); // Limit notes length

  const response = await generateJSON<Omit<ReleaseSummary, 'repo' | 'version'>>(
    prompt,
    { maxTokens: 800, temperature: 0.5 }
  );

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || 'Failed to summarize release',
      latencyMs: response.latencyMs,
    };
  }

  return {
    success: true,
    data: {
      repo,
      version,
      ...response.data,
    },
    usage: response.usage,
    latencyMs: response.latencyMs,
  };
}

/**
 * Batch summarize multiple HN stories
 */
export async function summarizeHNStories(
  stories: Array<{ id: string; title: string; points: number; url: string }>,
  minPoints: number = 50
): Promise<{ summaries: HNSummary[]; errors: string[] }> {
  const eligibleStories = stories.filter(s => s.points >= minPoints);
  const summaries: HNSummary[] = [];
  const errors: string[] = [];

  for (const story of eligibleStories.slice(0, 10)) { // Limit to 10 stories
    const result = await summarizeHNStory(story.id, story.title, story.points, story.url);
    
    if (result.success && result.data) {
      summaries.push(result.data);
    } else {
      errors.push(`Failed to summarize "${story.title}": ${result.error}`);
    }
    
    // Rate limiting - small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return { summaries, errors };
}

/**
 * Calculate aggregate sentiment for a tool from multiple summaries
 */
export function calculateToolSentiment(
  summaries: HNSummary[],
  toolName: string
): SentimentData | null {
  const relevant = summaries.filter(s => 
    s.toolsMentioned.some(t => t.toLowerCase().includes(toolName.toLowerCase()))
  );

  if (relevant.length === 0) return null;

  const sentimentMap: Record<string, number> = {
    positive: 1,
    negative: -1,
    mixed: 0,
    neutral: 0,
  };

  const avgSentiment = relevant.reduce((sum, s) => sum + sentimentMap[s.sentiment], 0) / relevant.length;

  return {
    tool: toolName,
    date: new Date().toISOString().split('T')[0],
    sentiment: avgSentiment,
    volume: relevant.length,
    sources: relevant.map(s => s.storyId),
  };
}
