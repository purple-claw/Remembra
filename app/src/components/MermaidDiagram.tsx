import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

let mermaidInitialized = false;
let renderCounter = 0;

function initMermaid() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
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

export function MermaidDiagram({ chart, className = '' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const renderDiagram = useCallback(async () => {
    if (!chart || !containerRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      initMermaid();
      
      // Clean the mermaid code - strip code fences and whitespace
      let cleanChart = chart
        .replace(/```mermaid\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      
      if (!cleanChart) {
        setError('No valid Mermaid code provided');
        setIsLoading(false);
        return;
      }

      // Ensure the chart starts with a valid diagram type
      const validStarts = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'gitGraph', 'mindmap', 'timeline'];
      const firstWord = cleanChart.split(/[\s\n]/)[0].toLowerCase();
      if (!validStarts.some(s => firstWord.startsWith(s.toLowerCase()))) {
        // Try prepending "graph TD" if it looks like node definitions
        if (cleanChart.includes('-->') || cleanChart.includes('---')) {
          cleanChart = 'graph TD\n' + cleanChart;
        }
      }

      // Generate truly unique ID
      renderCounter++;
      const id = `mermaid-diagram-${renderCounter}`;
      
      // Remove any leftover elements from previous renders
      const oldElements = document.querySelectorAll(`[id^="mermaid-diagram-"]`);
      oldElements.forEach(el => {
        if (el.parentNode && el.parentNode !== containerRef.current) {
          el.parentNode.removeChild(el);
        }
      });

      // Render into a temporary detached container to avoid DOM conflicts
      const { svg } = await mermaid.render(id, cleanChart);
      
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
        
        // Ensure SVG is responsive
        const svgEl = containerRef.current.querySelector('svg');
        if (svgEl) {
          svgEl.removeAttribute('height');
          svgEl.style.maxWidth = '100%';
          svgEl.style.height = 'auto';
        }
      }
    } catch (err) {
      console.error('Mermaid rendering error:', err);
      
      // Clean up any failed render elements
      const failedEl = document.getElementById(`dmermaid-diagram-${renderCounter}`);
      if (failedEl) failedEl.remove();
      
      setError(err instanceof Error ? err.message : 'Failed to render diagram');
    }
    
    setIsLoading(false);
  }, [chart]);

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(renderDiagram, 100);
    return () => {
      clearTimeout(timer);
    };
  }, [renderDiagram]);

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
