/**
 * Master list of companies and products we track.
 * This is the canonical source - all data pages should reference this.
 * Customers value knowing we cover all their competitors.
 * Show gaps explicitly rather than hiding them.
 */

export type ProductType = "ide" | "cli" | "web" | "model" | "platform";

export interface Product {
  name: string;
  type: ProductType;
  description: string;
  website?: string;
  github?: string;
  vscodeId?: string;
  jetbrainsId?: string;
}

export interface Company {
  name: string;
  website: string;
  products: Product[];
  // Which foundation models they use or provide
  models?: string[];
  // Are they vertically integrated (make their own models)?
  vertical?: boolean;
}

export const companies: Company[] = [
  // === Vertically Integrated (make models + products) ===
  {
    name: "OpenAI",
    website: "openai.com",
    vertical: true,
    models: ["GPT-5", "GPT-5.3-Codex", "o3", "o4-mini"],
    products: [
      { name: "Codex", type: "web", description: "Cloud-based AI coding environment", website: "https://openai.com/codex" },
      { name: "ChatGPT", type: "web", description: "General AI assistant with code capabilities" },
    ],
  },
  {
    name: "Anthropic",
    website: "anthropic.com",
    vertical: true,
    models: ["Claude Opus 4.6", "Claude Sonnet 4", "Claude Haiku 4"],
    products: [
      { name: "Claude Code", type: "cli", description: "Terminal-based coding agent", github: "anthropics/claude-code" },
    ],
  },
  {
    name: "Google",
    website: "ai.google",
    vertical: true,
    models: ["Gemini 2.5 Pro", "Gemini 2.5 Flash"],
    products: [
      { name: "AI Studio", type: "web", description: "Model playground and prototyping" },
      { name: "IDX", type: "web", description: "Cloud-based development environment" },
    ],
  },

  // === Product-First (build on others' models) ===
  {
    name: "Cursor",
    website: "cursor.com",
    models: ["Claude Sonnet 4", "GPT-5", "Custom"],
    products: [
      { name: "Cursor", type: "ide", description: "AI-native code editor (VS Code fork)", website: "https://cursor.com" },
    ],
  },
  {
    name: "Codeium",
    website: "codeium.com",
    products: [
      { name: "Windsurf", type: "ide", description: "AI-powered IDE", website: "https://codeium.com/windsurf" },
      { name: "Codeium", type: "ide", description: "VS Code/JetBrains extension", vscodeId: "Codeium.codeium" },
    ],
  },
  {
    name: "GitHub",
    website: "github.com",
    models: ["GPT-5.3-Codex"],
    products: [
      { name: "GitHub Copilot", type: "ide", description: "AI pair programmer", vscodeId: "GitHub.copilot" },
      { name: "Copilot Chat", type: "ide", description: "Conversational coding assistant" },
    ],
  },
  {
    name: "Sourcegraph",
    website: "sourcegraph.com",
    models: ["Claude Sonnet 4", "GPT-5"],
    products: [
      { name: "Cody", type: "ide", description: "Codebase-aware AI assistant", vscodeId: "sourcegraph.cody-ai", github: "sourcegraph/cody" },
    ],
  },
  {
    name: "JetBrains",
    website: "jetbrains.com",
    products: [
      { name: "JetBrains AI", type: "ide", description: "AI assistant for JetBrains IDEs" },
    ],
  },
  {
    name: "Amazon",
    website: "aws.amazon.com",
    products: [
      { name: "Amazon Q Developer", type: "ide", description: "AI coding assistant with AWS integration", vscodeId: "AmazonWebServices.amazon-q-vscode" },
    ],
  },
  {
    name: "Tabnine",
    website: "tabnine.com",
    products: [
      { name: "Tabnine", type: "ide", description: "AI code completion with enterprise focus", vscodeId: "TabNine.tabnine-vscode" },
    ],
  },

  // === CLI/Terminal Tools ===
  {
    name: "Aider",
    website: "aider.chat",
    products: [
      { name: "Aider", type: "cli", description: "CLI coding agent (BYOK)", github: "Aider-AI/aider" },
    ],
  },
  {
    name: "Cline",
    website: "github.com/cline/cline",
    products: [
      { name: "Cline", type: "cli", description: "VS Code extension for agentic coding", github: "cline/cline", vscodeId: "saoudrizwan.claude-dev" },
    ],
  },
  {
    name: "Continue",
    website: "continue.dev",
    products: [
      { name: "Continue", type: "ide", description: "Open-source AI code assistant", github: "continuedev/continue", vscodeId: "Continue.continue" },
    ],
  },

  // === Web-Based Builders ===
  {
    name: "Replit",
    website: "replit.com",
    products: [
      { name: "Replit Agent", type: "web", description: "AI app builder with hosting" },
    ],
  },
  {
    name: "StackBlitz",
    website: "stackblitz.com",
    products: [
      { name: "Bolt", type: "web", description: "AI-powered web development" },
    ],
  },
  {
    name: "Vercel",
    website: "vercel.com",
    products: [
      { name: "v0", type: "web", description: "AI UI generation" },
    ],
  },
  {
    name: "Lovable",
    website: "lovable.dev",
    products: [
      { name: "Lovable", type: "web", description: "Full-stack app builder" },
    ],
  },
  {
    name: "Cognition",
    website: "cognition.ai",
    products: [
      { name: "Devin", type: "web", description: "Autonomous AI software engineer" },
    ],
  },

  // === Model Providers (no direct coding products) ===
  {
    name: "xAI",
    website: "x.ai",
    vertical: true,
    models: ["Grok 4", "Grok 3"],
    products: [],
  },
  {
    name: "Mistral",
    website: "mistral.ai",
    vertical: true,
    models: ["Codestral", "Mistral Large"],
    products: [],
  },
  {
    name: "Meta",
    website: "ai.meta.com",
    vertical: true,
    models: ["Llama 4 Scout", "Llama 4 Maverick"],
    products: [],
  },
];

// Helper functions
export function getAllProducts(): Product[] {
  return companies.flatMap(c => c.products);
}

export function getProductsByType(type: ProductType): Product[] {
  return getAllProducts().filter(p => p.type === type);
}

export function getCompanyByProduct(productName: string): Company | undefined {
  return companies.find(c => c.products.some(p => p.name === productName));
}

export function getVerticalCompanies(): Company[] {
  return companies.filter(c => c.vertical);
}

export function getAllModels(): string[] {
  return [...new Set(companies.flatMap(c => c.models || []))];
}

// Stats
export const stats = {
  totalCompanies: companies.length,
  totalProducts: getAllProducts().length,
  ideProducts: getProductsByType("ide").length,
  cliProducts: getProductsByType("cli").length,
  webProducts: getProductsByType("web").length,
  modelProviders: getVerticalCompanies().length,
};
