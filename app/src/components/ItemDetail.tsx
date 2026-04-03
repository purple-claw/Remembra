import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { MemoryItem } from '@/types';
import { 
  ArrowLeft, 
  Brain, 
  Code, 
  FileText, 
  ListChecks,
  GitBranch,
  Sparkles,
  Edit3,
  Save,
  Clock,
  Target,
  TrendingUp,
  ChevronRight,
  Copy,
  Check,
  Play,
  Loader2,
  StickyNote,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { MermaidDiagram } from '@/components/MermaidDiagram';
import { toast } from 'sonner';
import { getItemScheduleLabel } from '@/domain/review147';

interface ItemDetailProps {
  item: MemoryItem;
  onClose: () => void;
}

export function ItemDetail({ item, onClose }: ItemDetailProps) {
  const { getCategoryById, updateMemoryItem, startReviewSession, deleteMemoryItem } = useStore();
  const category = getCategoryById(item.category_id);
  
  const [activeTab, setActiveTab] = useState<'content' | 'summary' | 'flowchart' | 'notes'>('content');
  const [notes, setNotes] = useState(item.notes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // AI-generated content states
  const [aiSummary, setAiSummary] = useState(item.ai_summary || '');
  const [aiBulletPoints, setAiBulletPoints] = useState<string[]>(item.ai_bullet_points || []);
  const [aiFlowchart, setAiFlowchart] = useState(item.ai_flowchart || '');

  const tabs = [
    { id: 'content', label: 'Content', icon: item.content_type === 'code' ? Code : FileText },
    { id: 'summary', label: 'AI Summary', icon: Sparkles },
    { id: 'flowchart', label: 'Flowchart', icon: GitBranch },
    { id: 'notes', label: 'Notes', icon: StickyNote },
  ];

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await updateMemoryItem(item.id, { notes });
      toast.success('Notes saved');
      setIsEditingNotes(false);
    } catch (error) {
      toast.error('Failed to save notes');
    }
    setIsSaving(false);
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(item.content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateAI = async (type: 'summary' | 'bullets' | 'flowchart') => {
    setIsGeneratingAI(true);
    try {
      // This will call the AI service (to be implemented)
      const { aiService } = await import('@/services/aiService');
      
      if (type === 'summary') {
        const summary = await aiService.generateSummary(item.content, item.title);
        setAiSummary(summary);
        await updateMemoryItem(item.id, { ai_summary: summary });
      } else if (type === 'bullets') {
        const bullets = await aiService.generateBulletPoints(item.content, item.title);
        setAiBulletPoints(bullets);
        await updateMemoryItem(item.id, { ai_bullet_points: bullets });
      } else if (type === 'flowchart') {
        const flowchart = await aiService.generateFlowchart(item.content, item.title);
        setAiFlowchart(flowchart);
        await updateMemoryItem(item.id, { ai_flowchart: flowchart });
      }
      
      toast.success('AI content generated');
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate AI content');
    }
    setIsGeneratingAI(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'archived': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const reviewStats = {
    totalReviews: item.review_history.length,
    avgTime: item.review_history.length > 0 
      ? Math.round(item.review_history.reduce((a, b) => a + b.time_spent_seconds, 0) / item.review_history.length)
      : 0,
    successRate: item.review_history.length > 0
      ? Math.round((item.review_history.filter(r => r.performance === 'good' || r.performance === 'easy').length / item.review_history.length) * 100)
      : 0,
  };

  const contentTypeLabel = item.content_type === 'code'
    ? 'Code'
    : item.content_type.charAt(0).toUpperCase() + item.content_type.slice(1);

  const updatedLabel = item.updated_at
    ? new Date(item.updated_at).toLocaleDateString()
    : 'Unknown';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_500px_at_20%_-5%,rgba(255,128,0,0.22),transparent_60%),radial-gradient(900px_500px_at_90%_0%,rgba(0,210,106,0.15),transparent_65%)]" />

      <div className="relative h-full overflow-y-auto custom-scrollbar px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl space-y-4 pb-6">
          <header className="rounded-3xl border border-white/10 bg-black/65 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <button
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => startReviewSession([item])}
                  size="sm"
                  className="gradient-primary text-white gap-1.5"
                >
                  <Play size={14} />
                  Review
                </Button>

                <button
                  onClick={() => {
                    if (!confirmDelete) {
                      setConfirmDelete(true);
                      setTimeout(() => setConfirmDelete(false), 3000);
                      return;
                    }
                    setIsDeleting(true);
                    deleteMemoryItem(item.id)
                      .then(() => {
                        toast.success('Item deleted');
                        onClose();
                      })
                      .catch(() => toast.error('Failed to delete'))
                      .finally(() => setIsDeleting(false));
                  }}
                  disabled={isDeleting}
                  className={`rounded-xl border p-2.5 transition-colors ${
                    confirmDelete
                      ? 'border-red-500/50 bg-red-500/20 text-red-400'
                      : 'border-white/10 bg-white/[0.04] text-remembra-text-muted hover:text-red-400 hover:border-red-500/30'
                  }`}
                  title={confirmDelete ? 'Tap again to confirm' : 'Delete item'}
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`text-[10px] uppercase tracking-wide ${getStatusColor(item.status)}`}>
                  {item.status}
                </Badge>
                <Badge variant="outline" className="text-[10px] border-remembra-accent-primary/40 text-remembra-accent-primary">
                  {getItemScheduleLabel(item)}
                </Badge>
                <Badge variant="outline" className="text-[10px] border-white/15 text-remembra-text-secondary">
                  {contentTypeLabel}
                </Badge>
                <Badge variant="outline" className="text-[10px] border-white/15 text-remembra-text-secondary">
                  Updated {updatedLabel}
                </Badge>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10"
                  style={{ backgroundColor: `${category?.color}20` }}
                >
                  <span className="text-sm font-semibold" style={{ color: category?.color || '#ffffff' }}>
                    {item.content_type === 'code' ? '</>' : item.content_type.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="min-w-0">
                  <h1 className="text-balance text-2xl font-semibold leading-tight text-white sm:text-3xl">
                    {item.title}
                  </h1>
                  <p className="mt-1 text-sm text-remembra-text-muted">
                    {category?.name || 'Uncategorized'}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
              <div className="mb-1 flex items-center gap-2 text-remembra-accent-primary">
                <Target size={14} />
                <span className="text-xs uppercase tracking-wide">Reviews</span>
              </div>
              <p className="text-2xl font-semibold text-white">{reviewStats.totalReviews}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
              <div className="mb-1 flex items-center gap-2 text-remembra-success">
                <TrendingUp size={14} />
                <span className="text-xs uppercase tracking-wide">Success</span>
              </div>
              <p className="text-2xl font-semibold text-white">{reviewStats.successRate}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
              <div className="mb-1 flex items-center gap-2 text-remembra-warning">
                <Clock size={14} />
                <span className="text-xs uppercase tracking-wide">Avg Time</span>
              </div>
              <p className="text-2xl font-semibold text-white">{reviewStats.avgTime}s</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
              <div className="mb-1 flex items-center gap-2 text-remembra-accent-secondary">
                <Brain size={14} />
                <span className="text-xs uppercase tracking-wide">Repetitions</span>
              </div>
              <p className="text-2xl font-semibold text-white">{item.repetition}</p>
            </div>
          </section>

          <nav className="rounded-2xl border border-white/10 bg-black/50 p-1.5">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-remembra-accent-primary/30 to-remembra-accent-secondary/20 text-white border border-remembra-accent-primary/30'
                      : 'text-remembra-text-secondary hover:text-white'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),300px]">
            <div className="min-w-0 space-y-4">
          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-3xl border border-white/10 bg-black/60 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)] dynamic-container">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-remembra-text-secondary">
                    {item.content_type === 'code' ? 'Code Snippet' : 'Content'}
                  </h3>
                  <button
                    onClick={handleCopyContent}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-remembra-text-secondary flex items-center gap-1.5"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                
                {item.content_type === 'code' ? (
                  <div className="bg-black/50 rounded-xl overflow-x-auto border border-white/5">
                    <MarkdownRenderer content={`\`\`\`\n${item.content}\n\`\`\``} />
                  </div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-headings:font-bold prose-p:text-remembra-text-secondary prose-p:leading-relaxed prose-a:text-remembra-accent-primary prose-strong:text-white prose-code:text-remembra-accent-secondary prose-code:bg-black/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
                    <MarkdownRenderer content={item.content} />
                  </div>
                )}
              </div>

              {/* Attachments */}
              {item.attachments.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-black/55 p-5">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-remembra-text-secondary">Attachments</h3>
                  <div className="space-y-2">
                    {item.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <FileText size={18} className="text-remembra-accent-primary" />
                        <span className="text-sm text-white flex-1">{att.name}</span>
                        <ChevronRight size={16} className="text-remembra-text-muted" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Summary Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-4 animate-fade-in">
              {/* Summary Section */}
              <div className="rounded-3xl border border-white/10 bg-black/60 p-5 dynamic-container">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-remembra-accent-primary" />
                    AI Summary
                  </h3>
                  <button
                    onClick={() => handleGenerateAI('summary')}
                    disabled={isGeneratingAI}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-remembra-text-secondary flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isGeneratingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {aiSummary ? 'Regenerate' : 'Generate'}
                  </button>
                </div>
                
                {aiSummary ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-remembra-text-secondary prose-p:leading-relaxed">
                    <MarkdownRenderer content={aiSummary} />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full glass-card mx-auto mb-3 flex items-center justify-center">
                      <Sparkles size={24} className="text-remembra-accent-primary" />
                    </div>
                    <p className="text-sm text-remembra-text-muted">
                      Generate an AI summary for quick review
                    </p>
                  </div>
                )}
              </div>

              {/* Bullet Points Section */}
              <div className="rounded-3xl border border-white/10 bg-black/60 p-5 dynamic-container">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <ListChecks size={16} className="text-remembra-success" />
                    Key Points
                  </h3>
                  <button
                    onClick={() => handleGenerateAI('bullets')}
                    disabled={isGeneratingAI}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-remembra-text-secondary flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isGeneratingAI ? <Loader2 size={12} className="animate-spin" /> : <ListChecks size={12} />}
                    {aiBulletPoints.length > 0 ? 'Regenerate' : 'Generate'}
                  </button>
                </div>
                
                {aiBulletPoints.length > 0 ? (
                  <ul className="space-y-2 max-h-[40dvh] overflow-y-auto custom-scrollbar pr-1">
                    {aiBulletPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-remembra-text-secondary">
                        <span className="w-1.5 h-1.5 rounded-full bg-remembra-success mt-2 flex-shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full glass-card mx-auto mb-3 flex items-center justify-center">
                      <ListChecks size={24} className="text-remembra-success" />
                    </div>
                    <p className="text-sm text-remembra-text-muted">
                      Extract key bullet points for easy memorization
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Flowchart Tab */}
          {activeTab === 'flowchart' && (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-3xl border border-white/10 bg-black/60 p-5 dynamic-container">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <GitBranch size={16} className="text-remembra-accent-secondary" />
                    Concept Flowchart
                  </h3>
                  <button
                    onClick={() => handleGenerateAI('flowchart')}
                    disabled={isGeneratingAI}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-remembra-text-secondary flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isGeneratingAI ? <Loader2 size={12} className="animate-spin" /> : <GitBranch size={12} />}
                    {aiFlowchart ? 'Regenerate' : 'Generate'}
                  </button>
                </div>
                
                {aiFlowchart ? (
                  <div className="max-h-[56dvh] overflow-auto custom-scrollbar rounded-xl border border-white/5 bg-black/20 p-2">
                    <MermaidDiagram chart={aiFlowchart} className="my-2" />
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 rounded-full glass-card mx-auto mb-4 flex items-center justify-center">
                      <GitBranch size={32} className="text-remembra-accent-secondary" />
                    </div>
                    <p className="text-sm text-remembra-text-muted mb-2">
                      Generate a visual flowchart of the concepts
                    </p>
                    <p className="text-xs text-remembra-text-muted">
                      AI will create an ASCII diagram showing relationships
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-3xl border border-white/10 bg-black/60 p-5 dynamic-container">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <StickyNote size={16} className="text-remembra-warning" />
                    Personal Notes
                  </h3>
                  {isEditingNotes ? (
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSaving}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-remembra-success flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-remembra-text-secondary flex items-center gap-1.5"
                    >
                      <Edit3 size={12} />
                      Edit
                    </button>
                  )}
                </div>
                
                {isEditingNotes ? (
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add your personal notes, mnemonics, or memory tricks..."
                    className="min-h-[200px] bg-black/30 border-white/10 text-white placeholder:text-remembra-text-muted resize-none"
                    autoFocus
                  />
                ) : notes ? (
                  <p className="text-remembra-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                    {notes}
                  </p>
                ) : (
                  <div 
                    className="text-center py-12 cursor-pointer hover:bg-white/5 rounded-xl transition-colors"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    <div className="w-16 h-16 rounded-full glass-card mx-auto mb-3 flex items-center justify-center">
                      <Edit3 size={24} className="text-remembra-warning" />
                    </div>
                    <p className="text-sm text-remembra-text-muted">
                      Tap to add personal notes and memory tricks
                    </p>
                  </div>
                )}
              </div>

              {/* Review History */}
              <div className="rounded-3xl border border-white/10 bg-black/55 p-5">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-remembra-text-muted" />
                  Review History
                </h3>
                
                {item.review_history.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {item.review_history.slice().reverse().map((review, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <span className="text-xs text-remembra-text-muted">
                          {new Date(review.date).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-remembra-text-secondary">
                            {review.time_spent_seconds}s
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] ${
                              review.performance === 'easy' ? 'text-green-400 border-green-400/30' :
                              review.performance === 'good' ? 'text-blue-400 border-blue-400/30' :
                              review.performance === 'hard' ? 'text-orange-400 border-orange-400/30' :
                              'text-red-400 border-red-400/30'
                            }`}
                          >
                            {review.performance}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-remembra-text-muted text-center py-4">
                    No reviews yet
                  </p>
                )}
              </div>
            </div>
          )}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-4 h-fit">
              <div className="rounded-3xl border border-white/10 bg-black/55 p-5">
                <h3 className="mb-3 text-xs uppercase tracking-widest text-remembra-text-muted">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => startReviewSession([item])}
                    className="w-full rounded-xl bg-gradient-to-r from-remembra-accent-primary to-remembra-accent-secondary px-3 py-2.5 text-sm font-medium text-white flex items-center justify-center gap-2"
                  >
                    <Play size={14} />
                    Start Review
                  </button>
                  <button
                    onClick={handleCopyContent}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-remembra-text-secondary flex items-center justify-center gap-2"
                  >
                    <Copy size={14} />
                    Copy Content
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/55 p-5">
                <h3 className="mb-3 text-xs uppercase tracking-widest text-remembra-text-muted">Item Facts</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                    <span className="text-remembra-text-muted">Category</span>
                    <span className="text-white">{category?.name || 'Uncategorized'}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                    <span className="text-remembra-text-muted">Schedule</span>
                    <span className="text-white">{getItemScheduleLabel(item)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                    <span className="text-remembra-text-muted">Status</span>
                    <span className="text-white capitalize">{item.status}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                    <span className="text-remembra-text-muted">Attachments</span>
                    <span className="text-white">{item.attachments.length}</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
