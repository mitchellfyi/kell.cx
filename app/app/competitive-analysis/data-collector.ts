import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { CompetitiveAnalysisEngine } from "./engine";

interface DataSource {
  name: string;
  type: "pricing" | "features" | "news" | "social" | "jobs" | "funding";
  url?: string;
  scraper?: string;
  schedule?: string; // cron format
}

interface CollectionResult {
  source: string;
  timestamp: Date;
  data: any;
  changes?: any[];
  errors?: string[];
}

export class CompetitiveDataCollector {
  private engine: CompetitiveAnalysisEngine;
  private sources: DataSource[];
  private dataPath: string;
  private historyPath: string;

  constructor(engine: CompetitiveAnalysisEngine) {
    this.engine = engine;

    // Define data sources
    this.sources = [
      {
        name: "pricing",
        type: "pricing",
        scraper: "scrape-pricing.js",
        schedule: "0 6 * * *", // Daily at 6 AM
      },
      {
        name: "features",
        type: "features",
        scraper: "scrape-features.js",
        schedule: "0 12 * * 1", // Weekly on Monday at noon
      },
      {
        name: "github-activity",
        type: "news",
        url: "https://api.github.com/search/repositories",
        schedule: "0 */4 * * *", // Every 4 hours
      },
      {
        name: "job-postings",
        type: "jobs",
        scraper: "scrape-jobs.js",
        schedule: "0 9 * * *", // Daily at 9 AM
      },
      {
        name: "social-mentions",
        type: "social",
        scraper: "scrape-social.js",
        schedule: "0 */2 * * *", // Every 2 hours
      },
      {
        name: "funding-news",
        type: "funding",
        scraper: "scrape-funding.js",
        schedule: "0 8 * * 1", // Weekly on Monday at 8 AM
      },
    ];

    // Set up data paths
    const possiblePaths = [
      join(process.cwd(), "..", "briefing", "data"),
      join(process.cwd(), "briefing", "data"),
    ];

    this.dataPath = join(process.cwd(), "..", "briefing", "data"); // Set default first

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        this.dataPath = path;
        break;
      }
    }

    this.historyPath = join(this.dataPath, "collection-history");
  }

  // Collect data from all sources
  async collectAll(): Promise<CollectionResult[]> {
    const results: CollectionResult[] = [];

    for (const source of this.sources) {
      try {
        const result = await this.collectFromSource(source);
        results.push(result);
      } catch (error) {
        results.push({
          source: source.name,
          timestamp: new Date(),
          data: null,
          errors: [(error as Error).message],
        });
      }
    }

    return results;
  }

  // Collect from a specific source
  async collectFromSource(source: DataSource): Promise<CollectionResult> {
    const timestamp = new Date();

    switch (source.type) {
      case "pricing":
        return this.collectPricingData(source, timestamp);
      case "features":
        return this.collectFeatureData(source, timestamp);
      case "news":
        return this.collectNewsData(source, timestamp);
      case "jobs":
        return this.collectJobsData(source, timestamp);
      case "social":
        return this.collectSocialData(source, timestamp);
      case "funding":
        return this.collectFundingData(source, timestamp);
      default:
        throw new Error(`Unknown source type: ${source.type}`);
    }
  }

  // Pricing data collection
  private async collectPricingData(source: DataSource, timestamp: Date): Promise<CollectionResult> {
    const pricingPath = join(this.dataPath, "..", "..", "site", "data", "pricing.json");
    const historyPath = join(this.dataPath, "pricing-history.json");

    // Load current pricing
    let currentPricing: any = {};
    if (existsSync(pricingPath)) {
      currentPricing = JSON.parse(readFileSync(pricingPath, "utf8"));
    }

    // Load pricing history
    let history: any[] = [];
    if (existsSync(historyPath)) {
      history = JSON.parse(readFileSync(historyPath, "utf8"));
    }

    // Check for changes
    const changes: any[] = [];
    const previousPricing = history.length > 0 ? history[history.length - 1].data : {};

    currentPricing.categories?.forEach((category: any) => {
      category.tools?.forEach((tool: any) => {
        const prevTool = previousPricing.categories
          ?.find((c: any) => c.id === category.id)
          ?.tools?.find((t: any) => t.name === tool.name);

        if (prevTool) {
          // Check for pricing changes
          if (JSON.stringify(prevTool.individual) !== JSON.stringify(tool.individual) ||
              JSON.stringify(prevTool.team) !== JSON.stringify(tool.team)) {

            const alert = this.engine.analyzePricingStrategy(tool.name, prevTool, tool);
            if (alert) {
              changes.push(alert);
              this.engine.generateAlert(alert);
            }
          }
        }
      });
    });

    // Save to history
    history.push({
      timestamp,
      data: currentPricing,
    });

    // Keep only last 30 days of history
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    history = history.filter(h => new Date(h.timestamp) > thirtyDaysAgo);

    writeFileSync(historyPath, JSON.stringify(history, null, 2));

    return {
      source: source.name,
      timestamp,
      data: currentPricing,
      changes,
    };
  }

  // Feature data collection
  private async collectFeatureData(source: DataSource, timestamp: Date): Promise<CollectionResult> {
    const featurePath = join(this.dataPath, "feature-matrix.json");
    const historyPath = join(this.dataPath, "feature-history.json");

    // Load current features
    let currentFeatures: any = {};
    if (existsSync(featurePath)) {
      currentFeatures = JSON.parse(readFileSync(featurePath, "utf8"));
    }

    // Load feature history
    let history: any[] = [];
    if (existsSync(historyPath)) {
      history = JSON.parse(readFileSync(historyPath, "utf8"));
    }

    // Check for changes
    const changes: any[] = [];
    const previousFeatures = history.length > 0 ? history[history.length - 1].data : {};

    if (currentFeatures.competitors && previousFeatures.competitors) {
      Object.keys(currentFeatures.competitors).forEach(competitor => {
        const current = currentFeatures.competitors[competitor];
        const previous = previousFeatures.competitors[competitor] || {};

        const alert = this.engine.analyzeFeatureChanges(competitor, previous, current);
        if (alert) {
          changes.push(alert);
          this.engine.generateAlert(alert);
        }
      });
    }

    // Save to history
    history.push({
      timestamp,
      data: currentFeatures,
    });

    writeFileSync(historyPath, JSON.stringify(history, null, 2));

    return {
      source: source.name,
      timestamp,
      data: currentFeatures,
      changes,
    };
  }

  // News data collection (GitHub activity, blog posts, etc.)
  private async collectNewsData(source: DataSource, timestamp: Date): Promise<CollectionResult> {
    const newsPath = join(this.dataPath, "news-history.json");

    // Load existing news
    let newsHistory: any[] = [];
    if (existsSync(newsPath)) {
      newsHistory = JSON.parse(readFileSync(newsPath, "utf8"));
    }

    // For demo purposes, return mock data
    // In production, this would call actual scrapers or APIs
    const mockNews = {
      items: [
        {
          date: timestamp,
          source: "github",
          competitor: "Cursor",
          type: "release",
          title: "Cursor v0.25.0 Released",
          description: "New multi-file editing capabilities",
          url: "https://github.com/cursor/releases",
        },
      ],
    };

    // Analyze news items for strategic importance
    const changes: any[] = [];
    mockNews.items.forEach(item => {
      if (item.type === "release" && item.description.includes("multi-file")) {
        changes.push({
          id: `news-${item.competitor}-${Date.now()}`,
          date: new Date(),
          competitor: item.competitor,
          type: "feature",
          severity: "medium",
          title: item.title,
          summary: item.description,
          strategicRead: "Competitor enhancing core capabilities",
          recommendations: ["Monitor user adoption", "Assess feature parity"],
        });
      }
    });

    // Add to history
    newsHistory.push({
      timestamp,
      items: mockNews.items,
    });

    // Keep only last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    newsHistory = newsHistory.filter(h => new Date(h.timestamp) > sevenDaysAgo);

    writeFileSync(newsPath, JSON.stringify(newsHistory, null, 2));

    return {
      source: source.name,
      timestamp,
      data: mockNews,
      changes,
    };
  }

  // Job postings analysis
  private async collectJobsData(source: DataSource, timestamp: Date): Promise<CollectionResult> {
    const jobsPath = join(this.dataPath, `jobs-${timestamp.toISOString().split('T')[0]}.json`);

    // Check if we have job data for today
    if (existsSync(jobsPath)) {
      const jobData = JSON.parse(readFileSync(jobsPath, "utf8"));

      // Analyze job postings for strategic insights
      const insights: any[] = [];

      Object.entries(jobData).forEach(([company, jobs]: [string, any]) => {
        const mlJobs = jobs.filter((job: any) =>
          job.title.toLowerCase().includes("machine learning") ||
          job.title.toLowerCase().includes("ml engineer")
        ).length;

        const agentJobs = jobs.filter((job: any) =>
          job.title.toLowerCase().includes("agent") ||
          job.description?.toLowerCase().includes("agentic")
        ).length;

        if (mlJobs > 5) {
          insights.push({
            competitor: company,
            insight: `Heavy ML hiring (${mlJobs} positions) - likely building custom models`,
            impact: "high",
          });
        }

        if (agentJobs > 0) {
          insights.push({
            competitor: company,
            insight: `Hiring for agent/agentic roles - strategic focus on autonomous coding`,
            impact: "high",
          });
        }
      });

      return {
        source: source.name,
        timestamp,
        data: jobData,
        changes: insights,
      };
    }

    return {
      source: source.name,
      timestamp,
      data: {},
      errors: ["No job data available for today"],
    };
  }

  // Social media sentiment
  private async collectSocialData(source: DataSource, timestamp: Date): Promise<CollectionResult> {
    // Would integrate with social media APIs
    // For now, return mock data
    return {
      source: source.name,
      timestamp,
      data: {
        mentions: {
          "Cursor": { positive: 145, negative: 23, neutral: 67 },
          "GitHub Copilot": { positive: 234, negative: 56, neutral: 123 },
          "Windsurf": { positive: 89, negative: 12, neutral: 34 },
        },
      },
    };
  }

  // Funding and investment news
  private async collectFundingData(source: DataSource, timestamp: Date): Promise<CollectionResult> {
    const fundingPath = join(this.dataPath, "funding-history.json");

    // Load funding history
    let fundingHistory: any[] = [];
    if (existsSync(fundingPath)) {
      fundingHistory = JSON.parse(readFileSync(fundingPath, "utf8"));
    }

    // Would scrape from Crunchbase, news sources, etc.
    // For demo, return mock data
    const mockFunding = {
      recent: [],
    };

    return {
      source: source.name,
      timestamp,
      data: mockFunding,
    };
  }

  // Get collection schedule
  getSchedule(): DataSource[] {
    return this.sources;
  }

  // Get last collection results
  getLastResults(): any {
    const resultsPath = join(this.dataPath, "last-collection-results.json");
    if (existsSync(resultsPath)) {
      return JSON.parse(readFileSync(resultsPath, "utf8"));
    }
    return null;
  }

  // Save collection results
  async saveResults(results: CollectionResult[]): Promise<void> {
    const resultsPath = join(this.dataPath, "last-collection-results.json");
    writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date(),
      results,
    }, null, 2));
  }
}