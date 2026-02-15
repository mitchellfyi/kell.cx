#!/usr/bin/env node
/**
 * Demo script to test AI-powered insight generation
 * Shows the difference between rule-based and AI insights
 */

const fs = require('fs');
const path = require('path');
const AIInsightGenerator = require('./lib/ai-insights');
const CrossSourceAnalyzer = require('./lib/cross-source-analyzer');

// Create sample data for demonstration
const sampleData = {
  vscode: {
    extensions: [
      { name: "GitHub Copilot", publisher: "GitHub", installs: 71400000, trendingMonthly: 5.2 },
      { name: "Copilot Chat", publisher: "GitHub", installs: 61400000, trendingMonthly: 8.1 },
      { name: "Cline", publisher: "SaaSKnight", installs: 3100000, trendingMonthly: 45.3 },
      { name: "Continue", publisher: "Continue", installs: 2100000, trendingMonthly: 32.7 },
      { name: "BLACKBOXAI", publisher: "Blackbox", installs: 4800000, trendingMonthly: 12.5 }
    ]
  },
  releases: {
    recentReleases: [
      { company: "LiteLLM", tag: "v1.81.3", publishedAt: new Date(Date.now() - 86400000).toISOString() },
      { company: "llama.cpp", tag: "b7999", publishedAt: new Date(Date.now() - 172800000).toISOString() },
      { company: "Continue", tag: "v0.9.45", publishedAt: new Date(Date.now() - 259200000).toISOString() },
      { company: "Cline", tag: "v2.1.0", publishedAt: new Date(Date.now() - 345600000).toISOString() }
    ]
  },
  hn: {
    stories: [
      { title: "Ex-GitHub CEO launching new developer platform", points: 592, comments: 234 },
      { title: "AI agents violate ethical constraints 30-50% when pressured by KPIs", points: 537, comments: 189 },
      { title: "Claude Code Is Being Dumbed Down", points: 388, comments: 156 },
      { title: "GLM-5: From Vibe Coding to Agentic Engineering", points: 268, comments: 87 }
    ]
  },
  hiring: {
    current: {
      "GitHub": 45,
      "Anthropic": 32,
      "OpenAI": 28,
      "Cursor": 15,
      "Codeium": 12
    },
    history: [
      { date: new Date(Date.now() - 7 * 86400000).toISOString(), counts: { "GitHub": 38, "Anthropic": 25, "Cursor": 10 } },
      { date: new Date().toISOString(), counts: { "GitHub": 45, "Anthropic": 32, "Cursor": 15 } }
    ]
  },
  pricing: {
    changes: [
      { company: "Cursor", date: new Date(Date.now() - 86400000).toISOString(), description: "New team pricing tier added" },
      { company: "Replit", date: new Date(Date.now() - 172800000).toISOString(), description: "Agent pricing model introduced" }
    ]
  },
  momentum: {
    rankings: [
      { company: "Cursor", score: 92 },
      { company: "Anthropic", score: 88 },
      { company: "GitHub", score: 85 },
      { company: "Codeium", score: 78 }
    ]
  }
};

async function runDemo() {
  console.log('🎯 AI-Powered Insight Generation Demo\n');
  console.log('=' .repeat(60));

  // 1. Show Cross-Source Pattern Analysis
  console.log('\n📊 CROSS-SOURCE PATTERN ANALYSIS');
  console.log('-'.repeat(40));

  const analyzer = new CrossSourceAnalyzer();
  const patterns = analyzer.analyzePatterns(sampleData);

  console.log(`\nFound ${patterns.length} significant patterns:\n`);
  patterns.slice(0, 5).forEach((pattern, i) => {
    console.log(`${i + 1}. ${pattern.message}`);
    if (pattern.details) {
      console.log(`   Details: ${JSON.stringify(pattern.details).slice(0, 100)}...`);
    }
  });

  // 2. Show AI Insight Generation (if API key available)
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('\n\n🤖 AI-GENERATED INSIGHTS');
    console.log('-'.repeat(40));

    try {
      const aiGen = new AIInsightGenerator();
      const insights = await aiGen.generateDailyInsights(sampleData);

      console.log(`\nSummary: ${insights.summary}\n`);

      console.log('VS Code Insights:');
      insights.vscode?.slice(0, 3).forEach(i => console.log(`• ${i}`));

      console.log('\nNews & Sentiment:');
      insights.news?.slice(0, 3).forEach(i => console.log(`• ${i}`));

      console.log('\nMarket Analysis:');
      insights.market?.slice(0, 3).forEach(i => console.log(`• ${i}`));

      // Save demo output
      const outputFile = path.join(__dirname, '..', 'data', 'demo-ai-insights.json');
      fs.writeFileSync(outputFile, JSON.stringify({
        generated: new Date().toISOString(),
        patterns,
        aiInsights: insights
      }, null, 2));

      console.log(`\n✅ Demo complete! Results saved to ${outputFile}`);

    } catch (error) {
      console.error('\nAI generation failed:', error.message);
      console.log('Set ANTHROPIC_API_KEY environment variable to enable AI insights');
    }
  } else {
    console.log('\n⚠️  No ANTHROPIC_API_KEY found');
    console.log('Set the environment variable to see AI-generated insights');
    console.log('Example: ANTHROPIC_API_KEY=your-key-here node scripts/demo-ai-insights.js');
  }

  // 3. Show the difference
  console.log('\n\n💡 KEY DIFFERENCES');
  console.log('-'.repeat(40));
  console.log('Rule-based detection:');
  console.log('• Looks for threshold violations (e.g., >50% growth)');
  console.log('• Reports individual metrics');
  console.log('• Limited context understanding');

  console.log('\nAI-powered insights:');
  console.log('• Connects patterns across data sources');
  console.log('• Explains WHY something matters');
  console.log('• Generates narrative with market context');
  console.log('• Identifies emerging themes and sentiment shifts');
}

// Run the demo
runDemo().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});