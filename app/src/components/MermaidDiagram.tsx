import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

// Initialize mermaid with McLaren orange theme and enhanced styling
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
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
  sequence: {
    actorMargin: 50,
    diagramMarginX: 20,
    diagramMarginY: 20,
  },
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 14,
});

export function MermaidDiagram({ chart, className = '' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    const renderDiagram = async () => {
      if (!chart || !containerRef.current) return;
      
      try {
        setError(null);
        
        // Clean and validate the mermaid code
        const cleanChart = chart
          .replace(/```mermaid\n?/gi, '')
          .replace(/```\n?/g, '')
          .trim();
        
        if (!cleanChart) {
          setError('No valid Mermaid code provided');
          return;
        }

        // Generate unique ID for the diagram
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Render the diagram
        const { svg } = await mermaid.render(id, cleanChart);
        setSvgContent(svg);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
      }
    };

    renderDiagram();
  }, [chart]);

  if (error) {
    return (
      <div className={`glass-card p-4 rounded-xl ${className}`}>
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-red-400 text-xl">!</span>
          </div>
          <p className="text-sm text-red-400 mb-2">Failed to render flowchart</p>
          <p className="text-xs text-remembra-text-muted">{error}</p>
          <pre className="mt-4 p-3 bg-black/50 rounded-lg text-left text-xs text-remembra-text-muted overflow-x-auto">
            {chart}
          </pre>
        </div>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div className={`glass-card p-4 rounded-xl animate-pulse ${className}`}>
        <div className="h-32 bg-remembra-bg-tertiary rounded-lg" />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`glass-card p-4 rounded-xl overflow-x-auto ${className}`}
    >
      <div 
        className="mermaid-container min-w-fit"
        dangerouslySetInnerHTML={{ __html: svgContent }}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      />
      <style>{`
        .mermaid-container svg {
          max-width: 100%;
          height: auto;
          filter: drop-shadow(0 4px 12px rgba(255, 128, 0, 0.15));
        }
        .mermaid-container .node rect,
        .mermaid-container .node polygon,
        .mermaid-container .node circle,
        .mermaid-container .node ellipse {
          fill: #1a1a1a !important;
          stroke: #FF8000 !important;
          stroke-width: 2px !important;
          filter: drop-shadow(0 0 8px rgba(255, 128, 0, 0.3));
        }
        .mermaid-container .edgePath path {
          stroke: #FF8000 !important;
          stroke-width: 2.5px !important;
        }
        .mermaid-container .arrowheadPath {
          fill: #FF8000 !important;
        }
        .mermaid-container .label {
          color: #ffffff !important;
          font-weight: 500 !important;
        }
        .mermaid-container .edgeLabel {
          background-color: #0a0a0a !important;
          color: #ffffff !important;
          padding: 4px 8px !important;
          border-radius: 6px !important;
          border: 1px solid rgba(255, 128, 0, 0.3) !important;
        }
        .mermaid-container text {
          fill: #ffffff !important;
          font-family: Inter, system-ui, sans-serif !important;
          font-size: 14px !important;
        }
        .mermaid-container .cluster rect {
          fill: #0a0a0a !important;
          stroke: #FF6B00 !important;
          stroke-width: 2px !important;
        }
        .mermaid-container .actor {
          fill: #1a1a1a !important;
          stroke: #FF8000 !important;
          stroke-width: 2px !important;
        }
        .mermaid-container .actor-line {
          stroke: #FF8000 !important;
          stroke-width: 1.5px !important;
        }
        .mermaid-container .messageLine0,
        .mermaid-container .messageLine1 {
          stroke: #FF8000 !important;
          stroke-width: 2px !important;
        }
      `}</style>
    </div>
  );
}
