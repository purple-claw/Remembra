/**
 * MarkdownRenderer — Smart Optimized Engine
 *
 * Optimization pipeline:
 *  1. Content fingerprinted; unchanged content short-circuits via React.memo.
 *  2. useDeferredValue keeps old tree visible during fast content changes.
 *  3. Large content (>60 KB) split at heading boundaries and rendered
 *     progressively via requestIdleCallback — first chunk visible immediately.
 *  4. Code blocks use a deferred swap: plain text shown instantly, Prism
 *     syntax highlighting swaps in after the next animation frame (rAF).
 *  5. Large code blocks (>400 lines) collapsed by default with expand toggle.
 *  6. Mermaid diagrams guarded by IntersectionObserver — only mounts when
 *     the diagram scrolls into view (200 px sentinel margin).
 *  7. All internal sub-components wrapped in React.memo with stable refs.
 *  8. Component map lives outside render so ReactMarkdown never remounts.
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import katex from 'katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { MermaidDiagram } from './MermaidDiagram';
import { Copy, Check, Code2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// ─── Thresholds ───────────────────────────────────────────────────────────────
const PROGRESSIVE_THRESHOLD = 60_000;  // split into chunks for content > 60 KB
const LARGE_CODE_LINES = 400;          // collapse code blocks with more lines
const CODE_PREVIEW_LINES = 50;         // lines shown when collapsed

const MATH_LANGUAGES = new Set(['math', 'latex', 'tex', 'katex']);

const normalizeMathSource = (source: string) => {
  let s = source.trim();

  // Common delimiters: $$...$$, $...$, \(...\), \[...\]
  if (s.startsWith('$$') && s.endsWith('$$')) return s.slice(2, -2).trim();
  if (s.startsWith('$') && s.endsWith('$')) return s.slice(1, -1).trim();
  if (s.startsWith('\\(') && s.endsWith('\\)')) return s.slice(2, -2).trim();
  if (s.startsWith('\\[') && s.endsWith('\\]')) return s.slice(2, -2).trim();

  // Fallback: strip a single pair of parentheses if present (guarded)
  return s;
};

const preprocessMathDelimiters = (content: string) => {
  const fenceRegex = /^\s*(```|~~~)/;
  const inlineCodeRegex = /(`+)([^`]*?)\1/g;

  const convertSegment = (segment: string) => {
    const stash: string[] = [];
    const protectedSegment = segment.replace(inlineCodeRegex, (match) => {
      const key = `__INLINE_CODE_${stash.length}__`;
      stash.push(match);
      return key;
    });

    let replaced = protectedSegment
      .replace(/\\\[((?:.|\n)*?)\\\]/g, (_, inner) => `$$${inner}$$`)
      .replace(/\\\(((?:.|\n)*?)\\\)/g, (_, inner) => `$${inner}$`);

    stash.forEach((value, idx) => {
      replaced = replaced.replace(`__INLINE_CODE_${idx}__`, value);
    });

    return replaced;
  };

  const lines = content.split('\n');
  let inFence = false;
  let buffer = '';
  let output = '';

  const flushBuffer = () => {
    if (!buffer) return;
    output += convertSegment(buffer);
    buffer = '';
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const isFence = fenceRegex.test(line);

    if (isFence) {
      flushBuffer();
      inFence = !inFence;
      output += line;
    } else if (inFence) {
      output += line;
    } else {
      buffer += line;
    }

    if (i < lines.length - 1) {
      if (inFence) {
        output += '\n';
      } else {
        buffer += '\n';
      }
    }
  }

  flushBuffer();
  return output;
};


const renderKatexHtml = (value: string, displayMode: boolean) => {
  try {
    // First try with strict error reporting so we can capture and log
    // problematic expressions during debugging. If that throws, fall
    // back to a non-throwing render so the UI stays intact.
    try {
      return katex.renderToString(value, { displayMode, throwOnError: true, strict: 'ignore' });
    } catch (err) {
      // Log the value and the error to aid debugging of failing formulas.
      // Keep logs concise to avoid leaking large user content.
      const snippet = String(value).slice(0, 240).replace(/\n/g, ' ');
      // eslint-disable-next-line no-console
      console.warn('[KaTeX] render error for:', snippet, err && (err as Error).message);
      return katex.renderToString(value, { displayMode, throwOnError: false, strict: 'ignore' });
    }
  } catch {
    return '';
  }
};

// Heuristic to decide whether a math block should be rendered as a
// centered display equation (important/complex) or kept inline so it
// flows with the surrounding sentence (variables/constants).
const prefersDisplayMath = (src: string) => {
  const s = src.trim();
  if (!s) return false;

  // Definitely display if it's multi-line, uses alignment environments,
  // or explicit display commands.
  if (s.includes('\n') || /\\begin\{/.test(s) || s.includes('&') || s.includes('\\displaystyle')) return true;

  // Complex operators or large constructs that usually deserve centering.
  if (/\\(int|sum|prod|lim|frac|partial|nabla|derivative|displaystyle)/.test(s)) return true;

  // Detect derivative-like patterns (\frac{d}{dt}, d/dt, \partial)
  if (/\\frac\s*\{\s*d|d\/d|\\partial/.test(s)) return true;

  // Very long expressions are probably important enough to center.
  if (s.length > 120) return true;

  // Otherwise prefer inline rendering so variables/constants follow sentence flow.
  return false;
};

const MathInline = memo(function MathInline({ value }: { value: string }) {
  const html = renderKatexHtml(value, false);
  if (!html) {
    return <span className="math-inline text-remembra-text-secondary">{value}</span>;
  }
  return <span className="math-inline" dangerouslySetInnerHTML={{ __html: html }} />;
});

const MathBlock = memo(function MathBlock({ value }: { value: string }) {
  // Decide whether this math block should be shown as a centered
  // display equation or as an inline fragment that flows with text.
  const useDisplay = prefersDisplayMath(value);
  const html = renderKatexHtml(value, useDisplay);

  if (!html) {
    return (
      <pre className="my-2 whitespace-pre-wrap text-sm text-remembra-text-secondary">{value}</pre>
    );
  }

  if (useDisplay) {
    const shortDisplay = value.replace(/\s+/g, '').length < 60;
    const cls = `math-display-wrapper${shortDisplay ? ' katex-short' : ''}`;
    return (
      <div
        className={cls}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // Render small/simple math inline so it doesn't force a centered line.
  return <span className="math-inline" dangerouslySetInnerHTML={{ __html: html }} />;
});

// ─── VS Code-like theme (stable object ref — created once at module level) ────
const vscodeTheme: Record<string, React.CSSProperties> = {
  ...vscDarkPlus,
  'pre[class*="language-"]': {
    ...(vscDarkPlus['pre[class*="language-"]'] as object),
    background: '#1E1E1E',
    borderRadius: '0',
    padding: '16px',
    margin: '0',
    border: 'none',
    boxShadow: 'none',
  },
  'code[class*="language-"]': {
    ...(vscDarkPlus['code[class*="language-"]'] as object),
    background: 'transparent',
    fontFamily: '"JetBrains Mono","Fira Code","Cascadia Code",Consolas,monospace',
    fontSize: '13px',
    lineHeight: '1.6',
    textShadow: 'none',
  },
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

// ─── Lazy syntax highlighter ─────────────────────────────────────────────────
// Shows plain text immediately, swaps Prism in after the next paint so the
// rest of the document renders first (zero extra blocking time).
const LazyHighlighter = memo(function LazyHighlighter({
  language,
  value,
  lineCount,
}: {
  language: string;
  value: string;
  lineCount: number;
}) {
  const [highlighted, setHighlighted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setHighlighted(true));
    return () => cancelAnimationFrame(id);
  }, [value, language]);

  if (!highlighted) {
    return (
      <pre className="m-0 bg-[#1E1E1E] p-4 text-[13px] leading-[1.6] text-[#D4D4D4] font-mono overflow-auto whitespace-pre">
        {value}
      </pre>
    );
  }

  return (
    <SyntaxHighlighter
      language={language || 'text'}
      style={vscodeTheme}
      showLineNumbers={lineCount > 3}
      wrapLines={false}
      lineNumberStyle={{
        color: '#858585',
        minWidth: '2.75em',
        paddingRight: '1.25em',
        userSelect: 'none' as const,
        borderRight: '1px solid #404040',
        marginRight: '0.85em',
      }}
      customStyle={{
        margin: 0,
        borderRadius: 0,
        background: '#1E1E1E',
        width: 'max-content',
        minWidth: '100%',
      }}
      codeTagProps={{ style: { whiteSpace: 'pre' } }}
    >
      {value}
    </SyntaxHighlighter>
  );
});

// ─── CodeBlock ────────────────────────────────────────────────────────────────
const CodeBlock = memo(function CodeBlock({
  language,
  value,
}: {
  language: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const normalizedLanguage = language?.toLowerCase() ?? '';

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  if (language === 'mermaid') {
    return <LazyMermaid chart={value} />;
  }

  if (MATH_LANGUAGES.has(normalizedLanguage)) {
    return <MathBlock value={normalizeMathSource(value)} />;
  }

  const displayLanguage = languageLabels[language?.toLowerCase()] ?? language?.toUpperCase() ?? 'TEXT';
  const lines = value.split('\n');
  const lineCount = lines.length;
  const isLarge = lineCount > LARGE_CODE_LINES;
  const displayValue = isLarge && !expanded ? lines.slice(0, CODE_PREVIEW_LINES).join('\n') : value;

  return (
    <div className="relative my-4 min-w-0 rounded-xl overflow-hidden border border-white/8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 bg-[#252526] px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Code2 size={14} className="text-remembra-accent-primary shrink-0" />
          <span className="truncate text-xs font-medium text-remembra-text-secondary">{displayLanguage}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-[10px] text-remembra-text-muted sm:inline">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded bg-white/5 px-2.5 py-1 text-xs text-remembra-text-secondary transition-colors hover:bg-white/10 hover:text-remembra-text-primary"
          >
            {copied ? <Check size={12} className="text-remembra-success" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Code content */}
      <div className="markdown-scroll custom-scrollbar max-h-[55dvh] overflow-auto sm:max-h-[62dvh]">
        <LazyHighlighter language={language} value={displayValue} lineCount={lineCount} />
      </div>

      {/* Expand/collapse for large blocks */}
      {isLarge && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-white/8 bg-[#1E1E1E] py-2 text-xs text-remembra-text-muted hover:text-remembra-text-secondary transition-colors"
        >
          {expanded ? (
            <><ChevronUp size={13} /> Collapse</>
          ) : (
            <><ChevronDown size={13} /> Show all {lineCount} lines</>
          )}
        </button>
      )}
    </div>
  );
});

// ─── Lazy Mermaid (only mounts when in viewport) ──────────────────────────────
const LazyMermaid = memo(function LazyMermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: '200px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="my-4">
      {visible
        ? <MermaidDiagram chart={chart} className="my-0" />
        : <div className="h-32 rounded-xl border border-white/8 bg-[#0d0d0d] animate-pulse" />
      }
    </div>
  );
});

// ─── Stable component map (defined outside render — never recreated) ──────────
const MD_COMPONENTS = {
  code({ className, children, ...props }: Record<string, unknown>) {
    const match = /language-(\w+)/.exec((className as string) || '');
    const language = match ? match[1] : '';
    const value = Array.isArray(children)
      ? children.map((child) => (typeof child === 'string' ? child : '')).join('')
      : typeof children === 'string'
        ? children
        : String(children ?? '');
    const safeValue = value.replace(/\n$/, '');
    const isBlock = !!language || value.includes('\n');

    if (isBlock) return <CodeBlock language={language} value={safeValue} />;

    return (
      <code
        className="px-1.5 py-0.5 rounded bg-remembra-accent-primary/12 text-remembra-accent-primary text-[0.82em] font-mono"
        {...props as object}
      >
        {children as React.ReactNode}
      </code>
    );
  },

  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-2xl font-bold text-white mb-4 mt-6 first:mt-0 border-b border-white/10 pb-2">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-xl font-semibold text-white mb-3 mt-5 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-lg font-semibold text-white mb-2 mt-4 first:mt-0">{children}</h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-base font-semibold text-white mb-2 mt-3 first:mt-0">{children}</h4>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-remembra-text-secondary leading-relaxed mb-4 last:mb-0">{children}</p>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-remembra-accent-primary hover:text-remembra-accent-secondary underline underline-offset-2 transition-colors">
      {children}
    </a>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-4 list-disc list-outside space-y-1.5 pl-5 text-remembra-text-secondary last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-4 list-decimal list-outside space-y-1.5 pl-5 text-remembra-text-secondary last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-remembra-text-secondary leading-relaxed">{children}</li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-remembra-accent-primary/60 pl-4 py-0.5 my-4 bg-remembra-accent-primary/5 rounded-r-lg">
      <div className="text-remembra-text-secondary italic">{children}</div>
    </blockquote>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="markdown-scroll custom-scrollbar my-4 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-max text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-white/[0.04] border-b border-white/10">{children}</thead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody className="divide-y divide-white/5">{children}</tbody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="transition-colors hover:bg-white/[0.03]">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-4 py-3 text-left font-semibold text-white">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-4 py-3 text-remembra-text-secondary">{children}</td>
  ),
  hr: () => (
    <hr className="border-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent my-6" />
  ),
  img: ({ src, alt }: { src?: string; alt?: string }) => (
    <figure className="my-4">
      <img src={src} alt={alt} loading="lazy" decoding="async"
        className="rounded-xl border border-white/10 max-w-full h-auto" />
      {alt && <figcaption className="text-center text-xs text-remembra-text-muted mt-2">{alt}</figcaption>}
    </figure>
  ),
  del: ({ children }: { children?: React.ReactNode }) => (
    <del className="text-remembra-text-muted line-through">{children}</del>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-white">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic text-remembra-text-primary">{children}</em>
  ),
  inlineMath: ({ value }: { value?: string }) => (
    value ? <MathInline value={value} /> : null
  ),
  math: ({ value }: { value?: string }) => (
    value ? <MathBlock value={value} /> : null
  ),
};

const REMARK_PLUGINS = [remarkGfm, remarkMath];

// ─── Split large content at heading / paragraph boundaries ────────────────────
function splitContent(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxChunkSize) {
    const searchArea = remaining.slice(0, maxChunkSize);
    // Try heading boundary first
    const headMatch = searchArea.search(/\n(?=#{1,3} )/);
    let splitAt = headMatch > maxChunkSize / 3 ? headMatch : -1;
    // Fallback: paragraph boundary
    if (splitAt < 0) {
      const paraIdx = remaining.lastIndexOf('\n\n', maxChunkSize);
      splitAt = paraIdx > 0 ? paraIdx + 2 : maxChunkSize;
    }
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

// ─── Single memoized chunk ────────────────────────────────────────────────────
const MarkdownChunk = memo(
  function MarkdownChunk({ content }: { content: string }) {
    const preprocessed = preprocessMathDelimiters(content);
    return (
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        components={MD_COMPONENTS as never}
      >
        {preprocessed}
      </ReactMarkdown>
    );
  },
  (prev, next) => prev.content === next.content,
);

// ─── Progressive renderer ─────────────────────────────────────────────────────
const ProgressiveMarkdown = memo(function ProgressiveMarkdown({ chunks }: { chunks: string[] }) {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    if (visibleCount >= chunks.length) return;
    const schedule = (cb: () => void): number =>
      typeof requestIdleCallback !== 'undefined'
        ? requestIdleCallback(cb, { timeout: 200 }) as unknown as number
        : requestAnimationFrame(cb);
    const cancel = (id: number) =>
      typeof cancelIdleCallback !== 'undefined' ? cancelIdleCallback(id) : cancelAnimationFrame(id);

    const id = schedule(() => setVisibleCount(v => Math.min(v + 1, chunks.length)));
    return () => cancel(id);
  }, [visibleCount, chunks.length]);

  return (
    <>
      {chunks.slice(0, visibleCount).map((chunk, i) => (
        <MarkdownChunk key={i} content={chunk} />
      ))}
      {visibleCount < chunks.length && (
        <div className="py-4 flex items-center gap-2 text-xs text-remembra-text-muted">
          <div className="h-px flex-1 bg-white/8" />
          <span>Loading ({visibleCount}/{chunks.length} sections)…</span>
          <div className="h-px flex-1 bg-white/8" />
        </div>
      )}
    </>
  );
});

// ─── Public component ─────────────────────────────────────────────────────────
export const MarkdownRenderer = memo(
  function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    // useDeferredValue keeps the old rendered tree visible during fast updates
    // so typing never causes a flash of empty content.
    const deferredContent = useDeferredValue(content);
    const isPending = deferredContent !== content;

    const isProgressive = deferredContent.length > PROGRESSIVE_THRESHOLD;

    const chunks = useMemo(() => {
      if (!isProgressive) return null;
      return splitContent(deferredContent, 15_000);
    }, [deferredContent, isProgressive]);

    return (
      <div
        className={`markdown-content min-w-0 w-full max-w-full break-words ${className}`}
        style={{ opacity: isPending ? 0.7 : 1, transition: 'opacity 120ms ease' }}
      >
        {isProgressive && chunks
          ? <ProgressiveMarkdown chunks={chunks} />
          : <MarkdownChunk content={deferredContent} />
        }
      </div>
    );
  },
  (prev, next) => prev.content === next.content && prev.className === next.className,
);
