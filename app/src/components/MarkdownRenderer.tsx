import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MermaidDiagram } from './MermaidDiagram';
import { Copy, Check, Code2 } from 'lucide-react';
import { useState } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// VS Code-like syntax theme with McLaren orange accents
const vscodeTheme = {
  ...vscDarkPlus,
  'pre[class*="language-"]': {
    ...vscDarkPlus['pre[class*="language-"]'],
    background: '#1E1E1E',
    borderRadius: '8px',
    padding: '16px',
    margin: '12px 0',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
  },
  'code[class*="language-"]': {
    ...vscDarkPlus['code[class*="language-"]'],
    background: 'transparent',
    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Source Code Pro", Consolas, monospace',
    fontSize: '13px',
    lineHeight: '1.6',
    textShadow: 'none',
  },
  // Enhanced token colors for VS Code feel
  'comment': { color: '#6A9955', fontStyle: 'italic' },
  'prolog': { color: '#6A9955' },
  'doctype': { color: '#6A9955' },
  'cdata': { color: '#6A9955' },
  'punctuation': { color: '#D4D4D4' },
  'property': { color: '#9CDCFE' },
  'tag': { color: '#569CD6' },
  'boolean': { color: '#569CD6' },
  'number': { color: '#B5CEA8' },
  'constant': { color: '#4FC1FF' },
  'symbol': { color: '#B5CEA8' },
  'deleted': { color: '#CE9178' },
  'selector': { color: '#D7BA7D' },
  'attr-name': { color: '#9CDCFE' },
  'string': { color: '#CE9178' },
  'char': { color: '#CE9178' },
  'builtin': { color: '#4EC9B0' },
  'inserted': { color: '#B5CEA8' },
  'operator': { color: '#D4D4D4' },
  'entity': { color: '#4EC9B0', cursor: 'help' },
  'url': { color: '#4EC9B0' },
  'variable': { color: '#9CDCFE' },
  'atrule': { color: '#C586C0' },
  'attr-value': { color: '#CE9178' },
  'function': { color: '#DCDCAA' },
  'class-name': { color: '#4EC9B0' },
  'keyword': { color: '#C586C0' },
  'regex': { color: '#D16969' },
  'important': { color: '#569CD6', fontWeight: 'bold' },
};

// Language display names mapping
const languageLabels: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  tsx: 'TypeScript React',
  jsx: 'JavaScript React',
  py: 'Python',
  python: 'Python',
  rb: 'Ruby',
  ruby: 'Ruby',
  go: 'Go',
  rust: 'Rust',
  rs: 'Rust',
  java: 'Java',
  kotlin: 'Kotlin',
  kt: 'Kotlin',
  swift: 'Swift',
  c: 'C',
  cpp: 'C++',
  'c++': 'C++',
  cs: 'C#',
  csharp: 'C#',
  php: 'PHP',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sass: 'Sass',
  less: 'Less',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  xml: 'XML',
  sql: 'SQL',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  powershell: 'PowerShell',
  ps1: 'PowerShell',
  markdown: 'Markdown',
  md: 'Markdown',
  docker: 'Dockerfile',
  dockerfile: 'Dockerfile',
  graphql: 'GraphQL',
  vue: 'Vue',
  svelte: 'Svelte',
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

  const displayLanguage = languageLabels[language?.toLowerCase()] || language?.toUpperCase() || 'TEXT';
  const lineCount = value.split('\n').length;

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden">
      {/* VS Code-like header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-white/5">
        <div className="flex items-center gap-2">
          <Code2 size={14} className="text-remembra-accent-primary" />
          <span className="text-xs font-medium text-remembra-text-secondary">
            {displayLanguage}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-remembra-text-muted">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-white/5 hover:bg-white/10 text-remembra-text-secondary hover:text-remembra-text-primary transition-all"
          >
            {copied ? <Check size={12} className="text-remembra-success" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      
      {/* Code content */}
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscodeTheme}
        showLineNumbers={lineCount > 3}
        wrapLines
        wrapLongLines
        lineNumberStyle={{
          color: '#858585',
          minWidth: '3em',
          paddingRight: '1.5em',
          userSelect: 'none',
          borderRight: '1px solid #404040',
          marginRight: '1em',
        }}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: '#1E1E1E',
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
