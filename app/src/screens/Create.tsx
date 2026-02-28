import { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import type { ContentType, Difficulty } from '@/types';
import {
  ArrowLeft, Type, Code, Image as ImageIcon, FileText, Layers,
  ChevronRight, Check, Sparkles, Calendar, Upload, X,
  Bold, Italic, List, ListOrdered, Quote, Link2, Code2,
  Heading1, Heading2, Eye, Edit, Plus, Zap, BookOpen, Tag, Gauge
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { toast } from 'sonner';
import { OPTIONAL_REVIEW_DAY_30, REVIEW_INTERVALS_147, getScheduledDateForStage, toIsoDate } from '@/domain/review147';
import { storageService } from '@/services/storageService';

const contentTypes: { id: ContentType; icon: React.ElementType; label: string; description: string; gradient: string }[] = [
  { id: 'text', icon: Type, label: 'Notes & Text', description: 'Concepts, explanations, theory', gradient: 'from-blue-500/20 to-blue-600/5' },
  { id: 'code', icon: Code, label: 'Code Snippet', description: 'Code with syntax highlighting', gradient: 'from-violet-500/20 to-violet-600/5' },
  { id: 'image', icon: ImageIcon, label: 'Image & Diagram', description: 'Visual learning materials', gradient: 'from-emerald-500/20 to-emerald-600/5' },
  { id: 'document', icon: FileText, label: 'Document', description: 'PDFs, articles, long-form', gradient: 'from-amber-500/20 to-amber-600/5' },
  { id: 'mixed', icon: Layers, label: 'Mixed Content', description: 'Combine multiple formats', gradient: 'from-rose-500/20 to-rose-600/5' },
];

const difficulties: { value: Difficulty; label: string; emoji: string; color: string; bg: string }[] = [
  { value: 'easy', label: 'Easy', emoji: '\u{1F7E2}', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40' },
  { value: 'medium', label: 'Medium', emoji: '\u{1F7E1}', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40' },
  { value: 'hard', label: 'Hard', emoji: '\u{1F534}', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20 hover:border-red-500/40' },
];

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  content?: string;
  path?: string;
  bucket?: string;
  mime_type?: string;
}

export function Create() {
  const { categories, addMemoryItem, addCategory, setScreen } = useStore();
  const [step, setStep] = useState(1);
  const [contentType, setContentType] = useState<ContentType>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalSteps = 3;

  const handleNext = () => {
    if (step === 1 && (!title.trim() || !content.trim())) {
      toast.error('Please fill in both title and content');
      return;
    }
    if (step === 2 && !categoryId && categories.length > 0) {
      toast.error('Please select a category');
      return;
    }
    setStep(step + 1);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (step === 1) {
      setScreen('dashboard');
    } else {
      setStep(step - 1);
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCreate = async () => {
    if (isCreating) return;
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    if (!categoryId) {
      toast.error('Please select a category');
      return;
    }
    setIsCreating(true);
    const cycleStartedAt = toIsoDate(new Date());
    const newItem = {
      category_id: categoryId,
      title: title.trim(),
      content,
      content_type: contentType,
      attachments: uploadedFiles.map(f => ({
        name: f.name,
        url: f.url || '',
        type: f.type.startsWith('image/') ? 'image' as const : contentType,
        size: f.size,
        path: f.path,
        bucket: f.bucket,
        mime_type: f.mime_type || f.type,
      })),
      difficulty,
      status: 'active' as const,
      next_review_date: getScheduledDateForStage(cycleStartedAt, 0),
      cycle_started_at: cycleStartedAt,
      review_stage: 0,
      review_template: '1-4-7',
      current_stage_index: 0,
      easiness_factor: 2.5,
      interval: REVIEW_INTERVALS_147[0],
      repetition: 0,
      lapse_count: 0,
      review_history: [],
      ai_summary: isGenerating ? '\u2022 AI summary will be generated\n\u2022 Key points extracted automatically\n\u2022 Review schedule created' : undefined,
    };
    try {
      await addMemoryItem(newItem);
      toast.success('Memory item created!', { description: 'Your 1-4-7 schedule is active.' });
      setScreen('dashboard');
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error('Failed to create item. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const generateAISummary = () => {
    setIsGenerating(true);
    setTimeout(() => { toast.success('AI summary will be generated after saving.'); }, 1200);
  };

  const getReviewDates = () => {
    const dates = [];
    const intervals = [...REVIEW_INTERVALS_147, OPTIONAL_REVIEW_DAY_30];
    for (const interval of intervals) {
      const date = new Date();
      date.setDate(date.getDate() + interval);
      dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    return dates;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) handleFiles(Array.from(files));
  };

  const handleFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      if (file.type.startsWith('text/') || /\.(md|js|ts|jsx|tsx|py|json|css|html)$/.test(file.name)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const fileContent = e.target?.result as string;
          const ext = file.name.split('.').pop() || '';
          const langMap: Record<string, string> = {
            js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
            py: 'python', json: 'json', css: 'css', html: 'html', md: 'markdown'
          };
          const lang = langMap[ext] || 'text';
          if (!content.trim()) {
            if (lang !== 'markdown' && lang !== 'text') {
              setContent(`\`\`\`${lang}\n${fileContent}\n\`\`\``);
              setContentType('code');
            } else {
              setContent(fileContent);
            }
            if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
          } else {
            setContent(prev => lang !== 'markdown' && lang !== 'text'
              ? prev + `\n\n\`\`\`${lang}\n${fileContent}\n\`\`\``
              : prev + '\n\n' + fileContent
            );
          }
          setUploadedFiles(prev => [...prev, { id, name: file.name, type: file.type, size: file.size, content: fileContent }]);
        };
        reader.readAsText(file);
      } else if (file.type.startsWith('image/')) {
        try {
          const uploaded = await storageService.uploadImage(file);
          setUploadedFiles(prev => [...prev, { id, name: file.name, type: file.type, size: file.size, url: uploaded.url, path: uploaded.path, bucket: uploaded.bucket, mime_type: uploaded.mime_type }]);
          setContent(prev => prev + `\n\n![${file.name}](${uploaded.url})`);
          setContentType('image');
          toast.success(`Uploaded ${file.name}`);
        } catch (error) {
          console.warn('Image upload failed, using local fallback:', error);
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            setUploadedFiles(prev => [...prev, { id, name: file.name, type: file.type, size: file.size, url: dataUrl, mime_type: file.type }]);
            setContent(prev => prev + `\n\n![${file.name}](${dataUrl})`);
            setContentType('image');
          };
          reader.readAsDataURL(file);
          toast.warning(`Cloud upload failed for ${file.name}. Stored locally.`);
        }
      } else {
        setUploadedFiles(prev => [...prev, { id, name: file.name, type: file.type, size: file.size, mime_type: file.type }]);
        toast.info(`File "${file.name}" attached`);
      }
    }
  }, [content, title]);

  const removeFile = async (id: string) => {
    const target = uploadedFiles.find(f => f.id === id);
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
    if (target?.path && target.bucket) {
      await storageService.removeAttachments([{
        type: 'image', url: target.url || '', name: target.name,
        size: target.size, path: target.path, bucket: target.bucket, mime_type: target.mime_type,
      }]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      const newPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const createCategory = (name: string) => {
    if (!name.trim()) return;
    const colors = ['#FF8000', '#FF4500', '#E81224', '#00D26A', '#6366F1', '#FFB800', '#06B6D4'];
    const icons = ['code', 'book-open', 'flask', 'languages', 'calculator'];
    const newCat = {
      name: name.trim(),
      color: colors[categories.length % colors.length],
      icon: icons[categories.length % icons.length],
      order_index: categories.length,
      is_default: false,
    };
    addCategory(newCat).then((created) => {
      setCategoryId(created.id);
      setNewCategoryName('');
      setShowNewCategory(false);
      toast.success('Category created!');
    }).catch((err: unknown) => {
      console.error('Category creation failed:', err);
      toast.error('Failed to create category.');
    });
  };

  const selectedCategory = categories.find(c => c.id === categoryId);

  return (
    <div className="fixed inset-0 min-h-[100dvh] bg-black flex flex-col z-50">
      {/* Header */}
      <header className="flex-shrink-0 px-4 sm:px-5 safe-top pb-2">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-remembra-text-secondary hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  s <= step
                    ? 'w-8 bg-gradient-to-r from-remembra-accent-primary to-[#FF4500]'
                    : 'w-4 bg-white/[0.08]'
                }`}
              />
            ))}
          </div>

          <span className="text-xs text-remembra-text-muted font-medium tabular-nums">
            {step}/{totalSteps}
          </span>
        </div>

        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-remembra-accent-primary/20 to-transparent flex items-center justify-center">
            {step === 1 && <BookOpen size={16} className="text-remembra-accent-primary" />}
            {step === 2 && <Tag size={16} className="text-remembra-accent-primary" />}
            {step === 3 && <Eye size={16} className="text-remembra-accent-primary" />}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white leading-tight">
              {step === 1 && 'Create Memory'}
              {step === 2 && 'Organize'}
              {step === 3 && 'Review & Save'}
            </h1>
            <p className="text-xs text-remembra-text-muted">
              {step === 1 && 'Add your learning material'}
              {step === 2 && 'Categorize and set difficulty'}
              {step === 3 && 'Confirm and start your schedule'}
            </p>
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 pt-3 pb-32 scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* STEP 1: Content */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-remembra-text-muted mb-2.5 block">Content Type</label>
              <div className="flex flex-wrap gap-2">
                {contentTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = contentType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setContentType(type.id)}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                        isSelected
                          ? 'bg-remembra-accent-primary/15 border-remembra-accent-primary/40 text-white'
                          : 'bg-white/[0.03] border-white/[0.06] text-remembra-text-muted hover:text-white hover:border-white/[0.12]'
                      }`}
                    >
                      <Icon size={15} className={isSelected ? 'text-remembra-accent-primary' : ''} />
                      {type.label}
                      {isSelected && <Check size={13} className="text-remembra-accent-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-remembra-text-muted mb-2 block">Title</label>
              <Input
                type="text"
                placeholder="What are you learning?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white/[0.03] border-white/[0.06] rounded-xl text-white placeholder:text-white/20 focus:border-remembra-accent-primary/50 focus:ring-1 focus:ring-remembra-accent-primary/20 h-12 text-[15px]"
              />
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all duration-200 cursor-pointer ${
                isDragging
                  ? 'border-remembra-accent-primary/60 bg-remembra-accent-primary/[0.06]'
                  : 'border-white/[0.08] hover:border-white/[0.16] bg-white/[0.015]'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.js,.ts,.jsx,.tsx,.py,.json,.css,.html,.jpg,.jpeg,.png,.gif,.webp,.pdf" onChange={handleFileSelect} className="hidden" />
              <Upload size={22} className={`mx-auto mb-2 ${isDragging ? 'text-remembra-accent-primary' : 'text-white/20'}`} />
              <p className="text-sm text-white/50">
                Drop files or <span className="text-remembra-accent-primary font-medium">browse</span>
              </p>
              <p className="text-[11px] text-white/25 mt-1">Text, Code, Markdown, Images</p>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-1.5">
                {uploadedFiles.map(file => (
                  <div key={file.id} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] p-2.5 rounded-xl group">
                    {file.type.startsWith('image/') && file.url ? (
                      <img src={file.url} alt={file.name} className="w-9 h-9 rounded-lg object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                        <FileText size={14} className="text-violet-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80 truncate">{file.name}</p>
                      <p className="text-[11px] text-white/30">{formatBytes(file.size)}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); removeFile(file.id); }} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 transition-all">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-remembra-text-muted">Content</label>
                <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06]">
                  <button
                    onClick={() => setIsPreviewMode(false)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                      !isPreviewMode ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    <Edit size={11} /> Write
                  </button>
                  <button
                    onClick={() => setIsPreviewMode(true)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                      isPreviewMode ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    <Eye size={11} /> Preview
                  </button>
                </div>
              </div>

              {!isPreviewMode && (
                <div className="flex items-center gap-0.5 p-1 bg-white/[0.02] border border-white/[0.06] border-b-0 rounded-t-xl overflow-x-auto scrollbar-hide">
                  {[
                    { action: () => insertMarkdown('**', '**'), icon: Bold, title: 'Bold' },
                    { action: () => insertMarkdown('*', '*'), icon: Italic, title: 'Italic' },
                    null,
                    { action: () => insertMarkdown('# '), icon: Heading1, title: 'H1' },
                    { action: () => insertMarkdown('## '), icon: Heading2, title: 'H2' },
                    null,
                    { action: () => insertMarkdown('- '), icon: List, title: 'Bullet' },
                    { action: () => insertMarkdown('1. '), icon: ListOrdered, title: 'Number' },
                    null,
                    { action: () => insertMarkdown('> '), icon: Quote, title: 'Quote' },
                    { action: () => insertMarkdown('`', '`'), icon: Code2, title: 'Code' },
                    { action: () => insertMarkdown('\n```\n', '\n```\n'), icon: Code, title: 'Block' },
                    { action: () => insertMarkdown('[', '](url)'), icon: Link2, title: 'Link' },
                  ].map((item, i) =>
                    item === null ? (
                      <div key={`sep-${i}`} className="w-px h-4 bg-white/[0.06] mx-0.5 flex-shrink-0" />
                    ) : (
                      <button
                        key={item.title}
                        onClick={item.action}
                        className="p-2 rounded-md hover:bg-white/[0.06] text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
                        title={item.title}
                      >
                        <item.icon size={14} />
                      </button>
                    )
                  )}
                </div>
              )}

              {isPreviewMode ? (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 min-h-[200px] max-h-[350px] overflow-y-auto custom-scrollbar">
                  {content ? <MarkdownRenderer content={content} /> : <p className="text-white/20 text-sm italic">Nothing to preview yet...</p>}
                </div>
              ) : (
                <Textarea
                  ref={textareaRef}
                  placeholder={contentType === 'code'
                    ? 'Paste your code here...\n\nUse ```language for code blocks'
                    : 'Start writing your notes...\n\n# Heading\n**Bold** and *italic*\n- Bullet points\n```code blocks```'
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={`bg-white/[0.02] border-white/[0.06] ${!isPreviewMode ? 'rounded-t-none border-t-0' : ''} rounded-b-xl text-white/90 placeholder:text-white/15 focus:border-remembra-accent-primary/30 min-h-[220px] resize-none font-mono text-sm leading-relaxed`}
                />
              )}
            </div>

            <button
              onClick={generateAISummary}
              disabled={isGenerating || !content.trim()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-remembra-accent-primary/10 to-transparent border border-remembra-accent-primary/20 text-sm text-remembra-accent-primary hover:border-remembra-accent-primary/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Sparkles size={14} />
              {isGenerating ? 'Generating...' : 'Generate AI summary on save'}
            </button>
          </div>
        )}

        {/* STEP 2: Organize */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-remembra-text-muted mb-3 block">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 border text-left ${
                      categoryId === cat.id
                        ? 'border-white/20 bg-white/[0.06]'
                        : 'border-white/[0.04] bg-white/[0.02] hover:border-white/[0.1]'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color, boxShadow: categoryId === cat.id ? `0 0 8px ${cat.color}60` : 'none' }}
                    />
                    <span className={categoryId === cat.id ? 'text-white' : 'text-white/60'}>{cat.name}</span>
                    {categoryId === cat.id && <Check size={13} className="text-white/60 ml-auto" />}
                  </button>
                ))}
              </div>

              {showNewCategory ? (
                <div className="flex items-center gap-2 mt-3">
                  <Input
                    type="text"
                    placeholder="Category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') createCategory(newCategoryName);
                      if (e.key === 'Escape') { setShowNewCategory(false); setNewCategoryName(''); }
                    }}
                    className="flex-1 bg-white/[0.03] border-white/[0.08] rounded-xl text-white placeholder:text-white/20 h-10 text-sm"
                    autoFocus
                  />
                  <button onClick={() => createCategory(newCategoryName)} className="h-10 w-10 rounded-xl bg-remembra-accent-primary/20 text-remembra-accent-primary flex items-center justify-center hover:bg-remembra-accent-primary/30 transition-colors">
                    <Check size={16} />
                  </button>
                  <button onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }} className="h-10 w-10 rounded-xl bg-white/[0.04] text-white/40 flex items-center justify-center hover:bg-white/[0.08] transition-colors">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewCategory(true)}
                  className="flex items-center gap-2 mt-3 px-3.5 py-2.5 rounded-xl text-sm text-remembra-accent-primary/70 border border-dashed border-remembra-accent-primary/20 hover:border-remembra-accent-primary/40 hover:text-remembra-accent-primary transition-all"
                >
                  <Plus size={14} /> New Category
                </button>
              )}
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-remembra-text-muted mb-3 flex items-center gap-1.5 ">
                <Gauge size={12} /> Difficulty
              </label>
              <div className="flex gap-2">
                {difficulties.map((diff) => {
                  const isSelected = difficulty === diff.value;
                  return (
                    <button
                      key={diff.value}
                      onClick={() => setDifficulty(diff.value)}
                      className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-xl text-sm font-medium transition-all duration-200 border ${
                        isSelected
                          ? diff.bg + ' scale-[1.02]'
                          : 'border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08]'
                      }`}
                    >
                      <span className="text-lg">{diff.emoji}</span>
                      <span className={isSelected ? diff.color : 'text-white/50'}>{diff.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={14} className="text-remembra-accent-primary" />
                <span className="text-xs font-semibold text-white/70">Review Schedule</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-remembra-accent-primary/10 text-remembra-accent-primary font-medium">1-4-7</span>
              </div>
              <div className="flex justify-between">
                {getReviewDates().map((date, index) => {
                  const days = [...REVIEW_INTERVALS_147, OPTIONAL_REVIEW_DAY_30];
                  const isOptional = index === 3;
                  return (
                    <div key={index} className="text-center flex-1">
                      <div className={`text-[11px] font-bold mb-1 ${
                        isOptional ? 'text-cyan-400' : 'text-remembra-accent-primary'
                      }`}>
                        D{days[index]}{isOptional ? '?' : ''}
                      </div>
                      <div className="text-[10px] text-white/30">{date}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Create */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-remembra-accent-primary via-[#FF4500] to-[#E81224]" />
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {selectedCategory && (
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border"
                      style={{
                        backgroundColor: `${selectedCategory.color}10`,
                        color: selectedCategory.color,
                        borderColor: `${selectedCategory.color}25`,
                      }}
                    >
                      {selectedCategory.name}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium border border-white/[0.06] text-white/50 bg-white/[0.02]">
                    {contentTypes.find(c => c.id === contentType)?.label}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : difficulty === 'hard' ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {difficulty}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-white mb-3">{title || 'Untitled'}</h3>

                <div className="max-h-[180px] overflow-y-auto custom-scrollbar pr-1 text-sm">
                  <MarkdownRenderer content={content.slice(0, 600) + (content.length > 600 ? '\n\n...' : '')} />
                </div>
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <h4 className="text-xs font-semibold text-white/60 mb-2">
                  {uploadedFiles.length} Attachment{uploadedFiles.length > 1 ? 's' : ''}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {uploadedFiles.map(file => (
                    <span key={file.id} className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/50">
                      {file.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="bg-remembra-accent-primary/[0.06] rounded-xl p-4 border border-remembra-accent-primary/15">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-remembra-accent-primary" />
                  <span className="text-sm font-medium text-remembra-accent-primary/80">AI Summary will generate after saving</span>
                </div>
              </div>
            )}

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-remembra-accent-primary" />
                <span className="text-xs font-semibold text-white/70">Your Review Schedule</span>
              </div>
              <div className="flex justify-between gap-2">
                {getReviewDates().map((date, index) => {
                  const days = [...REVIEW_INTERVALS_147, OPTIONAL_REVIEW_DAY_30];
                  return (
                    <div key={index} className="flex-1 text-center bg-white/[0.02] rounded-lg py-2.5 border border-white/[0.04]">
                      <div className="text-xs font-bold text-remembra-accent-primary">Day {days[index]}</div>
                      <div className="text-[10px] text-white/30 mt-0.5">{date}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 sm:px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 bg-gradient-to-t from-black via-black/95 to-transparent">
        {step < totalSteps ? (
          <Button
            onClick={handleNext}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-remembra-accent-primary to-[#FF4500] text-white font-semibold text-sm shadow-lg shadow-remembra-accent-primary/20 hover:shadow-remembra-accent-primary/30 transition-shadow"
          >
            Continue <ChevronRight size={16} className="ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-remembra-accent-primary to-[#E81224] text-white font-semibold text-sm shadow-lg shadow-[#E81224]/20 disabled:opacity-50 transition-all"
          >
            {isCreating ? (
              <><span className="mr-2 inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creating...</>
            ) : (
              <><Check size={16} className="mr-2" /> Create Memory Item</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
