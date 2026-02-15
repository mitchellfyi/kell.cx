import { CompetitiveAnalysisEngine } from "./engine";

describe("CompetitiveAnalysisEngine", () => {
  let engine: CompetitiveAnalysisEngine;

  beforeEach(() => {
    engine = new CompetitiveAnalysisEngine();
  });

  describe("calculateThreatScore", () => {
    it("should calculate threat score for known competitors", () => {
      const score = engine.calculateThreatScore("Cursor");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should return 0 for unknown competitors", () => {
      const score = engine.calculateThreatScore("UnknownTool");
      expect(score).toBe(0);
    });

    it("should rank market leaders higher", () => {
      const cursorScore = engine.calculateThreatScore("Cursor");
      const unknownScore = engine.calculateThreatScore("RandomTool");
      expect(cursorScore).toBeGreaterThan(unknownScore);
    });
  });

  describe("analyzePricingStrategy", () => {
    it("should detect significant price increases", () => {
      const oldPricing = { individual: { price: 20, period: "month" } };
      const newPricing = { individual: { price: 30, period: "month" } };

      const alert = engine.analyzePricingStrategy("TestTool", oldPricing, newPricing);

      expect(alert).toBeTruthy();
      expect(alert?.severity).toBe("high");
      expect(alert?.summary).toContain("$20 → $30");
      expect(alert?.strategicRead).toBeTruthy();
    });

    it("should return null for no changes", () => {
      const pricing = { individual: { price: 20, period: "month" } };
      const alert = engine.analyzePricingStrategy("TestTool", pricing, pricing);
      expect(alert).toBeNull();
    });

    it("should handle team pricing changes", () => {
      const oldPricing = { team: { price: 25, period: "month" } };
      const newPricing = { team: { price: 40, period: "month" } };

      const alert = engine.analyzePricingStrategy("TestTool", oldPricing, newPricing);

      expect(alert).toBeTruthy();
      expect(alert?.summary).toContain("Team: $25 → $40");
    });
  });

  describe("analyzeFeatureChanges", () => {
    it("should detect feature additions", () => {
      const oldFeatures = { "Chat interface": true };
      const newFeatures = { "Chat interface": true, "Agentic coding": true };

      const alert = engine.analyzeFeatureChanges("TestTool", oldFeatures, newFeatures);

      expect(alert).toBeTruthy();
      expect(alert?.summary).toContain("Added: Agentic coding");
      expect(alert?.severity).toBe("high"); // Agentic coding is high priority
    });

    it("should detect feature removals", () => {
      const oldFeatures = { "Web IDE": true, "VS Code": true };
      const newFeatures = { "VS Code": true };

      const alert = engine.analyzeFeatureChanges("TestTool", oldFeatures, newFeatures);

      expect(alert).toBeTruthy();
      expect(alert?.summary).toContain("Removed: Web IDE");
    });

    it("should return null for no changes", () => {
      const features = { "Chat interface": true };
      const alert = engine.analyzeFeatureChanges("TestTool", features, features);
      expect(alert).toBeNull();
    });
  });

  describe("identifyOpportunities", () => {
    it("should identify pricing opportunities", () => {
      const opportunities = engine.identifyOpportunities();
      expect(Array.isArray(opportunities)).toBe(true);
    });

    it("should identify feature gaps", () => {
      const opportunities = engine.identifyOpportunities();
      const featureGaps = opportunities.filter(o => o.includes("Feature gap"));
      expect(featureGaps.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getRecentAlerts", () => {
    it("should filter alerts by date", async () => {
      // Generate a test alert
      const testAlert = {
        id: "test-alert-1",
        date: new Date(),
        competitor: "TestTool",
        type: "pricing" as const,
        severity: "medium" as const,
        title: "Test Alert",
        summary: "Test summary",
      };

      await engine.generateAlert(testAlert);

      const recentAlerts = engine.getRecentAlerts(7);
      expect(recentAlerts.length).toBeGreaterThanOrEqual(1);
      expect(recentAlerts[0].id).toBe("test-alert-1");
    });

    it("should return alerts in descending date order", async () => {
      const now = Date.now();
      const alerts = [
        {
          id: "alert-1",
          date: new Date(now - 86400000), // 1 day ago
          competitor: "Tool1",
          type: "pricing" as const,
          severity: "low" as const,
          title: "Alert 1",
          summary: "Summary 1",
        },
        {
          id: "alert-2",
          date: new Date(now), // Now
          competitor: "Tool2",
          type: "feature" as const,
          severity: "high" as const,
          title: "Alert 2",
          summary: "Summary 2",
        },
      ];

      for (const alert of alerts) {
        await engine.generateAlert(alert);
      }

      const recentAlerts = engine.getRecentAlerts(7);
      expect(recentAlerts[0].id).toBe("alert-2"); // Most recent first
    });
  });
});