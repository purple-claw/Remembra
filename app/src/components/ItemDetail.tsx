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
  StickyNote
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { MermaidDiagram } from '@/components/MermaidDiagram';
import { toast } from 'sonner';

interface ItemDetailProps {
  item: MemoryItem;
  onClose: () => void;
}

export function ItemDetail({ item, onClose }: ItemDetailProps) {
  const { getCategoryById, updateMemoryItem, startReviewSession } = useStore();
  const category = getCategoryById(item.category_id);
  
  const [activeTab, setActiveTab] = useState<'content' | 'summary' | 'flowchart' | 'notes'>('content');
  const [notes, setNotes] = useState(item.notes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
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
      ? Math.round((item.review_history.filter(r => r.performance !== 'hard').length / item.review_history.length) * 100)
      : 0,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Backdrop blur overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-remembra-accent-primary/5 via-transparent to-remembra-accent-secondary/5" />
      
      <div className="relative h-full flex flex-col overflow-hidden">
        {/* Header */}
        <header className="glass-panel border-b border-white/5 px-4 py-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="glass-button p-2 rounded-xl"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${category?.color}30` }}
                >
                  <span className="text-xs" style={{ color: category?.color }}>
                    {item.content_type === 'code' ? '</>' : item.content_type.charAt(0).toUpperCase()}
                  </span>
                </div>
                <Badge variant="outline" className={`text-[10px] ${getStatusColor(item.status)}`}>
                  {item.status}
                </Badge>
              </div>
              <h1 className="text-lg font-bold text-white truncate">{item.title}</h1>
            </div>
            
            <Button
              onClick={() => startReviewSession([item])}
              size="sm"
              className="gradient-primary text-white gap-1"
            >
              <Play size={14} />
              Review
            </Button>
          </div>
        </header>

        {/* Stats Bar */}
        <div className="glass-card mx-4 mt-4 p-3 rounded-2xl flex-shrink-0">
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-remembra-accent-primary mb-1">
                <Target size={14} />
                <span className="text-lg font-bold">{reviewStats.totalReviews}</span>
              </div>
              <span className="text-[10px] text-remembra-text-muted">Reviews</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-remembra-success mb-1">
                <TrendingUp size={14} />
                <span className="text-lg font-bold">{reviewStats.successRate}%</span>
              </div>
              <span className="text-[10px] text-remembra-text-muted">Success</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-remembra-warning mb-1">
                <Clock size={14} />
                <span className="text-lg font-bold">{reviewStats.avgTime}s</span>
              </div>
              <span className="text-[10px] text-remembra-text-muted">Avg Time</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-remembra-accent-secondary mb-1">
                <Brain size={14} />
                <span className="text-lg font-bold">{item.repetition}</span>
              </div>
              <span className="text-[10px] text-remembra-text-muted">Reps</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 px-4 mt-4 overflow-x-auto scrollbar-hide flex-shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap
                transition-all duration-300
                ${activeTab === tab.id 
                  ? 'glass-card text-white border-remembra-accent-primary/50' 
                  : 'glass-button text-remembra-text-secondary hover:text-white'
                }
              `}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="space-y-4 animate-fade-in">
              <div className="glass-card p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">
                    {item.content_type === 'code' ? 'Code Snippet' : 'Content'}
                  </h3>
                  <button
                    onClick={handleCopyContent}
                    className="glass-button px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                
                {item.content_type === 'code' ? (
                  <div className="bg-black/50 rounded-xl overflow-hidden border border-white/5">
                    <MarkdownRenderer content={`\`\`\`\n${item.content}\n\`\`\``} />
                  </div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <MarkdownRenderer content={item.content} />
                  </div>
                )}
              </div>

              {/* Attachments */}
              {item.attachments.length > 0 && (
                <div className="glass-card p-4 rounded-2xl">
                  <h3 className="text-sm font-semibold text-white mb-3">Attachments</h3>
                  <div className="space-y-2">
                    {item.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-3 glass-button p-3 rounded-xl">
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
              <div className="glass-card p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-remembra-accent-primary" />
                    AI Summary
                  </h3>
                  <button
                    onClick={() => handleGenerateAI('summary')}
                    disabled={isGeneratingAI}
                    className="glass-button px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs disabled:opacity-50"
                  >
                    {isGeneratingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {aiSummary ? 'Regenerate' : 'Generate'}
                  </button>
                </div>
                
                {aiSummary ? (
                  <div className="prose prose-invert prose-sm max-w-none">
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
              <div className="glass-card p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <ListChecks size={16} className="text-remembra-success" />
                    Key Points
                  </h3>
                  <button
                    onClick={() => handleGenerateAI('bullets')}
                    disabled={isGeneratingAI}
                    className="glass-button px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs disabled:opacity-50"
                  >
                    {isGeneratingAI ? <Loader2 size={12} className="animate-spin" /> : <ListChecks size={12} />}
                    {aiBulletPoints.length > 0 ? 'Regenerate' : 'Generate'}
                  </button>
                </div>
                
                {aiBulletPoints.length > 0 ? (
                  <ul className="space-y-2">
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
              <div className="glass-card p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <GitBranch size={16} className="text-remembra-accent-secondary" />
                    Concept Flowchart
                  </h3>
                  <button
                    onClick={() => handleGenerateAI('flowchart')}
                    disabled={isGeneratingAI}
                    className="glass-button px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs disabled:opacity-50"
                  >
                    {isGeneratingAI ? <Loader2 size={12} className="animate-spin" /> : <GitBranch size={12} />}
                    {aiFlowchart ? 'Regenerate' : 'Generate'}
                  </button>
                </div>
                
                {aiFlowchart ? (
                  <div className="overflow-x-auto">
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
              <div className="glass-card p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <StickyNote size={16} className="text-remembra-warning" />
                    Personal Notes
                  </h3>
                  {isEditingNotes ? (
                    <button
                      onClick={handleSaveNotes}
                      disabled={isSaving}
                      className="glass-button px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs text-remembra-success disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Save
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className="glass-button px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs"
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
              <div className="glass-card p-4 rounded-2xl">
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
                              review.performance === 'good' ? 'text-yellow-400 border-yellow-400/30' :
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
      </div>
    </div>
  );
}
