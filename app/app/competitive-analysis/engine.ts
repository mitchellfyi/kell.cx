import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

interface CompetitorData {
  name: string;
  website: string;
  lastUpdated: Date;
  features?: Record<string, boolean>;
  pricing?: {
    freeTier?: boolean | string;
    individual?: { price: number; period: string };
    team?: { price: number; period: string } | string;
    enterprise?: { price: number; period: string } | string;
  };
  changes?: {
    date: Date;
    type: "feature" | "pricing" | "positioning" | "funding" | "other";
    description: string;
    impact?: "low" | "medium" | "high" | "critical";
  }[];
}

interface CompetitiveAlert {
  id: string;
  date: Date;
  competitor: string;
  type: "feature" | "pricing" | "positioning" | "threat" | "opportunity";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  summary: string;
  strategicRead?: string;
  userImpact?: string;
  recommendations?: string[];
  relatedEvents?: string[];
}

interface MarketSegment {
  name: string;
  competitors: string[];
  trends: string[];
  opportunities: string[];
}

export class CompetitiveAnalysisEngine {
  private dataPath: string;
  private alertsPath: string;
  private competitors: Map<string, CompetitorData> = new Map();
  private alerts: CompetitiveAlert[] = [];

  constructor() {
    // Try multiple paths to find the data directory
    const possiblePaths = [
      join(process.cwd(), "..", "briefing", "data"),
      join(process.cwd(), "..", "site", "data"),
      join(process.cwd(), "briefing", "data"),
    ];

    // Set default first
    this.dataPath = join(process.cwd(), "..", "briefing", "data");

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        this.dataPath = path;
        break;
      }
    }

    this.alertsPath = join(this.dataPath, "competitive-alerts.json");
    this.loadData();
  }

  private loadData() {
    // Load feature matrix
    const featureMatrixPath = join(this.dataPath, "feature-matrix.json");
    if (existsSync(featureMatrixPath)) {
      const data = JSON.parse(readFileSync(featureMatrixPath, "utf8"));
      if (data.competitors) {
        Object.entries(data.competitors).forEach(([name, features]) => {
          this.competitors.set(name, {
            name,
            website: "",
            lastUpdated: new Date(data.lastUpdated || Date.now()),
            features: features as Record<string, boolean>,
          });
        });
      }
    }

    // Load pricing data
    const pricingPath = join(this.dataPath, "..", "..", "site", "data", "pricing.json");
    if (existsSync(pricingPath)) {
      const pricing = JSON.parse(readFileSync(pricingPath, "utf8"));
      pricing.categories?.forEach((category: any) => {
        category.tools?.forEach((tool: any) => {
          let existing = this.competitors.get(tool.name);
          if (!existing) {
            existing = {
              name: tool.name,
              website: tool.website,
              lastUpdated: new Date(),
            };
          }
          existing.pricing = {
            freeTier: tool.freeTier,
            individual: tool.individual,
            team: tool.team,
            enterprise: tool.enterprise,
          };
          this.competitors.set(tool.name, existing);
        });
      });
    }

    // Load saved alerts
    if (existsSync(this.alertsPath)) {
      this.alerts = JSON.parse(readFileSync(this.alertsPath, "utf8"));
    }
  }

  // Analyze pricing changes
  analyzePricingStrategy(competitor: string, oldPricing: any, newPricing: any): CompetitiveAlert | null {
    const comp = this.competitors.get(competitor);
    if (!comp) return null;

    let changes: string[] = [];
    let severity: CompetitiveAlert["severity"] = "low";
    let strategicRead = "";

    // Check individual pricing changes
    if (oldPricing?.individual?.price !== newPricing?.individual?.price) {
      const oldPrice = oldPricing?.individual?.price || 0;
      const newPrice = newPricing?.individual?.price || 0;
      const change = ((newPrice - oldPrice) / oldPrice) * 100;

      changes.push(`Individual: $${oldPrice} → $${newPrice}/month (${change > 0 ? "+" : ""}${change.toFixed(0)}%)`);

      if (Math.abs(change) > 50) {
        severity = "high";
        strategicRead = change > 0
          ? "Significant price increase suggests monetization pressure or value confidence"
          : "Major price drop indicates market share grab or competitive pressure";
      } else if (Math.abs(change) > 20) {
        severity = "medium";
      }
    }

    // Check team pricing changes
    if (oldPricing?.team?.price !== newPricing?.team?.price) {
      const oldPrice = oldPricing?.team?.price || 0;
      const newPrice = newPricing?.team?.price || 0;
      changes.push(`Team: $${oldPrice} → $${newPrice}/month`);

      if (!strategicRead && newPrice > oldPrice) {
        strategicRead = "Enterprise focus shift - monetizing team adoption";
      }
    }

    if (changes.length === 0) return null;

    return {
      id: `price-${competitor}-${Date.now()}`,
      date: new Date(),
      competitor,
      type: "pricing",
      severity,
      title: `${competitor} Pricing Update`,
      summary: changes.join(", "),
      strategicRead,
      userImpact: this.assessUserImpact(competitor, "pricing", { oldPricing, newPricing }),
      recommendations: this.generateRecommendations(competitor, "pricing", severity),
    };
  }

  // Analyze feature additions/removals
  analyzeFeatureChanges(competitor: string, oldFeatures: Record<string, boolean>, newFeatures: Record<string, boolean>): CompetitiveAlert | null {
    const added: string[] = [];
    const removed: string[] = [];

    Object.keys(newFeatures).forEach(feature => {
      if (!oldFeatures[feature] && newFeatures[feature]) {
        added.push(feature);
      }
    });

    Object.keys(oldFeatures).forEach(feature => {
      if (oldFeatures[feature] && !newFeatures[feature]) {
        removed.push(feature);
      }
    });

    if (added.length === 0 && removed.length === 0) return null;

    const severity: CompetitiveAlert["severity"] =
      added.includes("Agentic coding") || added.includes("Multi-file edits") ? "high" :
      added.length > 3 ? "medium" : "low";

    return {
      id: `feature-${competitor}-${Date.now()}`,
      date: new Date(),
      competitor,
      type: "feature",
      severity,
      title: `${competitor} Feature Update`,
      summary: `Added: ${added.join(", ") || "none"}. Removed: ${removed.join(", ") || "none"}`,
      strategicRead: this.interpretFeatureChanges(added, removed),
      userImpact: this.assessUserImpact(competitor, "feature", { added, removed }),
      recommendations: this.generateRecommendations(competitor, "feature", severity),
    };
  }

  // Analyze market positioning changes
  analyzePositioningShift(competitor: string, oldMessaging: string, newMessaging: string): CompetitiveAlert | null {
    // Simple keyword-based analysis for demo
    const oldKeywords = this.extractKeywords(oldMessaging);
    const newKeywords = this.extractKeywords(newMessaging);

    const addedKeywords = newKeywords.filter(k => !oldKeywords.includes(k));
    const removedKeywords = oldKeywords.filter(k => !newKeywords.includes(k));

    if (addedKeywords.length === 0 && removedKeywords.length === 0) return null;

    return {
      id: `positioning-${competitor}-${Date.now()}`,
      date: new Date(),
      competitor,
      type: "positioning",
      severity: "medium",
      title: `${competitor} Repositioning`,
      summary: `New focus: ${addedKeywords.join(", ") || "none"}. De-emphasized: ${removedKeywords.join(", ") || "none"}`,
      strategicRead: this.interpretPositioning(addedKeywords, removedKeywords),
      recommendations: this.generateRecommendations(competitor, "positioning", "medium"),
    };
  }

  // Generate competitive threat score
  calculateThreatScore(competitor: string): number {
    const comp = this.competitors.get(competitor);
    if (!comp) return 0;

    let score = 0;

    // Feature completeness (0-40 points)
    const features = comp.features || {};
    const criticalFeatures = ["Agentic coding", "Multi-file edits", "Chat interface", "VS Code"];
    const featureScore = criticalFeatures.filter(f => features[f]).length * 10;
    score += featureScore;

    // Pricing competitiveness (0-30 points)
    if (comp.pricing) {
      if (comp.pricing.freeTier) score += 10;
      if (comp.pricing.individual?.price && comp.pricing.individual.price < 20) score += 10;
      if (comp.pricing.team) score += 10;
    }

    // Market presence (0-30 points) - would need real data
    // For demo, using a simple heuristic
    const marketLeaders = ["Cursor", "GitHub Copilot", "Windsurf"];
    if (marketLeaders.includes(competitor)) score += 30;

    return Math.min(score, 100);
  }

  // Find strategic opportunities
  identifyOpportunities(): string[] {
    const opportunities: string[] = [];

    // Price gaps
    const pricingData = Array.from(this.competitors.values())
      .filter(c => c.pricing?.individual?.price)
      .sort((a, b) => (a.pricing!.individual!.price || 0) - (b.pricing!.individual!.price || 0));

    if (pricingData.length > 2) {
      const avgPrice = pricingData.reduce((sum, c) => sum + (c.pricing!.individual!.price || 0), 0) / pricingData.length;
      opportunities.push(`Price positioning opportunity: Market average is $${avgPrice.toFixed(0)}/month`);
    }

    // Feature gaps
    const allFeatures = new Set<string>();
    this.competitors.forEach(c => {
      if (c.features) {
        Object.keys(c.features).forEach(f => allFeatures.add(f));
      }
    });

    const featureCoverage = new Map<string, number>();
    allFeatures.forEach(feature => {
      let count = 0;
      this.competitors.forEach(c => {
        if (c.features?.[feature]) count++;
      });
      featureCoverage.set(feature, count);
    });

    // Find underserved features
    featureCoverage.forEach((count, feature) => {
      const coverage = (count / this.competitors.size) * 100;
      if (coverage < 30) {
        opportunities.push(`Feature gap: Only ${coverage.toFixed(0)}% of competitors have "${feature}"`);
      }
    });

    return opportunities;
  }

  // Helper methods
  private extractKeywords(text: string): string[] {
    const keywords = ["AI", "agent", "autonomous", "coding", "developer", "IDE", "assistant", "copilot", "pair programming"];
    return keywords.filter(k => text.toLowerCase().includes(k.toLowerCase()));
  }

  private interpretFeatureChanges(added: string[], removed: string[]): string {
    if (added.includes("Agentic coding") || added.includes("Multi-file edits")) {
      return "Moving towards autonomous coding capabilities - following industry trend";
    }
    if (added.includes("Self-hosted") || added.includes("SSO/SAML")) {
      return "Enterprise push - targeting larger organizations";
    }
    if (removed.length > added.length) {
      return "Feature consolidation - possibly focusing on core capabilities";
    }
    return "Incremental feature expansion";
  }

  private interpretPositioning(added: string[], removed: string[]): string {
    if (added.includes("agent") || added.includes("autonomous")) {
      return "Shift from assistant to autonomous agent positioning";
    }
    if (added.includes("enterprise") || added.includes("team")) {
      return "Moving upmarket to enterprise customers";
    }
    if (removed.includes("AI") && added.includes("developer")) {
      return "De-emphasizing AI hype, focusing on developer experience";
    }
    return "Messaging refinement";
  }

  private assessUserImpact(competitor: string, changeType: string, details: any): string {
    if (changeType === "pricing" && details.newPricing?.individual?.price > details.oldPricing?.individual?.price) {
      return "Existing users may face price increases; budget-conscious developers may explore alternatives";
    }
    if (changeType === "feature" && details.added?.includes("Agentic coding")) {
      return "Users seeking autonomous coding capabilities now have another option";
    }
    return "Minimal immediate impact on users";
  }

  private generateRecommendations(competitor: string, changeType: string, severity: CompetitiveAlert["severity"]): string[] {
    const recs: string[] = [];

    if (changeType === "pricing" && severity === "high") {
      recs.push("Monitor user churn from competitor");
      recs.push("Consider targeted campaigns for price-sensitive users");
      recs.push("Highlight BYOK alternatives for cost-conscious developers");
    }

    if (changeType === "feature") {
      recs.push("Assess feature parity and roadmap priorities");
      recs.push("Update competitive comparison materials");
    }

    if (severity === "critical") {
      recs.push("Executive briefing recommended");
      recs.push("Consider strategic response");
    }

    return recs;
  }

  // Public methods
  async generateAlert(alert: CompetitiveAlert): Promise<void> {
    this.alerts.push(alert);
    await this.saveAlerts();
  }

  async saveAlerts(): Promise<void> {
    writeFileSync(this.alertsPath, JSON.stringify(this.alerts, null, 2));
  }

  getRecentAlerts(days: number = 7): CompetitiveAlert[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return this.alerts
      .filter(a => new Date(a.date) > cutoff)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getCompetitorProfile(name: string): CompetitorData | undefined {
    return this.competitors.get(name);
  }

  getAllCompetitors(): CompetitorData[] {
    return Array.from(this.competitors.values());
  }
}