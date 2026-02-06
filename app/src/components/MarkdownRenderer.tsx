import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MermaidDiagram } from './MermaidDiagram';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Custom syntax highlighter theme matching McLaren orange
const customTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '12px',
    padding: '16px',
    margin: '12px 0',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'transparent',
    fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
    fontSize: '13px',
  },
};

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle mermaid diagrams
  if (language === 'mermaid') {
    return <MermaidDiagram chart={value} className="my-4" />;
  }

  return (
    <div className="relative group my-4">
      <div className="absolute right-2 top-2 z-10">
        <button
          onClick={handleCopy}
          className="glass-button px-2 py-1 rounded-lg text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {language && (
        <div className="absolute left-3 top-0 transform -translate-y-1/2">
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-remembra-accent-primary/20 text-remembra-accent-primary border border-remembra-accent-primary/30">
            {language}
          </span>
        </div>
      )}
      <SyntaxHighlighter
        language={language || 'text'}
        style={customTheme}
        showLineNumbers={value.split('\n').length > 3}
        wrapLines
        lineNumberStyle={{
          color: 'rgba(255, 255, 255, 0.3)',
          minWidth: '2.5em',
          paddingRight: '1em',
          userSelect: 'none',
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks and inline code
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const value = String(children).replace(/\n$/, '');
            
            if (!inline && (language || value.includes('\n'))) {
              return <CodeBlock language={language} value={value} />;
            }
            
            return (
              <code 
                className="px-1.5 py-0.5 rounded bg-remembra-accent-primary/10 text-remembra-accent-primary text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          
          // Headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-white mb-4 mt-6 first:mt-0 border-b border-white/10 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-white mb-3 mt-5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-white mb-2 mt-4 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold text-white mb-2 mt-3 first:mt-0">
              {children}
            </h4>
          ),
          
          // Paragraphs
          p: ({ children }) => (
            <p className="text-remembra-text-secondary leading-relaxed mb-4 last:mb-0">
              {children}
            </p>
          ),
          
          // Links
          a: ({ href, children }) => (
            <a 
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-remembra-accent-primary hover:text-remembra-accent-secondary underline underline-offset-2 transition-colors"
            >
              {children}
            </a>
          ),
          
          // Lists
          ul: ({ children }) => (
            <ul className="list-none space-y-2 mb-4 last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-2 mb-4 last:mb-0 text-remembra-text-secondary">
              {children}
            </ol>
          ),
          li: ({ children, ordered }: any) => (
            <li className="text-remembra-text-secondary flex items-start gap-2">
              {!ordered && (
                <span className="w-1.5 h-1.5 rounded-full bg-remembra-accent-primary mt-2 flex-shrink-0" />
              )}
              <span className="flex-1">{children}</span>
            </li>
          ),
          
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-remembra-accent-primary pl-4 py-2 my-4 bg-remembra-accent-primary/5 rounded-r-xl">
              <div className="text-remembra-text-secondary italic">{children}</div>
            </blockquote>
          ),
          
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-white/10">
              <table className="w-full text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-remembra-bg-secondary border-b border-white/10">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-white/5">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-white/5 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-semibold text-white">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-remembra-text-secondary">
              {children}
            </td>
          ),
          
          // Horizontal rule
          hr: () => (
            <hr className="border-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-6" />
          ),
          
          // Images
          img: ({ src, alt }) => (
            <figure className="my-4">
              <img 
                src={src} 
                alt={alt}
                className="rounded-xl border border-white/10 max-w-full h-auto"
              />
              {alt && (
                <figcaption className="text-center text-xs text-remembra-text-muted mt-2">
                  {alt}
                </figcaption>
              )}
            </figure>
          ),
          
          // Strikethrough
          del: ({ children }) => (
            <del className="text-remembra-text-muted line-through">
              {children}
            </del>
          ),
          
          // Strong and emphasis
          strong: ({ children }) => (
            <strong className="font-semibold text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-remembra-text-primary">
              {children}
            </em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
