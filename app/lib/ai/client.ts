/**
 * Client-side AI integration for static export
 *
 * Since this is a static export site, we need to use external AI services
 * through client-side fetch or server actions (when not in static mode).
 *
 * Options:
 * 1. Use Vercel Edge Functions (requires Vercel deployment)
 * 2. Use external AI API proxy service
 * 3. Switch to non-static export for API routes
 * 4. Use server components with dynamic rendering
 */

export interface AIClientConfig {
  endpoint?: string; // External AI service endpoint
  apiKey?: string;   // Public API key (if safe to expose)
}

export class AIClient {
  constructor(private config: AIClientConfig = {}) {}

  /**
   * Generate insights using external AI service
   * This would connect to your backend AI service or edge function
   */
  async generateInsights(data: any): Promise<{
    insights: string[];
    confidence: number;
    metadata: any;
  }> {
    const endpoint = this.config.endpoint || '/api/ai/insights';

    // In production, this would call your edge function or external service
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Generate analysis using external AI service
   */
  async generateAnalysis(params: {
    type: string;
    context: string;
    data: any;
  }): Promise<any> {
    const endpoint = this.config.endpoint || '/api/ai/analyze';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    return response.json();
  }
}

// Singleton instance
export const aiClient = new AIClient();