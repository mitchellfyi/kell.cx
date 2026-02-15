import fetch from 'node-fetch';

/**
 * AI Content Analyzer Service
 * Provides content summarization and sentiment analysis using Claude API
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = 'claude-3-haiku-20240307'; // Fast model for analysis

/**
 * Analyzes HN discussion content for summary and sentiment
 * @param {Object} story - HN story object with title, url, comments, points
 * @param {string} discussionContent - Combined text from comments (optional)
 * @returns {Promise<Object>} Analysis result with summary, sentiment, key quotes
 */
export async function analyzeHNStory(story, discussionContent = null) {
  if (!ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not set, skipping AI analysis');
    return null;
  }

  try {
    const prompt = buildHNAnalysisPrompt(story, discussionContent);
    const analysis = await callClaudeAPI(prompt);

    return {
      storyId: story.id,
      summary: analysis.summary,
      sentiment: analysis.sentiment,
      sentimentScore: analysis.sentimentScore,
      keyQuotes: analysis.keyQuotes || [],
      competitiveImplication: analysis.competitiveImplication || null,
      analyzedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Failed to analyze story ${story.id}:`, error);
    return null;
  }
}

/**
 * Analyzes release notes for significant changes
 * @param {Object} release - Release object with name, body, url
 * @returns {Promise<Object>} Analysis result
 */
export async function analyzeReleaseNotes(release) {
  if (!ANTHROPIC_API_KEY) {
    return null;
  }

  try {
    const prompt = buildReleaseAnalysisPrompt(release);
    const analysis = await callClaudeAPI(prompt);

    return {
      releaseId: release.tag,
      summary: analysis.summary,
      significance: analysis.significance,
      breakingChanges: analysis.breakingChanges || [],
      majorFeatures: analysis.majorFeatures || [],
      analyzedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Failed to analyze release ${release.tag}:`, error);
    return null;
  }
}

/**
 * Analyzes article content for key insights
 * @param {Object} article - Article object with title, content, url
 * @returns {Promise<Object>} Analysis result
 */
export async function analyzeArticle(article) {
  if (!ANTHROPIC_API_KEY) {
    return null;
  }

  try {
    const prompt = buildArticleAnalysisPrompt(article);
    const analysis = await callClaudeAPI(prompt);

    return {
      articleUrl: article.url,
      summary: analysis.summary,
      keyFacts: analysis.keyFacts || [],
      implications: analysis.implications || [],
      relatedTopics: analysis.relatedTopics || [],
      analyzedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Failed to analyze article ${article.url}:`, error);
    return null;
  }
}

/**
 * Calculates sentiment trends over time
 * @param {Array} analyses - Array of story analyses with sentiment scores
 * @returns {Object} Sentiment trend data
 */
export function calculateSentimentTrends(analyses) {
  if (!analyses || analyses.length === 0) {
    return { trend: 'neutral', average: 0, shifts: [] };
  }

  // Sort by date
  const sorted = analyses
    .filter(a => a.sentimentScore !== undefined)
    .sort((a, b) => new Date(a.analyzedAt) - new Date(b.analyzedAt));

  if (sorted.length === 0) {
    return { trend: 'neutral', average: 0, shifts: [] };
  }

  // Calculate moving average
  const windowSize = Math.min(7, Math.floor(sorted.length / 3));
  const movingAverages = [];

  for (let i = windowSize; i < sorted.length; i++) {
    const window = sorted.slice(i - windowSize, i);
    const avg = window.reduce((sum, a) => sum + a.sentimentScore, 0) / windowSize;
    movingAverages.push({
      date: sorted[i].analyzedAt,
      average: avg,
      sentiment: getSentimentLabel(avg)
    });
  }

  // Detect significant shifts
  const shifts = [];
  for (let i = 1; i < movingAverages.length; i++) {
    const diff = movingAverages[i].average - movingAverages[i-1].average;
    if (Math.abs(diff) > 0.2) {
      shifts.push({
        date: movingAverages[i].date,
        direction: diff > 0 ? 'positive' : 'negative',
        magnitude: Math.abs(diff)
      });
    }
  }

  const overallAverage = sorted.reduce((sum, a) => sum + a.sentimentScore, 0) / sorted.length;
  const recentAverage = sorted.slice(-5).reduce((sum, a) => sum + a.sentimentScore, 0) / Math.min(5, sorted.length);

  return {
    trend: recentAverage > overallAverage + 0.1 ? 'improving' :
           recentAverage < overallAverage - 0.1 ? 'declining' : 'stable',
    average: overallAverage,
    recentAverage,
    shifts,
    timeline: movingAverages
  };
}

// Helper functions

function buildHNAnalysisPrompt(story, discussionContent) {
  const context = discussionContent ?
    `Story: "${story.title}"\nURL: ${story.url}\nPoints: ${story.points}\nComments: ${story.comments}\n\nDiscussion excerpt:\n${discussionContent.slice(0, 2000)}` :
    `Story: "${story.title}"\nURL: ${story.url}\nPoints: ${story.points}\nComments: ${story.comments}`;

  return `Analyze this Hacker News story about AI coding tools and provide:
1. A 2-3 sentence summary of the key points and consensus
2. Overall sentiment (positive, negative, mixed, neutral) with a score from -1.0 to 1.0
3. 2-3 notable quotes that capture the discussion (if discussion content provided)
4. Any competitive implications for AI coding tools

${context}

Respond in JSON format:
{
  "summary": "...",
  "sentiment": "positive|negative|mixed|neutral",
  "sentimentScore": 0.0,
  "keyQuotes": ["...", "..."],
  "competitiveImplication": "..."
}`;
}

function buildReleaseAnalysisPrompt(release) {
  return `Analyze this software release for AI coding tools:
Release: ${release.name}
Repository: ${release.repo}

Release Notes:
${release.body?.slice(0, 3000) || 'No release notes provided'}

Provide:
1. A 2-3 sentence summary of what's significant
2. List any breaking changes
3. List major new features
4. Rate significance: major|minor|patch

Respond in JSON format:
{
  "summary": "...",
  "significance": "major|minor|patch",
  "breakingChanges": ["..."],
  "majorFeatures": ["..."]
}`;
}

function buildArticleAnalysisPrompt(article) {
  return `Analyze this tech article about AI coding tools:
Title: ${article.title}
URL: ${article.url}

Content:
${article.content?.slice(0, 3000) || article.description || 'Content not available'}

Provide:
1. A 3-4 sentence summary
2. 3-5 key facts or insights
3. Implications for the AI coding tools market
4. Related topics/keywords

Respond in JSON format:
{
  "summary": "...",
  "keyFacts": ["...", "..."],
  "implications": ["..."],
  "relatedTopics": ["..."]
}`;
}

async function callClaudeAPI(prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      messages: [{
        role: 'user',
        content: prompt
      }],
      max_tokens: 500,
      temperature: 0.3 // Lower temperature for consistent analysis
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  try {
    return JSON.parse(content);
  } catch (e) {
    // Try to extract JSON from the response if it's wrapped in text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse Claude response as JSON');
  }
}

function getSentimentLabel(score) {
  if (score > 0.3) return 'positive';
  if (score < -0.3) return 'negative';
  if (Math.abs(score) < 0.1) return 'neutral';
  return 'mixed';
}

export default {
  analyzeHNStory,
  analyzeReleaseNotes,
  analyzeArticle,
  calculateSentimentTrends
};