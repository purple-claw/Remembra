import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { aiService } from '@/services/aiService';
import {
  ArrowLeft,
  BrainCircuit,
  Check,
  Copy,
  FileText,
  GitBranch,
  HelpCircle,
  Home,
  Loader2,
  Maximize2,
  MessageCircle,
  Minimize2,
  Save,
  Send,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { MermaidDiagram } from '@/components/MermaidDiagram';

type StudioMode = 'home' | 'tools' | 'chat';
type ToolId = 'summary' | 'bullets' | 'flowchart' | 'quiz' | 'mnemonics' | 'code';

interface ToolDef {
  id: ToolId;
  name: string;
  desc: string;
  color: string;
  icon: React.ElementType;
  placeholder: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const TOOL_DEFS: ToolDef[] = [
  {
    id: 'summary',
    name: 'Deep Summary',
    desc: 'Condense long content into fast revision notes.',
    color: '#FF8000',
    icon: FileText,
    placeholder: 'Paste topic notes to create a concise summary...',
  },
  {
    id: 'bullets',
    name: 'Key Bullets',
    desc: 'Generate memory-friendly key points.',
    color: '#FF5A1F',
    icon: Sparkles,
    placeholder: 'Paste a topic to extract key bullet points...',
  },
  {
    id: 'flowchart',
    name: 'Concept Map',
    desc: 'Convert content into visual Mermaid flow.',
    color: '#00B8D9',
    icon: GitBranch,
    placeholder: 'Describe process/concepts for flowchart rendering...',
  },
  {
    id: 'quiz',
    name: 'Recall Quiz',
    desc: 'Generate Q&A drills for active recall.',
    color: '#00D26A',
    icon: HelpCircle,
    placeholder: 'Paste study content to generate a quiz set...',
  },
  {
    id: 'mnemonics',
    name: 'Memory Hooks',
    desc: 'Create mnemonics and analogies.',
    color: '#FFB800',
    icon: Home,
    placeholder: 'Paste facts you want to memorize deeply...',
  },
  {
    id: 'code',
    name: 'Code Explainer',
    desc: 'Explain structure, flow, and caveats of code.',
    color: '#8B5CF6',
    icon: BrainCircuit,
    placeholder: 'Paste code and request explanation...',
  },
];

function extractMermaid(raw: string): string {
  const match = raw.match(/```mermaid\n([\s\S]*?)\n```/i);
  if (match?.[1]) return match[1].trim();
  return raw.replace(/```mermaid\n?/gi, '').replace(/```\n?/g, '').trim();
}

function toQuizMarkdown(qa: { question: string; answer: string }[]): string {
  return qa
    .map((item, idx) => `### Q${idx + 1}\n${item.question}\n\n**Answer:** ${item.answer}`)
    .join('\n\n');
}

export function AIStudio() {
  const { memoryItems, updateMemoryItem } = useStore();
  const provider = aiService.getProviderStatus();

  const [mode, setMode] = useState<StudioMode>('home');
  const [toolId, setToolId] = useState<ToolId>('summary');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastError, setLastError] = useState<string>('');
  const [expandOutput, setExpandOutput] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'I am ready. Ask any study question and I will answer with recall-first steps.' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatViewportRef = useRef<HTMLDivElement | null>(null);

  const tool = useMemo(() => TOOL_DEFS.find((t) => t.id === toolId) || TOOL_DEFS[0], [toolId]);
  const selectedItem = useMemo(
    () => memoryItems.find((m) => m.id === selectedItemId) || null,
    [memoryItems, selectedItemId],
  );

  const effectiveInput = selectedItem ? selectedItem.content : inputText;
  const effectiveTitle = selectedItem?.title || 'AI Studio Input';

  const goToTools = (nextTool: ToolId) => {
    setToolId(nextTool);
    setMode('tools');
    setResult('');
    setLastError('');
    setExpandOutput(false);
  };

  const handleGenerate = async () => {
    if (!effectiveInput.trim()) {
      toast.error('Please provide input text or select a memory item.');
      return;
    }

    setIsGenerating(true);
    setLastError('');
    try {
      let output = '';
      if (tool.id === 'summary') {
        output = await aiService.generateSummary(effectiveInput, effectiveTitle);
      } else if (tool.id === 'bullets') {
        const bullets = await aiService.generateBulletPoints(effectiveInput, effectiveTitle);
        output = bullets.map((b) => `- ${b}`).join('\n');
      } else if (tool.id === 'flowchart') {
        output = await aiService.generateFlowchart(effectiveInput, effectiveTitle);
      } else if (tool.id === 'quiz') {
        const quiz = await aiService.generateQuizQuestions(effectiveInput, effectiveTitle, 5);
        output = toQuizMarkdown(quiz);
      } else if (tool.id === 'mnemonics') {
        output = await aiService.generateMnemonics(effectiveInput, effectiveTitle);
      } else {
        output = await aiService.explainCode(effectiveInput);
      }

      setResult(output || 'No output returned');
      toast.success('AI output generated');
    } catch (error) {
      console.error('AI generation failed:', error);
      const message = error instanceof Error ? error.message : 'AI generation failed';
      setLastError(message);
      setResult('Unable to generate live output right now. Check API keys and retry.');
      toast.error('AI request failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToItem = async () => {
    if (!selectedItem || !result.trim()) {
      toast.error('Select an item and generate output first.');
      return;
    }

    setIsSaving(true);
    try {
      if (tool.id === 'summary') {
        await updateMemoryItem(selectedItem.id, { ai_summary: result });
      } else if (tool.id === 'flowchart') {
        await updateMemoryItem(selectedItem.id, { ai_flowchart: extractMermaid(result) });
      } else if (tool.id === 'bullets') {
        const bullets = result
          .split('\n')
          .map((line) => line.replace(/^[-*]\s*/, '').trim())
          .filter(Boolean);
        await updateMemoryItem(selectedItem.id, { ai_bullet_points: bullets });
      } else {
        await updateMemoryItem(selectedItem.id, { notes: result });
      }
      toast.success('Saved to selected memory item');
    } catch (error) {
      console.error('Failed to save AI output:', error);
      toast.error('Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success('Copied');
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMessage = chatInput;
    const contextTitle = selectedItem?.title || 'General Study Chat';
    const contextContent = selectedItem?.content || '';

    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatting(true);
    try {
      const reply = await aiService.chat(contextContent, contextTitle, userMessage);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      console.error('AI chat failed:', error);
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Live AI failed. Retry after checking provider configuration.' },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  useEffect(() => {
    if (!chatViewportRef.current) return;
    chatViewportRef.current.scrollTo({
      top: chatViewportRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [chatMessages, isChatting]);

  if (mode === 'chat') {
    return (
      <div className="min-h-[100dvh] bg-black lined-bg-subtle flex flex-col smooth-scroll-content">
        <header className="px-4 sm:px-5 safe-top-compact pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode('home')}
              className="w-10 h-10 rounded-xl bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-10 h-10 rounded-xl bg-remembra-accent-primary/20 flex items-center justify-center">
              <MessageCircle size={18} className="text-remembra-accent-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-remembra-text-primary">AI Tutor Chat</h1>
              <p className="text-xs text-remembra-text-muted truncate">
                {selectedItem ? `Context: ${selectedItem.title}` : 'No item context selected'}
              </p>
            </div>
          </div>
        </header>

        <main ref={chatViewportRef} className="flex-1 px-4 sm:px-5 py-4 overflow-y-auto custom-scrollbar space-y-3">
          {chatMessages.map((message, idx) => (
            <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[84%] rounded-2xl px-4 py-3 text-sm ${
                  message.role === 'user'
                    ? 'bg-remembra-accent-primary text-white'
                    : 'bg-remembra-bg-secondary border border-white/5 text-remembra-text-primary'
                } smooth-surface`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isChatting && (
            <div className="flex justify-start">
              <div className="max-w-[84%] rounded-2xl px-4 py-3 text-sm bg-remembra-bg-secondary border border-white/5 text-remembra-text-muted flex items-center gap-2">
                <Loader2 size={13} className="animate-spin" />
                Generating...
              </div>
            </div>
          )}
        </main>

        <footer className="px-4 sm:px-5 pb-[calc(env(safe-area-inset-bottom)+6.75rem)] pt-3 border-t border-white/5 sm:pb-8">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Ask your question..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
              className="bg-remembra-bg-secondary border-white/5 rounded-xl text-remembra-text-primary py-6"
            />
            <button
              onClick={handleSendChat}
              disabled={!chatInput.trim() || isChatting}
              className="w-12 h-12 rounded-xl gradient-primary text-white flex items-center justify-center disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </footer>
      </div>
    );
  }

  if (mode === 'tools') {
    const Icon = tool.icon;
    return (
      <div className="min-h-[100dvh] bg-black lined-bg-subtle flex flex-col smooth-scroll-content">
        <header className="px-4 sm:px-5 safe-top-compact pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode('home')}
              className="w-10 h-10 rounded-xl bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${tool.color}20` }}>
              <Icon size={18} style={{ color: tool.color }} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-remembra-text-primary">{tool.name}</h1>
              <p className="text-xs text-remembra-text-muted">{tool.desc}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-5 py-4 overflow-y-auto custom-scrollbar space-y-4">
          <div className="glass-card rounded-2xl p-4 border border-white/5 dynamic-container smooth-surface">
            <p className="text-xs font-semibold uppercase tracking-wider text-remembra-text-muted mb-2">Context Source</p>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full bg-remembra-bg-secondary border border-white/10 rounded-xl px-3 py-2 text-sm text-remembra-text-primary"
            >
              <option value="">Manual Input</option>
              {memoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            {!selectedItem && (
              <Textarea
                placeholder={tool.placeholder}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="mt-3 bg-remembra-bg-secondary border-white/5 rounded-xl text-remembra-text-primary min-h-[170px] resize-none"
              />
            )}
            {selectedItem && (
              <div className="mt-3 rounded-xl border border-white/10 bg-remembra-bg-secondary p-3">
                <p className="text-xs text-remembra-text-muted mb-1">Using selected memory item content</p>
                <p className="text-sm text-remembra-text-primary max-h-28 overflow-y-auto custom-scrollbar whitespace-pre-wrap break-words">
                  {selectedItem.content}
                </p>
              </div>
            )}
          </div>

          <div className="glass-card rounded-2xl p-4 border border-white/5 dynamic-container smooth-surface">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <p className="text-xs font-semibold uppercase tracking-wider text-remembra-text-muted">Generated Output</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setExpandOutput((prev) => !prev)}
                  className="px-2.5 py-1 rounded-lg bg-remembra-bg-secondary text-[11px] text-remembra-text-secondary border border-white/5 flex items-center gap-1"
                >
                  {expandOutput ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                  {expandOutput ? 'Compact' : 'Expand'}
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!result}
                  className="px-2.5 py-1 rounded-lg bg-remembra-bg-secondary text-[11px] text-remembra-text-secondary border border-white/5 disabled:opacity-50 flex items-center gap-1"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={handleSaveToItem}
                  disabled={!selectedItem || !result || isSaving}
                  className="px-2.5 py-1 rounded-lg bg-remembra-bg-secondary text-[11px] text-remembra-text-secondary border border-white/5 disabled:opacity-50 flex items-center gap-1"
                >
                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Save
                </button>
              </div>
            </div>

            <div
              className={`rounded-xl border border-white/10 bg-black/20 p-3 transition-all duration-300 ${
                expandOutput ? 'max-h-[72dvh]' : 'max-h-[48dvh] sm:max-h-[56dvh]'
              } overflow-y-auto overflow-x-hidden custom-scrollbar`}
            >
              {!result ? (
                <div className="rounded-xl border border-dashed border-white/10 p-8 text-center min-h-36 flex flex-col items-center justify-center">
                  <Wand2 size={18} className="mx-auto text-remembra-text-muted mb-2" />
                  <p className="text-sm text-remembra-text-muted">Generate to view AI output here.</p>
                </div>
              ) : tool.id === 'flowchart' ? (
                <div className="overflow-auto custom-scrollbar">
                  <MermaidDiagram chart={extractMermaid(result)} className="my-1 min-w-max" />
                </div>
              ) : (
                <MarkdownRenderer content={result} className="max-w-none break-words" />
              )}
            </div>

            {lastError && (
              <p className="mt-3 text-xs text-red-400">{lastError}</p>
            )}
          </div>
        </main>

        <footer className="px-4 sm:px-5 pb-[calc(env(safe-area-inset-bottom)+6.75rem)] pt-3 border-t border-white/5 sm:pb-8">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !effectiveInput.trim()}
            className="w-full gradient-primary py-6 rounded-2xl text-white font-semibold disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} className="mr-2" />
                Generate
              </>
            )}
          </Button>
        </footer>
      </div>
    );
  }

  return (
    <div className="bg-black lined-bg-subtle screen-page px-4 sm:px-5 safe-top safe-bottom-nav sm:pb-8 smooth-scroll-content">
      <header className="mb-6">
        <div
          className="rounded-2xl p-5 border border-white/10 relative overflow-hidden"
          style={{ background: 'linear-gradient(140deg, #FF8000 0%, #FF4500 40%, #E81224 100%)' }}
        >
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/20 blur-2xl" />
          <div className="relative z-10">
            <h1 className="text-xl font-bold text-white mb-1">AI Studio</h1>
            <p className="text-sm text-white/80 mb-3">Full AI workbench for summaries, quizzes, flowcharts, and tutor chat.</p>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-1 rounded-md bg-black/25 text-white flex items-center gap-1">
                <BrainCircuit size={12} />
                {provider.preferredReasoningModel}
              </span>
              <span className="px-2 py-1 rounded-md bg-black/25 text-white">
                {provider.mode === 'live' ? 'Live AI active' : 'Fallback mode'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="mb-5">
        <button
          onClick={() => setMode('chat')}
          className="w-full rounded-2xl border border-remembra-accent-primary/30 bg-remembra-accent-primary/10 p-4 text-left flex items-center gap-3 hover:bg-remembra-accent-primary/15 transition-colors smooth-surface"
        >
          <div className="w-11 h-11 rounded-xl bg-remembra-accent-primary/20 flex items-center justify-center">
            <MessageCircle size={18} className="text-remembra-accent-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-remembra-text-primary">Tutor Chat</p>
            <p className="text-xs text-remembra-text-muted">Interactive reasoning chat with optional item context.</p>
          </div>
        </button>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-remembra-text-muted uppercase tracking-wider mb-3">AI Tools</h2>
        <div className="grid grid-cols-2 gap-3">
          {TOOL_DEFS.map((def) => {
            const Icon = def.icon;
            return (
              <button
                key={def.id}
                onClick={() => goToTools(def.id)}
                className="rounded-2xl bg-remembra-bg-secondary/80 border border-white/5 p-4 text-left hover:border-white/15 transition-colors smooth-surface"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: `${def.color}20` }}>
                  <Icon size={18} style={{ color: def.color }} />
                </div>
                <p className="text-sm font-semibold text-remembra-text-primary mb-1">{def.name}</p>
                <p className="text-xs text-remembra-text-muted leading-relaxed">{def.desc}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
