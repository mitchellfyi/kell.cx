'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => (
          <h2 className="text-xl font-semibold tracking-tight mt-10 mb-4 text-white">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-medium mt-8 mb-3 text-white">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="text-zinc-300 leading-relaxed mb-4">
            {children}
          </p>
        ),
        a: ({ href, children }) => (
          <a 
            href={href} 
            className="text-blue-400 hover:text-blue-300 hover:underline"
          >
            {children}
          </a>
        ),
        strong: ({ children }) => (
          <strong className="text-white font-medium">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="text-zinc-200">{children}</em>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-');
          if (isBlock) {
            return (
              <code className="block bg-zinc-900 border border-white/10 rounded-lg p-4 text-sm text-zinc-200 overflow-x-auto">
                {children}
              </code>
            );
          }
          return (
            <code className="bg-zinc-800 text-zinc-200 px-1.5 py-0.5 rounded text-sm">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="my-4">{children}</pre>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-outside ml-4 mb-4 space-y-1 text-zinc-300">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-outside ml-4 mb-4 space-y-1 text-zinc-300">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        hr: () => (
          <hr className="border-white/10 my-10" />
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-zinc-600 pl-4 my-4 text-zinc-400 italic">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="my-6 overflow-x-auto">
            <table className="w-full text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-white/10">
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-white/5">
            {children}
          </tbody>
        ),
        tr: ({ children }) => (
          <tr>{children}</tr>
        ),
        th: ({ children }) => (
          <th className="text-left text-zinc-300 font-medium py-2 pr-4">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="text-zinc-400 py-2 pr-4">
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
