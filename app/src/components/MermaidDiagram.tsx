import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

let mermaidInitialized = false;
let renderCounter = 0;

// ─── Serial render queue ──────────────────────────────────────────────────────
// mermaid.render() is NOT concurrent-safe. Parallel calls deadlock the main
// thread and cause the "hang/freeze" symptom. We drain one task at a time.
type RenderTask = () => Promise<void>;
const mermaidRenderQueue: RenderTask[] = [];
let mermaidQueueRunning = false;

async function drainMermaidQueue(): Promise<void> {
  if (mermaidQueueRunning) return;
  mermaidQueueRunning = true;
  while (mermaidRenderQueue.length > 0) {
    const task = mermaidRenderQueue.shift()!;
    try { await task(); } catch { /* each task handles own errors */ }
  }
  mermaidQueueRunning = false;
}

function enqueueMermaidRender(task: RenderTask): void {
  mermaidRenderQueue.push(task);
  drainMermaidQueue(); // intentionally unawaited — fire and forget
}

function initMermaid() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'strict',
    themeVariables: {
      primaryColor: '#FF8000',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#FF6B00',
      lineColor: '#FF8000',
      secondaryColor: '#1a1a1a',
      tertiaryColor: '#0a0a0a',
      background: '#000000',
      mainBkg: '#1a1a1a',
      nodeBorder: '#FF8000',
      clusterBkg: '#1a1a1a',
      clusterBorder: '#FF6B00',
      titleColor: '#ffffff',
      edgeLabelBackground: '#1a1a1a',
      nodeTextColor: '#ffffff',
      fontSize: '14px',
    },
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      padding: 20,
      nodeSpacing: 60,
      rankSpacing: 60,
      diagramPadding: 20,
    },
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
  });
  mermaidInitialized = true;
}

/**
 * Sanitize AI-generated mermaid code to fix common issues that cause parse errors.
 */
function sanitizeMermaidCode(raw: string): string {
  let chart = raw
    // Remove code fences
    .replace(/```mermaid\s*/gi, '')
    .replace(/```\s*/g, '')
    // Trim whitespace
    .replace(/^[\s\n]+|[\s\n]+$/g, '')
    .trim();

  if (!chart) return '';

  // Split into lines for per-line processing
  const lines = chart.split('\n').map(l => l.trimEnd());
  const cleanedLines: string[] = [];

  for (let line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('%%')) continue;

    // Remove problematic characters from node labels
    // Replace smart quotes
    line = line.replace(/[\u201C\u201D\u201E]/g, '').replace(/[\u2018\u2019\u201A]/g, '');
    // Remove standalone quotes inside brackets
    line = line.replace(/\[([^\]]*)\]/g, (_, label) => {
      const clean = label.replace(/["'`]/g, '').replace(/[;:]/g, ' ').trim();
      return `[${clean}]`;
    });
    // Same for curly brace decision nodes
    line = line.replace(/\{([^}]*)\}/g, (_, label) => {
      // Don't clean the first line if it's graph/flowchart declaration
      if (line.trim().match(/^(graph|flowchart)\s/i)) return `{${label}}`;
      const clean = label.replace(/["'`]/g, '').replace(/[;:]/g, ' ').trim();
      return `{${clean}}`;
    });
    // Clean parentheses node labels
    line = line.replace(/\(([^)]*)\)/g, (_, label) => {
      const clean = label.replace(/["'`]/g, '').replace(/[;:]/g, ' ').trim();
      return `(${clean})`;
    });

    cleanedLines.push(line);
  }

  chart = cleanedLines.join('\n');

  // Ensure valid diagram type header
  const validStarts = ['graph', 'flowchart', 'sequencediagram', 'classdiagram', 'statediagram', 'erdiagram', 'gantt', 'pie', 'gitgraph', 'mindmap', 'timeline'];
  const firstLine = cleanedLines[0]?.trim().toLowerCase() || '';
  const hasValidStart = validStarts.some(s => firstLine.startsWith(s));

  if (!hasValidStart) {
    if (chart.includes('-->') || chart.includes('---') || chart.includes('-.->')) {
      chart = 'graph TD\n' + chart;
    } else {
      return '';
    }
  }

  return chart;
}

export function MermaidDiagram({ chart, className = '' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!chart || !containerRef.current) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const renderDiagram = async (attempt = 0) => {
      if (cancelled || !containerRef.current || !mountedRef.current) return;

      setIsLoading(true);
      setError(null);

      // Wrap the actual mermaid.render() call in the serial queue so concurrent
      // component instances never call mermaid.render() simultaneously.
      await new Promise<void>((resolve) => {
        enqueueMermaidRender(async () => {
          if (cancelled || !containerRef.current || !mountedRef.current) { resolve(); return; }

          try {
            initMermaid();

            const cleanChart = sanitizeMermaidCode(chart);
            if (!cleanChart) throw new Error('Empty or invalid diagram code after sanitization');

            renderCounter++;
            const id = `mermaid-${renderCounter}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

            const renderPromise = mermaid.render(id, cleanChart);
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Mermaid render timeout (8s)')), 8000),
            );

            const { svg } = await Promise.race([renderPromise, timeoutPromise]);

            if (cancelled || !containerRef.current || !mountedRef.current) { resolve(); return; }

            containerRef.current.innerHTML = svg;
            const svgEl = containerRef.current.querySelector('svg');
            if (svgEl) { svgEl.removeAttribute('height'); svgEl.style.maxWidth = '100%'; svgEl.style.height = 'auto'; }
          } catch (err) {
            if (!cancelled && mountedRef.current) {
              console.error('[Mermaid] Rendering error:', err);
              const errorMsg = err instanceof Error ? err.message : 'Unknown rendering error';

              document.querySelectorAll(`[id^="mermaid-${renderCounter}"]`).forEach(el => { try { el.remove(); } catch { /* ignore */ } });
              document.querySelectorAll('[id^="dmermaid-"]').forEach(el => { try { el.remove(); } catch { /* ignore */ } });

              if (attempt === 0 && (errorMsg.includes('Parse error') || errorMsg.includes('Syntax error'))) {
                resolve();
                setTimeout(() => { if (!cancelled && mountedRef.current) renderDiagram(1); }, 200);
                return;
              }

              setError(errorMsg);
            }
          }

          resolve();
        });
      });

      if (!cancelled && mountedRef.current) setIsLoading(false);
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => renderDiagram(0), 80);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [chart]);

  if (error) {
    return (
      <div className={`glass-card p-4 rounded-xl ${className}`}>
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-red-400 text-xl">!</span>
          </div>
          <p className="text-sm text-red-400 mb-2">Failed to render flowchart</p>
          <p className="text-xs text-remembra-text-muted mb-4">{error}</p>
          <details className="text-left">
            <summary className="text-xs text-remembra-text-muted cursor-pointer hover:text-remembra-text-secondary">Show source</summary>
            <pre className="mt-2 p-3 bg-black/50 rounded-lg text-xs text-remembra-text-muted overflow-x-auto whitespace-pre-wrap">
              {chart}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card p-4 rounded-xl overflow-x-auto ${className}`}>
      {isLoading && (
        <div className="h-32 bg-remembra-bg-tertiary rounded-lg animate-pulse" />
      )}
      <div
        ref={containerRef}
        className="mermaid-render-target min-w-fit"
        style={{
          display: isLoading ? 'none' : 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      />
      <style>{`
        .mermaid-render-target svg {
          max-width: 100%;
          height: auto;
          filter: drop-shadow(0 4px 12px rgba(255, 128, 0, 0.15));
        }
        .mermaid-render-target .node rect,
        .mermaid-render-target .node polygon,
        .mermaid-render-target .node circle,
        .mermaid-render-target .node ellipse {
          fill: #1a1a1a !important;
          stroke: #FF8000 !important;
          stroke-width: 2px !important;
          filter: drop-shadow(0 0 8px rgba(255, 128, 0, 0.3));
        }
        .mermaid-render-target .edgePath path {
          stroke: #FF8000 !important;
          stroke-width: 2.5px !important;
        }
        .mermaid-render-target .arrowheadPath {
          fill: #FF8000 !important;
        }
        .mermaid-render-target .label {
          color: #ffffff !important;
          font-weight: 500 !important;
        }
        .mermaid-render-target .edgeLabel {
          background-color: #0a0a0a !important;
          color: #ffffff !important;
          padding: 4px 8px !important;
          border-radius: 6px !important;
          border: 1px solid rgba(255, 128, 0, 0.3) !important;
        }
        .mermaid-render-target text {
          fill: #ffffff !important;
          font-family: Inter, system-ui, sans-serif !important;
          font-size: 14px !important;
        }
        .mermaid-render-target .cluster rect {
          fill: #0a0a0a !important;
          stroke: #FF6B00 !important;
          stroke-width: 2px !important;
        }
      `}</style>
    </div>
  );
}
