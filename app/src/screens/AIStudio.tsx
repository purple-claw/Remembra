import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { aiService } from '@/services/aiService';
import {
  ArrowLeft,
  AlertCircle,
  FileText,
  GitBranch,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { MermaidDiagram } from '@/components/MermaidDiagram';

type Mode = 'home' | 'tool' | 'chat';
type ToolId = 'summary' | 'bullets' | 'flowchart' | 'quiz' | 'mnemonics';

interface Tool {
  id: ToolId;
  name: string;
  desc: string;
  icon: React.ElementType;
  color: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const TOOLS: Tool[] = [
  {
    id: 'summary',
    name: 'Deep Summary',
    desc: 'Condensed notes for quick reviews',
    icon: FileText,
    color: '#FF8000',
  },
  {
    id: 'bullets',
    name: 'Key Bullets',
    desc: 'Extract core takeaways',
    icon: Sparkles,
    color: '#FF5A1F',
  },
  {
    id: 'flowchart',
    name: 'Concept Map',
    desc: 'Visual relationships',
    icon: GitBranch,
    color: '#00B8D9',
  },
  {
    id: 'quiz',
    name: 'Recall Quiz',
    desc: 'Active learning drills',
    icon: HelpCircle,
    color: '#00D26A',
  },
  {
    id: 'mnemonics',
    name: 'Memory Hooks',
    desc: 'Memorable associations',
    icon: Lightbulb,
    color: '#FFB800',
  },
];

function extractMermaid(raw: string): string {
  const match = raw.match(/```mermaid\n([\s\S]*?)\n```/i);
  if (match?.[1]) return match[1].trim();
  return raw.replace(/```mermaid\n?/gi, '').replace(/```\n?/g, '').trim();
}

function QuizMarkdown(qa: { question: string; answer: string }[]): string {
  return qa
    .map((item, i) => `### Q${i + 1}\n${item.question}\n\n**Answer:** ${item.answer}`)
    .join('\n\n');
}

export function AIStudio() {
  const { memoryItems, updateMemoryItem } = useStore();
  const provider = aiService.getProviderStatus();

  const [mode, setMode] = useState<Mode>('home');
  const [activeTool, setActiveTool] = useState<ToolId>('summary');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hello! I\'m your study tutor. Ask any question about your material.' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const tool = useMemo(() => TOOLS.find((t) => t.id === activeTool) || TOOLS[0], [activeTool]);
  const selectedItem = useMemo(() => memoryItems.find((i) => i.id === selectedItemId) || null, [memoryItems, selectedItemId]);

  const effectiveInput = selectedItem?.content || input;
  const effectiveTitle = selectedItem?.title || 'Study Material';

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleGenerate = async () => {
    if (!effectiveInput.trim()) {
      toast.error('Provide input or select a memory item');
      return;
    }

    if (!provider.hasKeys) {
      setError('No AI provider configured. Add API keys to.env.local');
      return;
    }

    setLoading(true);
    setError('');
    setOutput('');

    try {
      let result = '';

      if (tool.id === 'summary') {
        result = await aiService.generateSummary(effectiveInput, effectiveTitle);
      } else if (tool.id === 'bullets') {
        const bullets = await aiService.generateBulletPoints(effectiveInput, effectiveTitle);
        result = bullets.map((b) => `- ${b}`).join('\n');
      } else if (tool.id === 'flowchart') {
        result = await aiService.generateFlowchart(effectiveInput, effectiveTitle);
      } else if (tool.id === 'quiz') {
        const qa = await aiService.generateQuizQuestions(effectiveInput, effectiveTitle, 5);
        if (qa.length === 0) {
          throw new Error('No questions generated');
        }
        result = QuizMarkdown(qa);
      } else if (tool.id === 'mnemonics') {
        result = await aiService.generateMnemonics(effectiveInput, effectiveTitle);
      }

      setOutput(result);
      toast.success('Generated!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      setError(msg);
      toast.error('Error: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedItem || !output.trim()) {
      toast.error('Need output to save. Select item & generate first.');
      return;
    }

    setSaving(true);
    try {
      const updates: Record<string, any> = {};
      if (tool.id === 'summary') updates.ai_summary = output;
      else if (tool.id === 'flowchart') updates.ai_flowchart = extractMermaid(output);
      else if (tool.id === 'bullets') {
        updates.ai_bullet_points = output
          .split('\n')
          .map((l) => l.replace(/^[-*]\s*/, '').trim())
          .filter(Boolean);
      } else if (tool.id === 'quiz') {
        // Save as notes for now
        updates.notes = output;
      } else {
        updates.notes = output;
      }

      await updateMemoryItem(selectedItem.id, updates);
      toast.success('Saved!');
      setOutput('');
    } catch (err) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    toast.success('Copied!');
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    if (!provider.hasKeys) {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'API not configured.' }]);
      return;
    }

    const userMsg = chatInput;
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const reply = await aiService.chat(
        selectedItem?.content || '',
        selectedItem?.title || 'Chat',
        userMsg,
      );
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Chat failed';
      setChatMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${msg}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ===== RENDER: HOME =====
  if (mode === 'home') {
    return (
      <div className="min-h-screen bg-black px-4 pt-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-remembra-text-primary mb-2">AI Studio</h1>
          <p className="text-remembra-text-muted mb-6">Enhance your learning with AI-powered tools</p>

          {!provider.hasKeys && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-3">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-400">API Not Configured</p>
                <p className="text-sm text-red-300/80">
                  Add <span className="font-mono text-xs">VITE_GROQ_API_KEY</span> or{' '}
                  <span className="font-mono text-xs">VITE_OPENROUTER_API_KEY</span> to .env.local
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTool(t.id);
                  setMode('tool');
                  setOutput('');
                  setError('');
                  setInput('');
                }}
                disabled={!provider.hasKeys}
                className={`p-4 rounded-xl border transition-all text-left ${
                  provider.hasKeys
                    ? 'bg-remembra-bg-secondary border-white/10 hover:border-white/20 cursor-pointer'
                    : 'bg-remembra-bg-tertiary border-white/5 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start gap-3">
                  <t.icon size={20} style={{ color: t.color }} className="flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-remembra-text-primary text-sm">{t.name}</h3>
                    <p className="text-xs text-remembra-text-muted">{t.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 p-4 bg-remembra-bg-secondary border border-white/10 rounded-xl">
            <h3 className="font-semibold text-remembra-text-primary mb-2 flex items-center gap-2">
              <MessageCircle size={16} /> Chat Mode
            </h3>
            <p className="text-sm text-remembra-text-muted mb-3">
              Have a conversation with your study tutor about any topic or selected material.
            </p>
            <Button
              onClick={() => setMode('chat')}
              disabled={!provider.hasKeys}
              className="w-full bg-gradient-to-r from-remembra-accent-primary to-remembra-accent-secondary text-white"
            >
              Open Chat
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ===== RENDER: TOOL MODE =====
  if (mode === 'tool') {
    return (
      <div className="min-h-screen bg-black px-4 pt-6 pb-24">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setMode('home')}
              className="w-10 h-10 rounded-xl border border-white/10 bg-remembra-bg-secondary flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-remembra-text-primary">{tool.name}</h1>
              <p className="text-sm text-remembra-text-muted">{tool.desc}</p>
            </div>
          </div>

          {/* Item Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-remembra-text-secondary mb-2">
              Select Memory Item (optional)
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full bg-remembra-bg-secondary border border-white/10 rounded-lg px-4 py-2.5 text-remembra-text-primary text-sm"
            >
              <option value="">No selection - use text below</option>
              {memoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>

          {/* Input Area */}
          {!selectedItem && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-remembra-text-secondary mb-2">
                Or paste content here
              </label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste your study notes, code, or topic..."
                className="min-h-[200px] bg-remembra-bg-secondary border border-white/10 rounded-lg p-4 text-remembra-text-primary"
              />
            </div>
          )}

          {selectedItem && (
            <div className="mb-6 p-4 bg-remembra-bg-secondary border border-white/10 rounded-lg">
              <p className="text-xs text-remembra-text-muted mb-2">CONTENT FROM: {selectedItem.title}</p>
              <p className="text-sm text-remembra-text-primary line-clamp-4">{selectedItem.content}</p>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={loading || !effectiveInput.trim()}
            className="w-full mb-6 bg-gradient-to-r from-remembra-accent-primary to-remembra-accent-secondary text-white"
          >
            {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
            {loading ? 'Generating...' : 'Generate'}
          </Button>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Output Area */}
          {output && (
            <div className="mb-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="font-semibold text-remembra-text-primary">Result</h2>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    className="text-xs"
                  >
                    Copy
                  </Button>
                  {selectedItem && (
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                      className="text-xs bg-remembra-accent-primary text-white"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Render based on tool type */}
              {tool.id === 'flowchart' ? (
                <div className="bg-remembra-bg-secondary border border-white/10 rounded-lg overflow-hidden">
                  <MermaidDiagram chart={output} />
                </div>
              ) : (
                <div className="bg-remembra-bg-secondary border border-white/10 rounded-lg p-4">
                  <MarkdownRenderer content={output} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== RENDER: CHAT MODE =====
  if (mode === 'chat') {
    return (
      <div className="h-screen bg-black flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-white/10 bg-black/80 backdrop-blur-xl px-4 pt-6 pb-4">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button
              onClick={() => setMode('home')}
              className="w-10 h-10 rounded-xl border border-white/10 bg-remembra-bg-secondary flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-remembra-text-primary">Study Tutor</h1>
              <p className="text-xs text-remembra-text-muted">
                {selectedItem ? `Context: ${selectedItem.title}` : 'No context'}
              </p>
            </div>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="ml-auto bg-remembra-bg-secondary border border-white/10 rounded-lg px-2 py-1.5 text-xs text-remembra-text-secondary max-w-[200px]"
            >
              <option value="">No context</option>
              {memoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="max-w-2xl mx-auto space-y-4">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-remembra-accent-primary to-remembra-accent-secondary text-white'
                      : 'bg-remembra-bg-secondary text-remembra-text-primary border border-white/10'
                  }`}
                >
                  <MarkdownRenderer content={msg.content} />
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-remembra-bg-secondary rounded-2xl px-4 py-3">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-remembra-accent-primary rounded-full animate-pulse" />
                    <div className="w-2 h-2 bg-remembra-accent-primary rounded-full animate-pulse delay-100" />
                    <div className="w-2 h-2 bg-remembra-accent-primary rounded-full animate-pulse delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-white/10 bg-black/80 backdrop-blur-xl px-4 py-4">
          <div className="max-w-2xl mx-auto flex gap-3">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
              placeholder="Ask a question..."
              className="flex-1 bg-remembra-bg-secondary border border-white/10 rounded-lg px-4 py-2.5 text-remembra-text-primary text-sm placeholder-remembra-text-muted"
            />
            <Button
              onClick={handleSendChat}
              disabled={chatLoading || !chatInput.trim()}
              className="bg-gradient-to-r from-remembra-accent-primary to-remembra-accent-secondary text-white"
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
