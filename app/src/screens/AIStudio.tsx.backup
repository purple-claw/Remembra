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
  LayoutGrid,
  Loader2,
  MessageCircle,
  Minimize2,
  Maximize2,
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
    icon: BrainCircuit,
    placeholder: 'Paste facts you want to memorize deeply...',
  },
  {
    id: 'code',
    name: 'Code Explainer',
    desc: 'Explain structure, flow, and caveats of code.',
    color: '#7DD3FC',
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
    .map((item, index) => `### Q${index + 1}\n${item.question}\n\n**Answer:** ${item.answer}`)
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
  const [lastError, setLastError] = useState('');
  const [expandOutput, setExpandOutput] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'I am ready. Ask any study question and I will answer with recall-first steps.' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatViewportRef = useRef<HTMLDivElement | null>(null);

  const tool = useMemo(() => TOOL_DEFS.find((entry) => entry.id === toolId) || TOOL_DEFS[0], [toolId]);
  const selectedItem = useMemo(
    () => memoryItems.find((item) => item.id === selectedItemId) || null,
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
        output = bullets.map((bullet) => `- ${bullet}`).join('\n');
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

    setChatMessages((previous) => [...previous, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatting(true);

    try {
      const reply = await aiService.chat(contextContent, contextTitle, userMessage);
      setChatMessages((previous) => [...previous, { role: 'assistant', content: reply }]);
    } catch (error) {
      console.error('AI chat failed:', error);
      setChatMessages((previous) => [
        ...previous,
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
      <div className="h-[100dvh] bg-black lined-bg-subtle flex flex-col overflow-hidden">
        <header className="px-4 sm:px-6 safe-top-compact pb-4 border-b border-white/10 bg-black/80 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMode('home')}
                className="w-10 h-10 rounded-xl border border-white/10 bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-remembra-text-primary">Tutor Chat</h1>
                <p className="text-xs text-remembra-text-muted truncate">
                  {selectedItem ? `Context: ${selectedItem.title}` : 'No context selected'}
                </p>
              </div>
            </div>
            <select
              value={selectedItemId}
              onChange={(event) => setSelectedItemId(event.target.value)}
              className="hidden sm:block max-w-[280px] bg-remembra-bg-secondary border border-white/10 rounded-lg px-3 py-2 text-xs text-remembra-text-secondary"
            >
              <option value="">No Context</option>
              {memoryItems.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </div>
        </header>

        <main ref={chatViewportRef} data-nav-scroll="true" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5 space-y-4 custom-scrollbar">
          {chatMessages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[88%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed border ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-remembra-accent-primary to-remembra-accent-secondary text-white border-transparent'
                    : 'bg-remembra-bg-secondary text-remembra-text-primary border-white/10'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {isChatting && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3 text-sm bg-remembra-bg-secondary border border-white/10 text-remembra-text-muted flex items-center gap-2">
                <Loader2 size={13} className="animate-spin" />
                Thinking...
              </div>
            </div>
          )}
        </main>

        <footer className="px-4 sm:px-6 pb-[calc(env(safe-area-inset-bottom)+6.75rem)] pt-3 border-t border-white/10 sm:pb-8 bg-black/90 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Ask your question..."
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSendChat();
                }
              }}
              className="bg-remembra-bg-secondary border-white/10 rounded-xl text-remembra-text-primary py-6"
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
    const ToolIcon = tool.icon;

    return (
      <div className="h-[100dvh] bg-black lined-bg-subtle flex flex-col overflow-hidden">
        <header className="px-4 sm:px-6 safe-top-compact pb-4 border-b border-white/10 bg-black/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode('home')}
              className="w-10 h-10 rounded-xl border border-white/10 bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${tool.color}20` }}>
              <ToolIcon size={18} style={{ color: tool.color }} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-remembra-text-primary">{tool.name}</h1>
              <p className="text-xs text-remembra-text-muted">{tool.desc}</p>
            </div>
          </div>
        </header>

        <div data-nav-scroll="true" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5 custom-scrollbar pb-[calc(env(safe-area-inset-bottom)+7.5rem)] sm:pb-8">
          <div className="grid gap-4 lg:grid-cols-[300px,1fr]">
            <aside className="space-y-4">
              <section className="glass-card rounded-2xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-remembra-text-muted mb-3">Tools</p>
                <div className="space-y-2">
                  {TOOL_DEFS.map((entry) => {
                    const Icon = entry.icon;
                    const active = entry.id === tool.id;
                    return (
                      <button
                        key={entry.id}
                        onClick={() => setToolId(entry.id)}
                        className={`w-full rounded-xl px-3 py-2.5 text-left border transition-colors ${
                          active
                            ? 'bg-black/40 border-white/20'
                            : 'bg-remembra-bg-tertiary/60 border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${entry.color}20` }}>
                            <Icon size={14} style={{ color: entry.color }} />
                          </div>
                          <p className="text-sm font-medium text-remembra-text-primary">{entry.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="glass-card rounded-2xl p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-remembra-text-muted mb-2">Context</p>
                <select
                  value={selectedItemId}
                  onChange={(event) => setSelectedItemId(event.target.value)}
                  className="w-full bg-remembra-bg-tertiary border border-white/10 rounded-xl px-3 py-2 text-sm text-remembra-text-primary"
                >
                  <option value="">Manual Input</option>
                  {memoryItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
                {selectedItem && (
                  <p className="text-xs text-remembra-text-muted mt-2 line-clamp-4">{selectedItem.content}</p>
                )}
              </section>
            </aside>

            <section className="space-y-4">
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-remembra-text-muted">Input</p>
                  <p className="text-xs text-remembra-text-muted">{selectedItem ? 'Using selected item' : 'Manual text'}</p>
                </div>
                {!selectedItem && (
                  <Textarea
                    placeholder={tool.placeholder}
                    value={inputText}
                    onChange={(event) => setInputText(event.target.value)}
                    className="min-h-[220px] resize-none bg-remembra-bg-tertiary border-white/10 rounded-xl text-remembra-text-primary"
                  />
                )}
                {selectedItem && (
                  <div className="rounded-xl border border-white/10 bg-remembra-bg-tertiary/70 p-4 max-h-[280px] overflow-y-auto custom-scrollbar">
                    <p className="text-sm text-remembra-text-secondary whitespace-pre-wrap break-words">{selectedItem.content}</p>
                  </div>
                )}
                <div className="mt-4">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !effectiveInput.trim()}
                    className="w-full gradient-primary py-5 rounded-xl text-white font-semibold disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 size={16} className="mr-2" />
                        Generate Output
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-remembra-text-muted">Output</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandOutput((prev) => !prev)}
                      className="px-3 py-1.5 rounded-lg text-xs border border-white/10 bg-remembra-bg-tertiary text-remembra-text-secondary flex items-center gap-1"
                    >
                      {expandOutput ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                      {expandOutput ? 'Compact' : 'Expand'}
                    </button>
                    <button
                      onClick={handleCopy}
                      disabled={!result}
                      className="px-3 py-1.5 rounded-lg text-xs border border-white/10 bg-remembra-bg-tertiary text-remembra-text-secondary disabled:opacity-50 flex items-center gap-1"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={handleSaveToItem}
                      disabled={!selectedItem || !result || isSaving}
                      className="px-3 py-1.5 rounded-lg text-xs border border-white/10 bg-remembra-bg-tertiary text-remembra-text-secondary disabled:opacity-50 flex items-center gap-1"
                    >
                      {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Save
                    </button>
                  </div>
                </div>

                <div
                  className={`rounded-xl border border-white/10 bg-black/20 p-4 overflow-y-auto custom-scrollbar transition-all duration-300 ${
                    expandOutput ? 'max-h-[70dvh]' : 'max-h-[45dvh]'
                  }`}
                >
                  {!result ? (
                    <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
                      <Sparkles size={18} className="mx-auto text-remembra-text-muted mb-2" />
                      <p className="text-sm text-remembra-text-muted">Generate to see the response here.</p>
                    </div>
                  ) : tool.id === 'flowchart' ? (
                    <div className="overflow-auto custom-scrollbar">
                      <MermaidDiagram chart={extractMermaid(result)} className="my-1 min-w-max" />
                    </div>
                  ) : (
                    <MarkdownRenderer content={result} className="max-w-none break-words" />
                  )}
                </div>

                {lastError && <p className="mt-3 text-xs text-red-400">{lastError}</p>}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <div
        data-nav-scroll="true"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 safe-top safe-bottom-nav custom-scrollbar"
      >
        <header className="mt-4 mb-6">
          <div className="liquid-glass rounded-3xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-remembra-text-muted mb-2">AI Workspace</p>
                <h1 className="text-2xl font-semibold text-remembra-text-primary">AI Studio</h1>
                <p className="text-sm text-remembra-text-secondary mt-1 max-w-xl">
                  Build summaries, quizzes, concept maps, and recall-ready notes without leaving your learning flow.
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-remembra-accent-primary/15 flex items-center justify-center">
                <LayoutGrid size={20} className="text-remembra-accent-primary" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-black/40 text-remembra-text-secondary border border-white/10 flex items-center gap-1">
                <BrainCircuit size={12} />
                {provider.preferredReasoningModel}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-black/40 text-remembra-text-secondary border border-white/10">
                {provider.mode === 'live' ? 'Live AI active' : 'Fallback mode'}
              </span>
            </div>
          </div>
        </header>

        <section className="mb-5">
          <button
            onClick={() => setMode('chat')}
            className="w-full rounded-2xl border border-remembra-accent-primary/20 bg-remembra-accent-primary/8 p-4 text-left flex items-center gap-3 hover:bg-remembra-accent-primary/12 transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-remembra-accent-primary/15 flex items-center justify-center">
              <MessageCircle size={18} className="text-remembra-accent-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-remembra-text-primary">Tutor Chat</p>
              <p className="text-xs text-remembra-text-muted">Ask questions with optional item context and keep a focused dialogue.</p>
            </div>
          </button>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-remembra-text-muted uppercase tracking-wider mb-3">Toolbox</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TOOL_DEFS.map((entry) => {
              const Icon = entry.icon;
              return (
                <button
                  key={entry.id}
                  onClick={() => goToTools(entry.id)}
                  className="glass-card rounded-2xl p-4 text-left"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${entry.color}20` }}>
                    <Icon size={18} style={{ color: entry.color }} />
                  </div>
                  <p className="text-sm font-semibold text-remembra-text-primary mb-1">{entry.name}</p>
                  <p className="text-xs text-remembra-text-muted leading-relaxed">{entry.desc}</p>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
