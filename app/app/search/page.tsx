import { AISearch } from '@/components/ai-search';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Search - Ask About AI Coding Tools',
  description: 'Ask natural language questions about AI coding tools, pricing, features, and trends.',
};

export default function SearchPage() {
  return (
    <div className="min-h-[80vh] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            AI-Powered Search
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Ask questions about AI coding tools in natural language
          </p>
        </div>

        <AISearch />

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Compare Tools</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Ask about pricing differences, features, or performance between AI coding assistants
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Track Trends</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Find out what's trending, recent releases, and community discussions
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Get Insights</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Discover funding news, benchmark results, and market analysis
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}