/**
 * Cross-source pattern analyzer
 * Identifies connections and correlations across different data sources
 */

class CrossSourceAnalyzer {
  constructor() {
    this.correlationThresholds = {
      hiring: 10,          // minimum job postings to consider significant
      releaseWindow: 7,    // days to look for correlated releases
      installSpike: 50000, // minimum install increase to flag
      sentimentThreshold: 100 // HN points to consider significant discussion
    };
  }

  /**
   * Analyze all data sources to find patterns and connections
   */
  analyzePatterns(data) {
    const patterns = {
      expansionSignals: this.detectExpansionSignals(data),
      competitiveMoves: this.detectCompetitiveMoves(data),
      marketShifts: this.detectMarketShifts(data),
      sentimentMismatches: this.detectSentimentMismatches(data),
      emergingThemes: this.detectEmergingThemes(data)
    };

    return this.formatPatterns(patterns);
  }

  /**
   * Detect companies showing expansion signals
   * (hiring surge + new releases + increased adoption)
   */
  detectExpansionSignals(data) {
    const signals = [];

    if (!data.hiring?.current || !data.releases?.recentReleases) {
      return signals;
    }

    // Get hiring data with historical comparison
    const hiringChanges = this.getHiringChanges(data.hiring);

    // Check each company with significant hiring
    for (const [company, change] of Object.entries(hiringChanges)) {
      if (change.current < this.correlationThresholds.hiring) continue;

      // Look for recent releases
      const recentReleases = this.getCompanyReleases(company, data.releases);

      // Look for install growth
      const installGrowth = this.getInstallGrowth(company, data.vscode);

      // Combine signals
      if (recentReleases.length > 0 || installGrowth > this.correlationThresholds.installSpike) {
        signals.push({
          company,
          type: 'expansion',
          signals: {
            hiringIncrease: change.delta,
            hiringPercent: change.percent,
            releaseCount: recentReleases.length,
            installGrowth,
            releases: recentReleases
          },
          strength: this.calculateSignalStrength({
            hiring: change.percent > 50,
            releases: recentReleases.length > 2,
            installs: installGrowth > 100000
          })
        });
      }
    }

    return signals.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Detect competitive moves (multiple companies moving in same direction)
   */
  detectCompetitiveMoves(data) {
    const moves = [];

    // Check for pricing wars
    const pricingMoves = this.detectPricingPatterns(data.pricing);
    if (pricingMoves.length > 0) {
      moves.push(...pricingMoves);
    }

    // Check for feature convergence
    const featureConvergence = this.detectFeatureConvergence(data.releases);
    if (featureConvergence.length > 0) {
      moves.push(...featureConvergence);
    }

    return moves;
  }

  /**
   * Detect broad market shifts
   */
  detectMarketShifts(data) {
    const shifts = [];

    // Analyze momentum changes
    if (data.momentum?.rankings) {
      const significantMoves = this.analyzeMarketMomentum(data.momentum);
      shifts.push(...significantMoves);
    }

    // Analyze category shifts in VS Code extensions
    if (data.vscode?.extensions) {
      const categoryShifts = this.analyzeCategoryGrowth(data.vscode);
      shifts.push(...categoryShifts);
    }

    return shifts;
  }

  /**
   * Detect mismatches between sentiment and adoption
   */
  detectSentimentMismatches(data) {
    const mismatches = [];

    if (!data.hn?.stories || !data.vscode?.extensions) {
      return mismatches;
    }

    // Group HN stories by company mentions
    const sentimentByCompany = this.analyzeSentiment(data.hn.stories);

    // Compare with actual adoption
    for (const [company, sentiment] of Object.entries(sentimentByCompany)) {
      const extension = data.vscode.extensions.find(e =>
        e.publisher?.toLowerCase().includes(company.toLowerCase()) ||
        e.name?.toLowerCase().includes(company.toLowerCase())
      );

      if (extension) {
        const growth = extension.trendingMonthly || 0;

        // Flag mismatches
        if (sentiment.negative > sentiment.positive && growth > 5) {
          mismatches.push({
            company,
            type: 'negative_sentiment_positive_growth',
            sentiment: sentiment,
            growth: growth,
            extension: extension.name
          });
        } else if (sentiment.positive > sentiment.negative * 2 && growth < 0) {
          mismatches.push({
            company,
            type: 'positive_sentiment_negative_growth',
            sentiment: sentiment,
            growth: growth,
            extension: extension.name
          });
        }
      }
    }

    return mismatches;
  }

  /**
   * Detect emerging themes from news and discussions
   */
  detectEmergingThemes(data) {
    const themes = {};

    // Analyze HN story titles for common themes
    if (data.hn?.stories) {
      const themeKeywords = {
        'agent': ['agent', 'autonomous', 'agentic'],
        'safety': ['safety', 'ethics', 'constraint', 'violation'],
        'local': ['local', 'offline', 'privacy', 'on-device'],
        'enterprise': ['enterprise', 'business', 'team', 'corporate'],
        'opensource': ['open source', 'oss', 'community', 'free']
      };

      for (const story of data.hn.stories) {
        const title = story.title.toLowerCase();

        for (const [theme, keywords] of Object.entries(themeKeywords)) {
          if (keywords.some(kw => title.includes(kw))) {
            if (!themes[theme]) themes[theme] = { count: 0, totalPoints: 0, stories: [] };
            themes[theme].count++;
            themes[theme].totalPoints += story.points;
            themes[theme].stories.push(story);
          }
        }
      }
    }

    // Convert to array and sort by relevance
    return Object.entries(themes)
      .map(([name, data]) => ({
        theme: name,
        strength: data.totalPoints,
        count: data.count,
        avgPoints: Math.round(data.totalPoints / data.count),
        topStory: data.stories.sort((a, b) => b.points - a.points)[0]
      }))
      .sort((a, b) => b.strength - a.strength);
  }

  // Helper methods

  getHiringChanges(hiring) {
    const changes = {};

    if (!hiring.history || hiring.history.length < 2) {
      // If no history, just return current as-is
      for (const [company, count] of Object.entries(hiring.current || {})) {
        changes[company] = {
          current: count,
          previous: 0,
          delta: count,
          percent: 100
        };
      }
      return changes;
    }

    const latest = hiring.history[hiring.history.length - 1];
    const previous = hiring.history[hiring.history.length - 2];

    for (const [company, count] of Object.entries(latest.counts || {})) {
      const prevCount = previous.counts?.[company] || 0;
      const delta = count - prevCount;
      const percent = prevCount > 0 ? Math.round((delta / prevCount) * 100) : 100;

      changes[company] = {
        current: count,
        previous: prevCount,
        delta,
        percent
      };
    }

    return changes;
  }

  getCompanyReleases(company, releases) {
    const companyLower = company.toLowerCase();
    const windowStart = new Date(Date.now() - this.correlationThresholds.releaseWindow * 24 * 60 * 60 * 1000);

    return releases.recentReleases.filter(r =>
      r.company.toLowerCase().includes(companyLower) &&
      new Date(r.publishedAt) > windowStart
    );
  }

  getInstallGrowth(company, vscode) {
    if (!vscode?.extensions) return 0;

    const companyLower = company.toLowerCase();
    const extensions = vscode.extensions.filter(e =>
      e.publisher?.toLowerCase().includes(companyLower) ||
      e.name?.toLowerCase().includes(companyLower)
    );

    // Sum up monthly growth across all company extensions
    return extensions.reduce((total, ext) => {
      const monthlyGrowth = (ext.trendingMonthly || 0) * ext.installs / 100;
      return total + monthlyGrowth;
    }, 0);
  }

  detectPricingPatterns(pricing) {
    if (!pricing?.changes || pricing.changes.length < 2) return [];

    const patterns = [];
    const recentWindow = 30; // days
    const windowStart = new Date(Date.now() - recentWindow * 24 * 60 * 60 * 1000);

    const recentChanges = pricing.changes.filter(c => new Date(c.date) > windowStart);

    if (recentChanges.length >= 3) {
      // Multiple companies changing pricing suggests market movement
      patterns.push({
        type: 'pricing_activity',
        companies: recentChanges.map(c => c.company),
        count: recentChanges.length,
        timeframe: `${recentWindow} days`
      });
    }

    return patterns;
  }

  detectFeatureConvergence(releases) {
    if (!releases?.recentReleases) return [];

    const patterns = [];
    const featureKeywords = {
      'agent': ['agent', 'autonomous', 'workflow'],
      'chat': ['chat', 'conversation', 'assistant'],
      'multimodel': ['gpt-4', 'claude', 'multi-model', 'model selection'],
      'collaboration': ['team', 'share', 'collaborative', 'multiplayer']
    };

    const featureCounts = {};

    for (const release of releases.recentReleases) {
      const description = (release.description || '').toLowerCase();

      for (const [feature, keywords] of Object.entries(featureKeywords)) {
        if (keywords.some(kw => description.includes(kw))) {
          if (!featureCounts[feature]) featureCounts[feature] = [];
          featureCounts[feature].push(release);
        }
      }
    }

    // Flag features being added by multiple companies
    for (const [feature, releases] of Object.entries(featureCounts)) {
      const companies = [...new Set(releases.map(r => r.company))];
      if (companies.length >= 2) {
        patterns.push({
          type: 'feature_convergence',
          feature,
          companies,
          releases: releases.map(r => ({ company: r.company, version: r.tag }))
        });
      }
    }

    return patterns;
  }

  analyzeMarketMomentum(momentum) {
    const shifts = [];

    if (!momentum.history || momentum.history.length < 2) return shifts;

    const latest = momentum.history[momentum.history.length - 1];
    const previous = momentum.history[momentum.history.length - 2];

    // Build rank change map
    const rankChanges = {};
    latest.rankings?.forEach((r, i) => {
      const prevIndex = previous.rankings?.findIndex(pr => pr.company === r.company);
      if (prevIndex !== -1) {
        rankChanges[r.company] = {
          current: i + 1,
          previous: prevIndex + 1,
          change: (prevIndex + 1) - (i + 1) // positive = moved up
        };
      }
    });

    // Identify significant movers
    const bigMovers = Object.entries(rankChanges)
      .filter(([_, data]) => Math.abs(data.change) >= 3)
      .map(([company, data]) => ({
        company,
        ...data,
        direction: data.change > 0 ? 'up' : 'down'
      }));

    if (bigMovers.length >= 2) {
      shifts.push({
        type: 'momentum_shift',
        movers: bigMovers,
        summary: `${bigMovers.length} companies showing significant momentum changes`
      });
    }

    return shifts;
  }

  analyzeCategoryGrowth(vscode) {
    const shifts = [];

    // Group extensions by category indicators
    const categories = {
      'agent': ext => ext.name.toLowerCase().includes('agent') || ext.name.toLowerCase().includes('cline'),
      'chat': ext => ext.name.toLowerCase().includes('chat') || ext.name.toLowerCase().includes('copilot'),
      'completion': ext => ext.name.toLowerCase().includes('autocomplete') || ext.name.toLowerCase().includes('tabnine'),
      'review': ext => ext.name.toLowerCase().includes('review') || ext.name.toLowerCase().includes('pr')
    };

    const categoryGrowth = {};

    for (const [category, matcher] of Object.entries(categories)) {
      const extensions = vscode.extensions.filter(matcher);
      const avgGrowth = extensions.reduce((sum, ext) => sum + (ext.trendingMonthly || 0), 0) / extensions.length;
      const totalInstalls = extensions.reduce((sum, ext) => sum + ext.installs, 0);

      if (extensions.length > 0) {
        categoryGrowth[category] = {
          count: extensions.length,
          avgGrowth,
          totalInstalls,
          topExtension: extensions.sort((a, b) => b.installs - a.installs)[0]
        };
      }
    }

    // Find fastest growing categories
    const fastGrowing = Object.entries(categoryGrowth)
      .filter(([_, data]) => data.avgGrowth > 5)
      .sort((a, b) => b[1].avgGrowth - a[1].avgGrowth);

    if (fastGrowing.length > 0) {
      shifts.push({
        type: 'category_growth',
        categories: fastGrowing.map(([name, data]) => ({
          name,
          growth: data.avgGrowth,
          leader: data.topExtension.name
        }))
      });
    }

    return shifts;
  }

  analyzeSentiment(stories) {
    const sentiment = {};

    const negativeWords = ['problem', 'issue', 'wrong', 'fail', 'bad', 'terrible', 'broken', 'bug'];
    const positiveWords = ['great', 'awesome', 'amazing', 'love', 'best', 'excellent', 'fantastic'];

    const companies = ['github', 'copilot', 'cursor', 'claude', 'codeium', 'tabnine', 'replit'];

    for (const story of stories) {
      const titleLower = story.title.toLowerCase();

      for (const company of companies) {
        if (titleLower.includes(company)) {
          if (!sentiment[company]) {
            sentiment[company] = { positive: 0, negative: 0, neutral: 0, totalPoints: 0 };
          }

          sentiment[company].totalPoints += story.points;

          if (negativeWords.some(w => titleLower.includes(w))) {
            sentiment[company].negative += story.points;
          } else if (positiveWords.some(w => titleLower.includes(w))) {
            sentiment[company].positive += story.points;
          } else {
            sentiment[company].neutral += story.points;
          }
        }
      }
    }

    return sentiment;
  }

  calculateSignalStrength(signals) {
    let strength = 0;
    if (signals.hiring) strength += 3;
    if (signals.releases) strength += 2;
    if (signals.installs) strength += 2;
    return strength;
  }

  formatPatterns(patterns) {
    const insights = [];

    // Format expansion signals
    for (const signal of patterns.expansionSignals) {
      const parts = [];
      if (signal.signals.hiringIncrease > 0) {
        parts.push(`${signal.signals.hiringIncrease}+ new positions`);
      }
      if (signal.signals.releaseCount > 0) {
        parts.push(`${signal.signals.releaseCount} recent releases`);
      }
      if (signal.signals.installGrowth > 1000) {
        parts.push(`${Math.round(signal.signals.installGrowth / 1000)}K install growth`);
      }

      insights.push({
        type: 'expansion',
        company: signal.company,
        message: `${signal.company} showing strong expansion signals: ${parts.join(', ')}`,
        strength: signal.strength
      });
    }

    // Format competitive moves
    for (const move of patterns.competitiveMoves) {
      if (move.type === 'pricing_activity') {
        insights.push({
          type: 'competitive',
          message: `Pricing activity surge: ${move.companies.join(', ')} updated pricing in past ${move.timeframe}`,
          companies: move.companies
        });
      } else if (move.type === 'feature_convergence') {
        insights.push({
          type: 'convergence',
          message: `Market convergence on ${move.feature}: ${move.companies.join(', ')} all adding similar features`,
          feature: move.feature,
          companies: move.companies
        });
      }
    }

    // Format market shifts
    for (const shift of patterns.marketShifts) {
      if (shift.type === 'momentum_shift') {
        const topMover = shift.movers[0];
        insights.push({
          type: 'momentum',
          message: `Major momentum shift: ${topMover.company} ${topMover.direction} ${Math.abs(topMover.change)} positions`,
          details: shift.movers
        });
      } else if (shift.type === 'category_growth') {
        const topCategory = shift.categories[0];
        insights.push({
          type: 'category',
          message: `${topCategory.name} tools surging with ${topCategory.growth.toFixed(1)}% average growth`,
          categories: shift.categories
        });
      }
    }

    // Format sentiment mismatches
    for (const mismatch of patterns.sentimentMismatches) {
      const sentimentType = mismatch.type === 'negative_sentiment_positive_growth' ? 'concerns' : 'hype';
      insights.push({
        type: 'sentiment',
        company: mismatch.company,
        message: `${mismatch.company}: User ${sentimentType} contrast with ${mismatch.growth > 0 ? 'positive' : 'negative'} adoption trend`,
        details: mismatch
      });
    }

    // Format emerging themes
    const topThemes = patterns.emergingThemes.slice(0, 3);
    for (const theme of topThemes) {
      insights.push({
        type: 'theme',
        message: `"${theme.theme}" emerging as hot topic: ${theme.count} discussions, ${theme.avgPoints} avg points`,
        theme: theme.theme,
        topStory: theme.topStory?.title
      });
    }

    return insights.sort((a, b) => (b.strength || 0) - (a.strength || 0));
  }
}

module.exports = CrossSourceAnalyzer;