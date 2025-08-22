import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Custom rendering for different markdown elements
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold mt-4 mb-3 text-blue-400">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-bold mt-4 mb-2 text-blue-300">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold mt-3 mb-2 text-blue-200">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="mb-3 leading-relaxed text-gray-100">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-3 space-y-1 text-gray-100">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-100">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="ml-4 text-gray-100">{children}</li>
        ),
        strong: ({ children }) => (
          <strong className="font-bold text-yellow-300">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-gray-300">{children}</em>
        ),
        code: ({ inline, children }) => {
          if (inline) {
            return (
              <code className="px-1.5 py-0.5 bg-gray-800 text-green-300 rounded text-sm font-mono">
                {children}
              </code>
            );
          }
          return (
            <code className="block p-3 bg-gray-900 text-green-300 rounded-lg font-mono text-sm overflow-x-auto my-3">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-gray-900 rounded-lg overflow-x-auto my-3">{children}</pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-500 pl-4 italic my-3 text-gray-300">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3">
            <table className="min-w-full border border-gray-700">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-gray-800">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-gray-700">{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-gray-800/50 transition-colors">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2 text-left font-semibold text-blue-300">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2 text-gray-100">{children}</td>
        ),
        hr: () => (
          <hr className="my-4 border-gray-700" />
        ),
        a: ({ href, children }) => (
          <a 
            href={href} 
            className="text-blue-400 hover:text-blue-300 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;