/**
 * AI-powered insight generation using Claude API
 * Analyzes data from multiple sources to generate compelling insights
 */

const https = require('https');

class AIInsightGenerator {
  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    this.apiKey = apiKey;
    this.model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
  }

  /**
   * Call Claude API with a prompt
   */
  async callClaude(prompt, maxTokens = 2000) {
    if (!this.apiKey) {
      throw new Error('No ANTHROPIC_API_KEY set');
    }

    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7,
      });

      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            if (result.content && result.content[0]?.text) {
              resolve(result.content[0].text);
            } else {
              reject(new Error(`Claude API error: ${body.slice(0, 200)}`));
            }
          } catch (e) {
            reject(new Error('Failed to parse Claude response'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Claude API request timeout'));
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Generate daily insights from all data sources
   */
  async generateDailyInsights(data) {
    const prompt = this.buildInsightPrompt(data);

    try {
      const response = await this.callClaude(prompt, 3000);

      // Extract JSON from response
      let jsonStr = response;
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];

      const insights = JSON.parse(jsonStr);
      insights.source = 'claude-code';
      insights.generatedAt = new Date().toISOString();
      insights.date = new Date().toISOString().split('T')[0];

      return insights;
    } catch (error) {
      console.error('AI insight generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Build a comprehensive prompt for insight generation
   */
  buildInsightPrompt(data) {
    // Format data for analysis
    const vsCodeData = this.formatVSCodeData(data.vscode);
    const releasesData = this.formatReleasesData(data.releases);
    const newsData = this.formatNewsData(data.hn, data.news);
    const hiringData = this.formatHiringData(data.hiring);
    const pricingData = this.formatPricingData(data.pricing);
    const momentumData = this.formatMomentumData(data.momentum);

    return `You are an expert analyst for kell.cx, providing competitive intelligence on AI coding tools. Analyze the following data and generate compelling insights that tell a story about what's happening in the market.

CURRENT DATA:

VS Code Extensions (${data.vscode?.extensions?.length || 0} tracked):
${vsCodeData}

Recent Releases (past week):
${releasesData}

Top HN Stories & News:
${newsData}

Hiring Activity:
${hiringData}

Pricing Changes:
${pricingData}

Momentum Rankings:
${momentumData}

ANALYSIS REQUIREMENTS:

1. **Identify Patterns**: Look for connections across data sources
   - Hiring surges paired with new releases = expansion signals
   - Multiple competitors moving in same direction = market shift
   - User sentiment (HN discussions) vs actual adoption (installs)

2. **Explain Why It Matters**: Don't just report numbers, explain implications
   - What does a 100k install spike mean for market dynamics?
   - Why should users care about a specific release or feature?
   - How do pricing changes reflect competitive positioning?

3. **Generate Narrative**: Create a coherent story
   - Lead with the most significant development
   - Connect related events into themes
   - Provide actionable takeaways

Return ONLY valid JSON with this structure:
{
  "summary": "One compelling sentence that captures today's most important development and its market impact",
  "vscode": [
    "5 specific insights about extension adoption, growth patterns, and what they reveal about user preferences"
  ],
  "releases": [
    "3-4 insights about recent releases, focusing on strategic moves and feature trends"
  ],
  "news": [
    "4 insights from HN/news that reveal sentiment, concerns, or emerging opportunities"
  ],
  "market": [
    "3-4 cross-source insights that connect the dots and reveal larger patterns"
  ]
}

Make insights specific (use numbers), explain implications, and highlight surprising or noteworthy patterns. Each insight should be 1-2 sentences that tell a complete story.`;
  }

  formatVSCodeData(vscode) {
    if (!vscode?.extensions) return 'No data';

    const exts = vscode.extensions.slice(0, 10);
    return exts.map(e => {
      const trend = e.trendingMonthly ? ` (+${e.trendingMonthly.toFixed(1)}% monthly)` : '';
      return `- ${e.name}: ${this.formatNumber(e.installs)} installs${trend}`;
    }).join('\n');
  }

  formatReleasesData(releases) {
    if (!releases?.recentReleases) return 'No data';

    const recent = releases.recentReleases
      .filter(r => new Date(r.publishedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .slice(0, 10);

    return recent.map(r => {
      const ago = this.timeAgo(new Date(r.publishedAt));
      return `- ${r.company} ${r.tag} (${ago})`;
    }).join('\n');
  }

  formatNewsData(hn, news) {
    const items = [];

    if (hn?.stories) {
      hn.stories.slice(0, 5).forEach(s => {
        items.push(`- HN: "${this.truncate(s.title, 60)}" (${s.points} pts, ${s.comments} comments)`);
      });
    }

    if (news?.articles) {
      news.articles.slice(0, 3).forEach(a => {
        items.push(`- News: "${this.truncate(a.title, 60)}" (${a.source})`);
      });
    }

    return items.length > 0 ? items.join('\n') : 'No data';
  }

  formatHiringData(hiring) {
    if (!hiring?.current) return 'No data';

    const companies = Object.entries(hiring.current)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return companies.map(([company, count]) =>
      `- ${company}: ${count} open positions`
    ).join('\n');
  }

  formatPricingData(pricing) {
    if (!pricing?.changes || pricing.changes.length === 0) return 'No recent changes';

    const recent = pricing.changes
      .filter(c => new Date(c.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .slice(0, 5);

    return recent.map(c =>
      `- ${c.company}: ${c.description || 'Pricing page updated'}`
    ).join('\n');
  }

  formatMomentumData(momentum) {
    if (!momentum?.rankings) return 'No data';

    return momentum.rankings.slice(0, 5).map((r, i) =>
      `${i + 1}. ${r.company} (score: ${r.score})`
    ).join('\n');
  }

  // Utility functions
  formatNumber(n) {
    if (!n) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toString();
  }

  truncate(s, len) {
    if (!s) return '';
    return s.length > len ? s.slice(0, len) + '...' : s;
  }

  timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = {
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
      }
    }
    return 'just now';
  }

  /**
   * Analyze cross-source patterns and connections
   */
  analyzeCrossSourcePatterns(data, insights) {
    const patterns = [];

    // Look for hiring + release correlations
    if (data.hiring && data.releases) {
      const hiringCompanies = Object.keys(data.hiring.current || {});
      const releasingCompanies = data.releases.recentReleases?.map(r => r.company) || [];

      const expanding = hiringCompanies.filter(c =>
        releasingCompanies.includes(c) && (data.hiring.current[c] || 0) > 10
      );

      if (expanding.length > 0) {
        patterns.push(`Expansion signals: ${expanding.join(', ')} show both active hiring and recent releases`);
      }
    }

    // Look for sentiment vs adoption mismatches
    if (data.hn && data.vscode) {
      const negativeStories = data.hn.stories?.filter(s =>
        s.title.toLowerCase().includes('problem') ||
        s.title.toLowerCase().includes('issue') ||
        s.title.toLowerCase().includes('wrong')
      ) || [];

      if (negativeStories.length > 2) {
        patterns.push('User sentiment shows growing concerns despite continued adoption growth');
      }
    }

    return patterns;
  }
}

module.exports = AIInsightGenerator;