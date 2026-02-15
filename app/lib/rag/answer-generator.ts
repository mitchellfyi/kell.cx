import { SearchContext, Document } from './context-gatherer';

export interface GeneratedAnswer {
  text: string;
  sources: Array<{
    title: string;
    url?: string;
    type: string;
  }>;
  confidence: number;
}

// Template-based answer generation (can be replaced with actual LLM integration)
export async function generateAnswer(
  question: string,
  context: SearchContext
): Promise<GeneratedAnswer> {
  const sources: GeneratedAnswer['sources'] = [];
  let answerText = '';
  let confidence = 0;

  // Categorize documents by type
  const docsByType = context.documents.reduce((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  // Detect question type
  const questionLower = question.toLowerCase();
  const isComparison = questionLower.includes('compare') || questionLower.includes('vs') || questionLower.includes('versus');
  const isPricing = questionLower.includes('pric') || questionLower.includes('cost') || questionLower.includes('free');
  const isTrend = questionLower.includes('trend') || questionLower.includes('popular') || questionLower.includes('happening');
  const isFunding = questionLower.includes('fund') || questionLower.includes('rais') || questionLower.includes('valuation');
  const isBenchmark = questionLower.includes('benchmark') || questionLower.includes('performance') || questionLower.includes('best');

  // Generate answer based on question type and available data
  if (isComparison && isPricing && docsByType.pricing?.length >= 2) {
    // Pricing comparison
    const pricingDocs = docsByType.pricing.slice(0, 4);
    answerText = generatePricingComparison(pricingDocs);
    pricingDocs.forEach(doc => {
      if (doc.metadata.title && doc.metadata.source) {
        sources.push({
          title: doc.metadata.title,
          url: `https://${doc.metadata.source}`,
          type: 'pricing'
        });
      }
    });
    confidence = 0.9;
  } else if (isFunding && docsByType.news) {
    // Funding news
    const fundingNews = docsByType.news.filter(doc =>
      doc.content.toLowerCase().includes('funding') ||
      doc.content.toLowerCase().includes('raised') ||
      doc.content.toLowerCase().includes('valuation')
    ).slice(0, 5);

    if (fundingNews.length > 0) {
      answerText = generateFundingAnswer(fundingNews);
      fundingNews.forEach(doc => {
        if (doc.metadata.title) {
          sources.push({
            title: doc.metadata.title,
            url: doc.metadata.url,
            type: 'news'
          });
        }
      });
      confidence = 0.85;
    }
  } else if (isTrend && (docsByType.stats || docsByType.hackernews)) {
    // Trend analysis
    const trendDocs = [
      ...(docsByType.stats || []).slice(0, 3),
      ...(docsByType.hackernews || []).slice(0, 3)
    ];
    answerText = generateTrendAnswer(trendDocs);
    trendDocs.forEach(doc => {
      if (doc.metadata.title) {
        sources.push({
          title: doc.metadata.title,
          url: doc.metadata.url,
          type: doc.type
        });
      }
    });
    confidence = 0.8;
  } else if (isBenchmark && docsByType.benchmark) {
    // Benchmark comparison
    answerText = generateBenchmarkAnswer(docsByType.benchmark.slice(0, 5));
    docsByType.benchmark.slice(0, 5).forEach(doc => {
      if (doc.metadata.title) {
        sources.push({
          title: doc.metadata.title,
          url: doc.metadata.url,
          type: 'benchmark'
        });
      }
    });
    confidence = 0.85;
  } else if (context.documents.length > 0) {
    // General answer from available context
    answerText = generateGeneralAnswer(context.documents.slice(0, 5));
    context.documents.slice(0, 5).forEach(doc => {
      if (doc.metadata.title) {
        sources.push({
          title: doc.metadata.title,
          url: doc.metadata.url,
          type: doc.type
        });
      }
    });
    confidence = 0.7;
  } else {
    answerText = "I couldn't find specific information to answer your question. Please try asking about AI coding tool pricing, recent news, benchmarks, or specific tools like Cursor, GitHub Copilot, or Claude Code.";
    confidence = 0.3;
  }

  // Remove duplicate sources
  const uniqueSources = sources.filter((source, index, self) =>
    index === self.findIndex(s => s.title === source.title)
  );

  return {
    text: answerText,
    sources: uniqueSources,
    confidence
  };
}

function generatePricingComparison(pricingDocs: Document[]): string {
  const pricing = pricingDocs.map(doc => {
    const parts = doc.content.split('. ');
    const name = parts[0].split(':')[0];
    const details = parts.join('. ');
    return { name, details };
  });

  let answer = `Here's a pricing comparison of ${pricing.map(p => p.name).join(', ')}:\n\n`;

  pricing.forEach(p => {
    answer += `**${p.name}**: ${p.details}\n\n`;
  });

  // Add analysis
  const hasFreeTier = pricing.filter(p => p.details.includes('Free tier available')).map(p => p.name);
  if (hasFreeTier.length > 0) {
    answer += `Tools with free tiers: ${hasFreeTier.join(', ')}. `;
  }

  return answer.trim();
}

function generateFundingAnswer(fundingDocs: Document[]): string {
  let answer = "Recent funding activity in AI coding tools:\n\n";

  fundingDocs.forEach(doc => {
    const date = doc.metadata.date ? new Date(doc.metadata.date).toLocaleDateString() : 'Recently';
    answer += `• ${doc.content} (${date})\n`;
  });

  return answer.trim();
}

function generateTrendAnswer(trendDocs: Document[]): string {
  let answer = "Current trends in AI coding tools:\n\n";

  const vscodeStats = trendDocs.filter(d => d.type === 'stats');
  const hnStories = trendDocs.filter(d => d.type === 'hackernews');

  if (vscodeStats.length > 0) {
    answer += "**Popular VS Code Extensions:**\n";
    vscodeStats.forEach(doc => {
      answer += `• ${doc.content}\n`;
    });
    answer += "\n";
  }

  if (hnStories.length > 0) {
    answer += "**Trending on Hacker News:**\n";
    hnStories.forEach(doc => {
      answer += `• ${doc.content}\n`;
    });
  }

  return answer.trim();
}

function generateBenchmarkAnswer(benchmarkDocs: Document[]): string {
  let answer = "AI coding model performance benchmarks:\n\n";

  benchmarkDocs.forEach((doc, index) => {
    answer += `${index + 1}. ${doc.content}\n`;
  });

  answer += "\nHigher scores indicate better code generation accuracy. Costs shown are per task completion.";

  return answer.trim();
}

function generateGeneralAnswer(docs: Document[]): string {
  let answer = "Based on the available data:\n\n";

  docs.forEach(doc => {
    const type = doc.type.charAt(0).toUpperCase() + doc.type.slice(1);
    answer += `• [${type}] ${doc.content}\n`;
  });

  return answer.trim();
}