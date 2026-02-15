"use client";

import { useState, FormEvent, useEffect } from 'react';
import { Search, Loader2, AlertCircle, MessageSquare } from 'lucide-react';

interface SearchResult {
  answer: string;
  sources: Array<{
    title: string;
    url?: string;
    type: string;
  }>;
  confidence?: number;
}

interface SuggestedQuestion {
  text: string;
  category: string;
}

const suggestedQuestions: SuggestedQuestion[] = [
  { text: "Which AI coding tools have raised funding recently?", category: "Funding" },
  { text: "Compare Cursor vs Windsurf pricing", category: "Pricing" },
  { text: "What's trending with GitHub Copilot?", category: "Trends" },
  { text: "Show me CLI-based coding tools", category: "Tools" }
];

export function AISearch() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem('ai-search-history');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: question.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      setResult(data);

      // Update search history
      const newHistory = [question, ...searchHistory.filter(q => q !== question)].slice(0, 5);
      setSearchHistory(newHistory);
      localStorage.setItem('ai-search-history', JSON.stringify(newHistory));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuestion(suggestion);
    // Trigger search automatically
    const form = document.getElementById('search-form') as HTMLFormElement;
    if (form) {
      form.requestSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search Form */}
      <form id="search-form" onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about AI coding tools..."
            maxLength={500}
            disabled={loading}
            className="w-full px-4 py-3 pr-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>

      {/* Suggested Questions */}
      {!result && !loading && (
        <div className="mt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Try asking:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestedQuestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion.text)}
                className="text-left p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span className="text-xs text-gray-500 dark:text-gray-400">{suggestion.category}</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{suggestion.text}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search History */}
      {!result && !loading && searchHistory.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Recent searches:</p>
          <div className="space-y-1">
            {searchHistory.map((historyItem, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(historyItem)}
                className="block w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
              >
                {historyItem}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Search Result */}
      {result && (
        <div className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start mb-4">
              <MessageSquare className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
              <div className="flex-1">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {result.answer.split('\n').map((paragraph, index) => {
                    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                      return <h3 key={index} className="text-base font-semibold mt-4 mb-2">{paragraph.replace(/\*\*/g, '')}</h3>;
                    } else if (paragraph.startsWith('•')) {
                      return <li key={index} className="ml-4">{paragraph.substring(2)}</li>;
                    } else if (paragraph.trim()) {
                      return <p key={index} className="mb-3">{paragraph}</p>;
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>

            {/* Sources */}
            {result.sources.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Sources:</h4>
                <ul className="space-y-1">
                  {result.sources.map((source, index) => (
                    <li key={index} className="text-sm">
                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {source.title}
                        </a>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">{source.title}</span>
                      )}
                      <span className="text-gray-500 dark:text-gray-500 ml-2">({source.type})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confidence Indicator */}
            {result.confidence !== undefined && (
              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                Confidence: {Math.round(result.confidence * 100)}%
              </div>
            )}
          </div>

          {/* Ask Another Question */}
          <button
            onClick={() => {
              setResult(null);
              setQuestion('');
            }}
            className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Ask another question
          </button>
        </div>
      )}
    </div>
  );
}