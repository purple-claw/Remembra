import { useState, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import type { ContentType, Difficulty } from '@/types';
import {
  ArrowLeft, Type, Code, Image as ImageIcon, FileText, Layers,
  ChevronRight, Check, Sparkles, Calendar, Upload, X,
  Bold, Italic, List, ListOrdered, Quote, Link2, Code2,
  Heading1, Heading2, Eye, Edit
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { toast } from 'sonner';

const contentTypes: { id: ContentType; icon: React.ElementType; label: string; description: string }[] = [
  { id: 'text', icon: Type, label: 'Notes & Text', description: 'General notes, concepts, and explanations' },
  { id: 'code', icon: Code, label: 'Code Snippet', description: 'Programming code with syntax highlighting' },
  { id: 'image', icon: ImageIcon, label: 'Image & Diagram', description: 'Visual learning materials' },
  { id: 'document', icon: FileText, label: 'Document', description: 'PDFs, articles, and documents' },
  { id: 'mixed', icon: Layers, label: 'Mixed Content', description: 'Combine multiple content types' },
];

const difficulties: { value: Difficulty; label: string; description: string }[] = [
  { value: 'easy', label: 'Easy', description: 'Simple concepts, quick to learn' },
  { value: 'medium', label: 'Medium', description: 'Moderate complexity, needs practice' },
  { value: 'hard', label: 'Hard', description: 'Complex material, requires deep study' },
];

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  content?: string;
}

export function Create() {
  const { categories, addMemoryItem, setScreen } = useStore();
  const [step, setStep] = useState(1);
  const [contentType, setContentType] = useState<ContentType>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleNext = () => {
    if (step === 2 && (!title.trim() || !content.trim())) {
      toast.error('Please fill in both title and content');
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

  const handleCreate = () => {
    const newItem = {
      user_id: '1',
      category_id: categoryId,
      title,
      content,
      content_type: contentType,
      attachments: uploadedFiles.map(f => ({
        name: f.name,
        url: f.url || '',
        type: contentType,
      })),
      difficulty,
      status: 'learning' as const,
      next_review_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      review_stage: 0,
      review_history: [],
      ai_summary: isGenerating ? '• AI summary will be generated\n• Key points extracted automatically\n• Review schedule created' : undefined,
    };
    addMemoryItem(newItem);
    toast.success('Item created successfully!');
    setScreen('dashboard');
  };

  const generateAISummary = () => {
    setIsGenerating(true);
    setTimeout(() => { toast.success('AI summary generated!'); }, 1500);
  };

  const getReviewDates = () => {
    const dates = [];
    const intervals = [1, 4, 7];
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

      if (file.type.startsWith('text/') ||
          /\.(md|js|ts|jsx|tsx|py|json|css|html)$/.test(file.name)) {
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
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setUploadedFiles(prev => [...prev, { id, name: file.name, type: file.type, size: file.size, url: dataUrl }]);
          setContent(prev => prev + `\n\n![${file.name}](${dataUrl})`);
          setContentType('image');
        };
        reader.readAsDataURL(file);
      } else {
        setUploadedFiles(prev => [...prev, { id, name: file.name, type: file.type, size: file.size }]);
        toast.info(`File "${file.name}" attached`);
      }
    }
  }, [content, title]);

  const removeFile = (id: string) => setUploadedFiles(prev => prev.filter(f => f.id !== id));

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

  return (
    <div className="fixed inset-0 bg-black lined-bg-subtle flex flex-col z-50">
      {/* HEADER - fixed at top */}
      <header className="flex-shrink-0 px-5 pt-6 pb-3">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-xl glass-button flex items-center justify-center text-remembra-text-secondary hover:text-remembra-text-primary transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Step indicator with orange-red gradient line */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    s < step
                      ? 'gradient-primary text-white'
                      : s === step
                        ? 'border-2 border-remembra-accent-primary text-remembra-accent-primary'
                        : 'border border-white/10 text-remembra-text-muted'
                  }`}
                >
                  {s < step ? <Check size={12} /> : s}
                </div>
                {s < 4 && (
                  <div className={`w-6 h-0.5 rounded-full transition-all duration-300 ${
                    s < step ? 'gradient-primary' : 'bg-white/10'
                  }`} />
                )}
              </div>
            ))}
          </div>

          <div className="w-10" />
        </div>

        <h1 className="text-xl font-bold text-remembra-text-primary">
          {step === 1 && 'What are you learning?'}
          {step === 2 && 'Add your content'}
          {step === 3 && 'Categorize'}
          {step === 4 && 'Preview & Create'}
        </h1>
        <p className="text-sm text-remembra-text-muted mt-0.5">
          {step === 1 && 'Choose the type of content'}
          {step === 2 && 'Enter or upload your learning material'}
          {step === 3 && 'Organize and set difficulty'}
          {step === 4 && 'Review before saving'}
        </p>
        {/* Orange-red accent line */}
        <div className="line-accent mt-3" />
      </header>

      {/* SCROLLABLE CONTENT */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 scrollbar-hide">
        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-3 animate-slide-up pb-24">
            {contentTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = contentType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setContentType(type.id)}
                  className={`w-full p-4 rounded-2xl transition-all duration-200 flex items-center gap-4
                    ${isSelected ? 'glass-card border-remembra-accent-primary/50' : 'glass-button border-transparent hover:border-white/10'}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all
                    ${isSelected ? 'gradient-primary text-white' : 'bg-remembra-bg-tertiary text-remembra-text-muted'}`}>
                    <Icon size={24} />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className={`font-semibold ${isSelected ? 'text-remembra-accent-primary' : 'text-remembra-text-primary'}`}>{type.label}</h3>
                    <p className="text-sm text-remembra-text-muted">{type.description}</p>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-4 animate-slide-up pb-24">
            <div>
              <label className="block text-sm font-medium text-remembra-text-secondary mb-2">Title</label>
              <Input
                type="text"
                placeholder="Enter a descriptive title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="glass-card border-white/10 rounded-xl text-remembra-text-primary placeholder:text-remembra-text-muted focus:border-remembra-accent-primary/50 py-6"
              />
            </div>

            {/* File upload zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 ${
                isDragging
                  ? 'border-remembra-accent-primary bg-remembra-accent-primary/10'
                  : 'border-white/10 hover:border-remembra-accent-primary/30 bg-remembra-bg-secondary/30'
              }`}
            >
              <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.js,.ts,.jsx,.tsx,.py,.json,.css,.html,.jpg,.jpeg,.png,.gif,.webp,.pdf" onChange={handleFileSelect} className="hidden" />
              <Upload size={28} className={`mx-auto mb-2 ${isDragging ? 'text-remembra-accent-primary' : 'text-remembra-text-muted'}`} />
              <p className="text-sm text-remembra-text-secondary mb-1">
                Drag & drop files here, or{' '}
                <button onClick={() => fileInputRef.current?.click()} className="text-remembra-accent-primary hover:underline font-medium">browse</button>
              </p>
              <p className="text-xs text-remembra-text-muted">Text, Code, Markdown, Images, PDFs</p>
            </div>

            {/* Uploaded files list */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                {uploadedFiles.map(file => (
                  <div key={file.id} className="flex items-center gap-3 glass-button p-3 rounded-xl">
                    {file.type.startsWith('image/') && file.url ? (
                      <img src={file.url} alt={file.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-remembra-accent-primary/10 flex items-center justify-center">
                        <Code size={16} className="text-remembra-accent-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{file.name}</p>
                      <p className="text-xs text-remembra-text-muted">{formatBytes(file.size)}</p>
                    </div>
                    <button onClick={() => removeFile(file.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Content editor with markdown toolbar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-remembra-text-secondary">Content</label>
                <div className="flex items-center gap-1 glass-button rounded-lg p-0.5">
                  <button
                    onClick={() => setIsPreviewMode(false)}
                    className={`px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition-all ${
                      !isPreviewMode ? 'gradient-orange text-white' : 'text-remembra-text-muted hover:text-white'
                    }`}
                  >
                    <Edit size={12} /> Edit
                  </button>
                  <button
                    onClick={() => setIsPreviewMode(true)}
                    className={`px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition-all ${
                      isPreviewMode ? 'gradient-orange text-white' : 'text-remembra-text-muted hover:text-white'
                    }`}
                  >
                    <Eye size={12} /> Preview
                  </button>
                </div>
              </div>

              {/* Markdown toolbar */}
              {!isPreviewMode && (
                <div className="flex items-center gap-0.5 p-1.5 glass-card rounded-t-xl border-b-0 overflow-x-auto scrollbar-hide">
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
                      <div key={`sep-${i}`} className="w-px h-5 bg-white/10 mx-0.5 flex-shrink-0" />
                    ) : (
                      <button
                        key={item.title}
                        onClick={item.action}
                        className="p-2 rounded-lg hover:bg-white/10 text-remembra-text-muted hover:text-remembra-accent-primary transition-colors flex-shrink-0"
                        title={item.title}
                      >
                        <item.icon size={15} />
                      </button>
                    )
                  )}
                </div>
              )}

              {isPreviewMode ? (
                <div className="glass-card rounded-xl p-4 min-h-[200px] max-h-[350px] overflow-y-auto custom-scrollbar">
                  {content ? <MarkdownRenderer content={content} /> : <p className="text-remembra-text-muted text-sm italic">Nothing to preview yet...</p>}
                </div>
              ) : (
                <Textarea
                  ref={textareaRef}
                  placeholder={contentType === 'code'
                    ? "Paste your code here... Use ```language for code blocks"
                    : "Write your notes...\n\n# Heading\n**Bold** and *italic*\n- Bullet points\n```code blocks```"
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={`glass-card border-white/10 ${!isPreviewMode ? 'rounded-t-none' : ''} rounded-b-xl text-remembra-text-primary placeholder:text-remembra-text-muted/50 focus:border-remembra-accent-primary/50 min-h-[200px] resize-none font-mono text-sm`}
                />
              )}
            </div>

            <button
              onClick={generateAISummary}
              disabled={isGenerating || !content.trim()}
              className="flex items-center gap-2 text-sm text-remembra-accent-primary hover:text-[#E81224] transition-colors disabled:opacity-50"
            >
              <Sparkles size={16} />
              {isGenerating ? 'Generating...' : 'Generate AI summary'}
            </button>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-6 animate-slide-up pb-24">
            <div>
              <label className="block text-sm font-medium text-remembra-text-secondary mb-3">Category</label>
              <div className="flex flex-wrap gap-2">
                {categories.length > 0 ? categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      categoryId === cat.id ? 'text-white shadow-lg' : 'glass-button text-remembra-text-muted hover:text-white'
                    }`}
                    style={categoryId === cat.id ? { backgroundColor: cat.color, boxShadow: `0 4px 14px ${cat.color}40` } : {}}
                  >
                    {cat.name}
                  </button>
                )) : (
                  <p className="text-sm text-remembra-text-muted">No categories yet. Item will be uncategorized.</p>
                )}
              </div>
            </div>

            <div className="line-accent" />

            <div>
              <label className="block text-sm font-medium text-remembra-text-secondary mb-3">Difficulty Level</label>
              <div className="space-y-2">
                {difficulties.map((diff) => {
                  const isSelected = difficulty === diff.value;
                  const colorMap: Record<string, string> = {
                    easy: '#00D26A',
                    medium: '#FF8000',
                    hard: '#E81224',
                  };
                  return (
                    <button
                      key={diff.value}
                      onClick={() => setDifficulty(diff.value)}
                      className={`w-full p-4 rounded-2xl transition-all duration-200 flex items-center justify-between ${
                        isSelected ? 'glass-card' : 'glass-button border-transparent hover:border-white/10'
                      }`}
                      style={isSelected ? { borderColor: `${colorMap[diff.value]}30` } : {}}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: colorMap[diff.value], boxShadow: `0 0 8px ${colorMap[diff.value]}60` }}
                        />
                        <div className="text-left">
                          <h4 className="font-medium text-remembra-text-primary">{diff.label}</h4>
                          <p className="text-sm text-remembra-text-muted">{diff.description}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: colorMap[diff.value] }}>
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="space-y-4 animate-slide-up pb-24">
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                {categories.find(c => c.id === categoryId) && (
                  <span
                    className="px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: `${categories.find(c => c.id === categoryId)?.color}20`, color: categories.find(c => c.id === categoryId)?.color }}
                  >
                    {categories.find(c => c.id === categoryId)?.name}
                  </span>
                )}
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${
                  difficulty === 'easy' ? 'bg-green-500/20 text-green-400'
                    : difficulty === 'hard' ? 'bg-red-500/20 text-red-400'
                      : 'bg-orange-500/20 text-orange-400'
                }`}>
                  {difficulty}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-remembra-text-primary mb-3">{title || 'Untitled'}</h3>
              <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                <MarkdownRenderer content={content.slice(0, 500) + (content.length > 500 ? '\n\n...' : '')} />
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="glass-card-red rounded-2xl p-4">
                <h4 className="text-sm font-medium text-white mb-2">{uploadedFiles.length} Attachment{uploadedFiles.length > 1 ? 's' : ''}</h4>
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map(file => (
                    <span key={file.id} className="px-2.5 py-1 rounded-lg bg-remembra-bg-tertiary text-xs text-remembra-text-secondary border border-white/5">
                      {file.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="bg-remembra-accent-primary/10 rounded-2xl p-4 border border-remembra-accent-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-remembra-accent-primary" />
                  <span className="text-sm font-medium text-remembra-accent-primary">AI Summary</span>
                </div>
                <ul className="text-sm text-remembra-text-secondary space-y-1">
                  <li>• Key concepts extracted from content</li>
                  <li>• Important points highlighted</li>
                  <li>• Review questions generated</li>
                </ul>
              </div>
            )}

            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={16} className="text-[#E81224]" />
                <span className="text-sm font-medium text-remembra-text-primary">1-4-7 Review Schedule</span>
              </div>
              <div className="flex justify-around">
                {getReviewDates().map((date, index) => (
                  <div key={index} className="text-center">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-1.5 ${
                      index === 0 ? 'bg-remembra-accent-primary/20' : index === 1 ? 'bg-[#FF4500]/20' : 'bg-[#E81224]/20'
                    }`}>
                      <span className={`text-xs font-bold ${
                        index === 0 ? 'text-remembra-accent-primary' : index === 1 ? 'text-[#FF4500]' : 'text-[#E81224]'
                      }`}>
                        Day {['1', '4', '7'][index]}
                      </span>
                    </div>
                    <span className="text-xs text-remembra-text-muted">{date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER - fixed at bottom */}
      <div className="flex-shrink-0 px-5 pb-6 pt-3 bg-gradient-to-t from-black via-black/95 to-transparent">
        <div className="line-accent mb-3" />
        {step < 4 ? (
          <Button
            onClick={handleNext}
            className="w-full gradient-primary py-6 rounded-2xl text-white font-semibold text-base shadow-lg shadow-[#FF8000]/20"
          >
            Continue <ChevronRight size={18} className="ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleCreate}
            className="w-full gradient-primary py-6 rounded-2xl text-white font-semibold text-base shadow-lg shadow-[#E81224]/20"
          >
            <Check size={18} className="mr-2" /> Create Item
          </Button>
        )}
      </div>
    </div>
  );
}
