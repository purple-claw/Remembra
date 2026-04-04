import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import type { ContentType, Difficulty, RecurringFrequency, ScheduleType } from '@/types';
import {
  ArrowLeft,
  Type,
  Code,
  Image as ImageIcon,
  FileText,
  Layers,
  Check,
  Calendar,
  Upload,
  X,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Link2,
  Code2,
  Heading1,
  Heading2,
  Eye,
  Edit,
  Plus,
  Pencil,
  Trash2,
  Repeat,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { toast } from 'sonner';
import { OPTIONAL_REVIEW_DAY_30, REVIEW_INTERVALS_147, getScheduledDateForStage, getNextRecurringDate, toIsoDate } from '@/domain/review147';
import { storageService } from '@/services/storageService';
import { toFriendlyErrorMessage } from '@/lib/uiError';

const contentTypes: { id: ContentType; icon: React.ElementType; label: string; description: string }[] = [
  { id: 'text', icon: Type, label: 'Notes & Text', description: 'General notes and explanations' },
  { id: 'code', icon: Code, label: 'Code Snippet', description: 'Programming code and walkthroughs' },
  { id: 'image', icon: ImageIcon, label: 'Image & Diagram', description: 'Visual learning references' },
  { id: 'document', icon: FileText, label: 'Document', description: 'PDFs, articles, and docs' },
  { id: 'mixed', icon: Layers, label: 'Mixed Content', description: 'Combine text, media, and files' },
];

const difficulties: { value: Difficulty; label: string; description: string }[] = [
  { value: 'easy', label: 'Easy', description: 'Simple concepts, quick to retain' },
  { value: 'medium', label: 'Medium', description: 'Moderate complexity and practice' },
  { value: 'hard', label: 'Hard', description: 'Complex material requiring deep effort' },
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

const MAX_TITLE_LENGTH = 500;

export function Create() {
  const { categories, addMemoryItem, addCategory, updateCategory, deleteCategory, memoryItems, setScreen, goBack } = useStore();

  const [contentType, setContentType] = useState<ContentType>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isCreating, setIsCreating] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [processingCategoryId, setProcessingCategoryId] = useState<string | null>(null);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('spaced');
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('weekly');
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) || null,
    [categories, categoryId],
  );
  const selectedCategoryName = selectedCategory?.name || 'No category';

  const isCreateReady = !!title.trim() && !!content.trim() && !!categoryId;

  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const handleBack = () => {
    goBack('dashboard');
  };

  const startCategoryEdit = (id: string, name: string) => {
    setEditingCategoryId(id);
    setEditingCategoryName(name);
  };

  const cancelCategoryEdit = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const saveCategoryEdit = async () => {
    if (!editingCategoryId) return;

    const name = editingCategoryName.trim();
    if (!name) {
      toast.error('Category name is required');
      return;
    }

    setProcessingCategoryId(editingCategoryId);
    try {
      await updateCategory(editingCategoryId, { name });
      toast.success('Category updated');
      cancelCategoryEdit();
    } catch (error) {
      toast.error(toFriendlyErrorMessage(error, 'Failed to update category'));
    } finally {
      setProcessingCategoryId(null);
    }
  };

  const removeCategory = async (id: string, name: string) => {
    if (categories.length <= 1) {
      toast.error('At least one category is required');
      return;
    }

    const confirmed = window.confirm(`Delete category "${name}"? Items in this category will be moved to another category.`);
    if (!confirmed) return;

    setProcessingCategoryId(id);
    try {
      await deleteCategory(id);
      if (categoryId === id) {
        const fallback = categories.find((category) => category.id !== id);
        if (fallback) {
          setCategoryId(fallback.id);
        }
      }
      toast.success('Category deleted');
    } catch (error) {
      toast.error(toFriendlyErrorMessage(error, 'Failed to delete category'));
    } finally {
      setProcessingCategoryId(null);
    }
  };

  const createNewCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const colors = ['#FF8000', '#FF4500', '#E81224', '#00D26A', '#6366F1', '#FFB800', '#06B6D4'];
      // Keep icon values aligned with backend-safe defaults.
      const icons = ['folder', 'briefcase', 'user'];

      const newCategory = {
        name: newCategoryName.trim(),
        color: colors[categories.length % colors.length],
        icon: icons[categories.length % icons.length],
        order_index: categories.length,
        is_default: false,
      };

      const created = await addCategory(newCategory);
      setCategoryId(created.id);
      setNewCategoryName('');
      setShowNewCategory(false);
      toast.success('Category created');
    } catch (error) {
      toast.error(toFriendlyErrorMessage(error, 'Failed to create category. Try again.'));
    }
  };

  const handleCreate = async () => {
    if (isCreating) return;

    setFormError(null);

    if (!title.trim() || !content.trim()) {
      const message = 'Title and content are required';
      setFormError(message);
      toast.error(message);
      return;
    }

    if (!categoryId) {
      const message = 'Please select a category';
      setFormError(message);
      toast.error(message);
      return;
    }

    if (title.trim().length > MAX_TITLE_LENGTH) {
      const message = `Title must be ${MAX_TITLE_LENGTH} characters or fewer`;
      setFormError(message);
      toast.error(message);
      return;
    }

    setIsCreating(true);

    const cycleStartedAt = toIsoDate(new Date());
    const initialNextReviewDate = scheduleType === 'recurring'
      ? getNextRecurringDate(cycleStartedAt, recurringFrequency)
      : getScheduledDateForStage(cycleStartedAt, 0);

    const newItem = {
      category_id: categoryId,
      title: title.trim(),
      content,
      content_type: contentType,
      attachments: uploadedFiles.map((file) => ({
        name: file.name,
        url: file.url || '',
        type: file.type.startsWith('image/') ? 'image' as const : contentType,
        size: file.size,
        path: file.path,
        bucket: file.bucket,
        mime_type: file.mime_type || file.type,
      })),
      difficulty,
      status: 'active' as const,
      schedule_type: scheduleType,
      recurring_frequency: recurringFrequency,
      next_review_date: initialNextReviewDate,
      cycle_started_at: cycleStartedAt,
      review_stage: 0,
      review_template: scheduleType === 'recurring' ? `recurring-${recurringFrequency}` : '',
      current_stage_index: 0,
      easiness_factor: 2.5,
      interval: scheduleType === 'recurring'
        ? (recurringFrequency === 'daily' ? 1 : recurringFrequency === 'weekly' ? 7 : 30)
        : REVIEW_INTERVALS_147[0],
      repetition: 0,
      lapse_count: 0,
      review_history: [],
    };

    try {
      await addMemoryItem(newItem);
      toast.success('Item created successfully');
      setScreen('dashboard');
    } catch (error) {
      const message = toFriendlyErrorMessage(error, 'Failed to create item. Please try again.');
      setFormError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const getReviewDates = () => {
    if (scheduleType === 'recurring') {
      const next = getNextRecurringDate(toIsoDate(new Date()), recurringFrequency);
      return [{
        day: recurringFrequency === 'daily' ? 1 : recurringFrequency === 'weekly' ? 7 : 30,
        label: new Date(`${next}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }];
    }

    const dates = [];
    const intervals = [...REVIEW_INTERVALS_147, OPTIONAL_REVIEW_DAY_30];

    for (const interval of intervals) {
      const date = new Date();
      date.setDate(date.getDate() + interval);
      dates.push({
        day: interval,
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
    }

    return dates;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleFiles(Array.from(files));
    }
  };

  const handleFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      if (file.type.startsWith('text/') || /\.(md|js|ts|jsx|tsx|py|json|css|html)$/i.test(file.name)) {
        const reader = new FileReader();
        reader.onload = (readEvent) => {
          const fileContent = readEvent.target?.result as string;
          const ext = file.name.split('.').pop() || '';
          const languageMap: Record<string, string> = {
            js: 'javascript',
            jsx: 'jsx',
            ts: 'typescript',
            tsx: 'tsx',
            py: 'python',
            json: 'json',
            css: 'css',
            html: 'html',
            md: 'markdown',
          };
          const language = languageMap[ext] || 'text';

          if (!content.trim()) {
            if (language !== 'markdown' && language !== 'text') {
              setContent(`\`\`\`${language}\n${fileContent}\n\`\`\``);
              setContentType('code');
            } else {
              setContent(fileContent);
            }
            if (!title) {
              setTitle(file.name.replace(/\.[^/.]+$/, ''));
            }
          } else {
            setContent((previous) => (
              language !== 'markdown' && language !== 'text'
                ? `${previous}\n\n\`\`\`${language}\n${fileContent}\n\`\`\``
                : `${previous}\n\n${fileContent}`
            ));
          }

          setUploadedFiles((previous) => [
            ...previous,
            { id, name: file.name, type: file.type, size: file.size, content: fileContent },
          ]);
        };

        reader.readAsText(file);
      } else if (file.type.startsWith('image/')) {
        try {
          const uploadedResult = await storageService.uploadImage(file);
          if (!uploadedResult.success) {
            throw uploadedResult.error;
          }
          const uploaded = uploadedResult.data;
          setUploadedFiles((previous) => [
            ...previous,
            {
              id,
              name: file.name,
              type: file.type,
              size: file.size,
              url: uploaded.url,
              path: uploaded.path,
              bucket: uploaded.bucket,
              mime_type: uploaded.mime_type,
            },
          ]);
          setContent((previous) => `${previous}\n\n![${file.name}](${uploaded.url})`);
          setContentType('image');
          toast.success(`Uploaded ${file.name}`);
        } catch (error) {
          console.warn('Image upload failed, using local data URL fallback:', error);
          const reader = new FileReader();
          reader.onload = (readEvent) => {
            const dataUrl = readEvent.target?.result as string;
            setUploadedFiles((previous) => [
              ...previous,
              { id, name: file.name, type: file.type, size: file.size, url: dataUrl, mime_type: file.type },
            ]);
            setContent((previous) => `${previous}\n\n![${file.name}](${dataUrl})`);
            setContentType('image');
          };
          reader.readAsDataURL(file);
          toast.warning(`Cloud upload failed for ${file.name}. Stored locally in this item.`);
        }
      } else {
        setUploadedFiles((previous) => [...previous, { id, name: file.name, type: file.type, size: file.size, mime_type: file.type }]);
        toast.info(`File "${file.name}" attached`);
      }
    }
  }, [content, title]);

  const removeFile = async (id: string) => {
    const target = uploadedFiles.find((file) => file.id === id);
    setUploadedFiles((previous) => previous.filter((file) => file.id !== id));

    if (target?.path && target.bucket) {
      try {
        const result = await storageService.removeAttachments([{
          type: 'image',
          url: target.url || '',
          name: target.name,
          size: target.size,
          path: target.path,
          bucket: target.bucket,
          mime_type: target.mime_type,
        }]);
        if (!result.success) {
          throw result.error;
        }
      } catch (error) {
        console.warn('Attachment cleanup failed:', error);
        toast.warning('File removed from draft, but cloud cleanup did not complete.');
      }
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(event.dataTransfer.files));
  };

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const next = content.substring(0, start) + before + selected + after + content.substring(end);

    setContent(next);

    setTimeout(() => {
      textarea.focus();
      const position = start + before.length + selected.length + after.length;
      textarea.setSelectionRange(position, position);
    }, 0);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, index)).toFixed(1))} ${units[index]}`;
  };

  const markdownActions = [
    { action: () => insertMarkdown('**', '**'), icon: Bold, title: 'Bold' },
    { action: () => insertMarkdown('*', '*'), icon: Italic, title: 'Italic' },
    { action: () => insertMarkdown('# '), icon: Heading1, title: 'Heading 1' },
    { action: () => insertMarkdown('## '), icon: Heading2, title: 'Heading 2' },
    { action: () => insertMarkdown('- '), icon: List, title: 'Bullet List' },
    { action: () => insertMarkdown('1. '), icon: ListOrdered, title: 'Numbered List' },
    { action: () => insertMarkdown('> '), icon: Quote, title: 'Quote' },
    { action: () => insertMarkdown('`', '`'), icon: Code2, title: 'Inline Code' },
    { action: () => insertMarkdown('\n```\n', '\n```\n'), icon: Code, title: 'Code Block' },
    { action: () => insertMarkdown('[', '](url)'), icon: Link2, title: 'Link' },
  ];

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50 animate-screen-enter">
      <header className="flex-shrink-0 px-4 sm:px-6 safe-top-compact pb-3 border-b border-white/10 bg-black/85 backdrop-blur-xl transition-smooth relative z-30 animate-slide-up">
        <div className="flex items-start gap-3 min-w-0">
          <button
            onClick={handleBack}
            className="w-9 h-9 rounded-xl border border-white/10 bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary shrink-0 tap-ripple press-glow"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-semibold text-remembra-text-primary truncate">Create Memory Item</h1>
            <p className="text-xs sm:text-sm text-remembra-text-muted truncate">Start creating your Items..</p>
          </div>
        </div>
      </header>

      <main
        data-nav-scroll="true"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] custom-scrollbar safe-bottom-nav fluid-scroll-zone smooth-scroll-content relative z-0"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr),300px]">
          <section className="space-y-3">
            <div className="widget-surface inertia-card smooth-surface stagger-enter glass-card rounded-2xl p-2.5 sm:p-3" style={{ animationDelay: '40ms' }}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[9px] uppercase tracking-[0.18em] text-remembra-text-muted">Content Type</p>
                <span className="text-[9px] text-remembra-text-muted">Pick one</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                {contentTypes.map((type) => {
                  const Icon = type.icon;
                  const active = contentType === type.id;

                  return (
                    <button
                      key={type.id}
                      onClick={() => setContentType(type.id)}
                      className={`rounded-lg border px-2.5 py-2 text-left transition-all ${
                        active
                          ? 'bg-black/40 border-remembra-accent-primary/40'
                          : 'bg-remembra-bg-tertiary/65 border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${active ? 'bg-remembra-accent-primary/20 text-remembra-accent-primary' : 'bg-white/5 text-remembra-text-muted'}`}>
                            <Icon size={12} />
                          </div>
                          <p className="text-[12px] font-medium text-remembra-text-primary truncate">{type.label}</p>
                        </div>
                        {active && <Check size={12} className="text-remembra-accent-primary flex-shrink-0" />}
                      </div>
                      <p className="mt-1 text-[10px] leading-snug text-remembra-text-muted sm:text-[11px]">{type.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="widget-surface inertia-card smooth-surface stagger-enter glass-card rounded-2xl p-2.5 sm:p-3 space-y-2.5 sm:space-y-3" style={{ animationDelay: '80ms' }}>
              <div>
                <label className="block text-[9px] uppercase tracking-[0.18em] text-remembra-text-muted mb-1.5">Title</label>
                <Input
                  type="text"
                  placeholder="Enter a descriptive title..."
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="bg-remembra-bg-tertiary border-white/10 rounded-lg text-remembra-text-primary py-3"
                />
                <div className="mt-1 flex items-center justify-end">
                  <span className={`text-[10px] ${title.trim().length > MAX_TITLE_LENGTH ? 'text-red-400' : 'text-remembra-text-muted'}`}>
                    {title.trim().length}/{MAX_TITLE_LENGTH}
                  </span>
                </div>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-xl border-2 border-dashed p-2.5 transition-colors ${
                  isDragging
                    ? 'border-remembra-accent-primary bg-remembra-accent-primary/10'
                    : 'border-white/15 bg-remembra-bg-tertiary/60 hover:border-remembra-accent-primary/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".txt,.md,.js,.ts,.jsx,.tsx,.py,.json,.css,.html,.jpg,.jpeg,.png,.gif,.webp,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-remembra-accent-primary/15 flex items-center justify-center text-remembra-accent-primary flex-shrink-0">
                    <Upload size={14} />
                  </div>
                  <div>
                    <p className="text-[13px] text-remembra-text-secondary leading-tight">
                      Drag files here or{' '}
                      <button onClick={() => fileInputRef.current?.click()} className="text-remembra-accent-primary font-medium hover:underline">
                        browse
                      </button>
                    </p>
                    <p className="text-[10px] text-remembra-text-muted mt-0.5">Text, code, markdown, images, PDFs</p>
                  </div>
                </div>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-1.5">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="rounded-lg border border-white/10 bg-black/25 p-2 flex items-center gap-2.5">
                      {file.type.startsWith('image/') && file.url ? (
                        <img src={file.url} alt={file.name} className="w-8 h-8 rounded-md object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-remembra-bg-tertiary flex items-center justify-center text-remembra-text-muted">
                          <Code size={13} />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-remembra-text-primary truncate">{file.name}</p>
                        <p className="text-[10px] text-remembra-text-muted">{formatBytes(file.size)}</p>
                      </div>

                      <button
                        onClick={() => removeFile(file.id)}
                        className="w-7 h-7 rounded-md border border-red-500/25 text-red-400 flex items-center justify-center tap-ripple press-glow"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="widget-surface inertia-card smooth-surface stagger-enter glass-card rounded-2xl p-2.5 sm:p-3" style={{ animationDelay: '120ms' }}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-[9px] uppercase tracking-[0.18em] text-remembra-text-muted">Content Editor</p>
                <div className="flex items-center gap-1 border border-white/10 bg-remembra-bg-tertiary rounded-md p-0.5">
                  <button
                    onClick={() => setIsPreviewMode(false)}
                    className={`px-2 py-1 rounded-md text-[11px] flex items-center gap-1 ${
                      !isPreviewMode ? 'gradient-orange text-white' : 'text-remembra-text-muted'
                    }`}
                  >
                    <Edit size={10} />
                    Edit
                  </button>
                  <button
                    onClick={() => setIsPreviewMode(true)}
                    className={`px-2 py-1 rounded-md text-[11px] flex items-center gap-1 ${
                      isPreviewMode ? 'gradient-orange text-white' : 'text-remembra-text-muted'
                    }`}
                  >
                    <Eye size={10} />
                    Preview
                  </button>
                </div>
              </div>

              {!isPreviewMode && (
                <div className="flex items-center gap-1 p-0.5 rounded-t-lg border border-white/10 bg-remembra-bg-tertiary overflow-x-auto scrollbar-hide">
                  {markdownActions.map((action) => (
                    <button
                      key={action.title}
                      onClick={action.action}
                      className="w-7 h-7 rounded-md border border-transparent hover:border-white/10 text-remembra-text-muted hover:text-remembra-accent-primary flex items-center justify-center tap-ripple press-glow"
                      title={action.title}
                    >
                      <action.icon size={12} />
                    </button>
                  ))}
                </div>
              )}

              {isPreviewMode ? (
                <div className="rounded-lg border border-white/10 bg-black/25 p-2.5 min-h-[180px] max-h-[360px] overflow-y-auto custom-scrollbar">
                  {content ? (
                    <MarkdownRenderer content={content} />
                  ) : (
                    <p className="text-[13px] text-remembra-text-muted italic">Nothing to preview yet...</p>
                  )}
                </div>
              ) : (
                <Textarea
                  ref={textareaRef}
                  placeholder={contentType === 'code'
                    ? 'Paste your code here...'
                    : 'Write your notes...'
                  }
                  value={content}
                  onChange={(event) => {
                    setContent(event.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="min-h-[180px] resize-none rounded-t-none rounded-b-lg bg-black/25 border-white/10 text-remembra-text-primary text-sm"
                />
              )}
            </div>
          </section>

          <aside className="space-y-2.5 xl:sticky xl:top-5 h-fit">
            <div className="widget-surface inertia-card smooth-surface stagger-enter glass-card rounded-2xl p-2.5 sm:p-3" style={{ animationDelay: '160ms' }}>
              <p className="text-[9px] uppercase tracking-[0.18em] text-remembra-text-muted mb-1.5">Schedule Mode</p>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                <button
                  onClick={() => setScheduleType('spaced')}
                  className={`rounded-lg border px-2 py-2 text-[12px] font-medium transition-colors ${
                    scheduleType === 'spaced'
                      ? 'bg-remembra-accent-primary/15 border-remembra-accent-primary/35 text-remembra-accent-primary'
                      : 'bg-remembra-bg-tertiary border-white/10 text-remembra-text-muted'
                  }`}
                >
                   Review
                </button>
                <button
                  onClick={() => setScheduleType('recurring')}
                  className={`rounded-lg border px-2 py-2 text-[12px] font-medium transition-colors flex items-center justify-center gap-1 ${
                    scheduleType === 'recurring'
                      ? 'bg-remembra-accent-primary/15 border-remembra-accent-primary/35 text-remembra-accent-primary'
                      : 'bg-remembra-bg-tertiary border-white/10 text-remembra-text-muted'
                  }`}
                >
                  <Repeat size={12} />
                  Recurring
                </button>
              </div>

              {scheduleType === 'recurring' && (
                <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                  {(['daily', 'weekly', 'monthly'] as const).map((frequency) => (
                    <button
                      key={frequency}
                      onClick={() => setRecurringFrequency(frequency)}
                      className={`rounded-md border px-2 py-1.5 text-[11px] font-medium capitalize ${
                        recurringFrequency === frequency
                          ? 'border-remembra-accent-primary/40 bg-remembra-accent-primary/15 text-remembra-accent-primary'
                          : 'border-white/10 bg-remembra-bg-tertiary text-remembra-text-muted'
                      }`}
                    >
                      {frequency}
                    </button>
                  ))}
                </div>
              )}

              <p className="text-[9px] uppercase tracking-[0.18em] text-remembra-text-muted mb-1.5">Category</p>

              <div className="space-y-1.5 mb-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center gap-1.5">
                    {editingCategoryId === category.id ? (
                      <Input
                        value={editingCategoryName}
                        onChange={(event) => setEditingCategoryName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            saveCategoryEdit();
                          }
                          if (event.key === 'Escape') {
                            cancelCategoryEdit();
                          }
                        }}
                        className="h-8 bg-remembra-bg-tertiary border-white/10 text-remembra-text-primary"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => setCategoryId(category.id)}
                        className={`flex-1 text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium border ${
                          categoryId === category.id
                            ? 'text-white border-transparent'
                            : 'text-remembra-text-muted border-white/10 bg-remembra-bg-tertiary'
                        }`}
                        style={categoryId === category.id ? { backgroundColor: category.color } : {}}
                      >
                        {category.name}
                        {memoryItems.some((item) => item.category_id === category.id) && (
                          <span className="ml-2 opacity-80">({memoryItems.filter((item) => item.category_id === category.id).length})</span>
                        )}
                      </button>
                    )}

                    {editingCategoryId === category.id ? (
                      <>
                        <button
                          onClick={saveCategoryEdit}
                          disabled={processingCategoryId === category.id}
                            className="w-8 h-8 rounded-md gradient-primary text-white flex items-center justify-center"
                        >
                            <Check size={12} />
                        </button>
                        <button
                          onClick={cancelCategoryEdit}
                            className="w-8 h-8 rounded-md border border-white/10 bg-remembra-bg-tertiary text-remembra-text-muted flex items-center justify-center"
                        >
                            <X size={12} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startCategoryEdit(category.id, category.name)}
                            className="w-8 h-8 rounded-md border border-white/10 bg-remembra-bg-tertiary text-remembra-text-muted flex items-center justify-center"
                          title="Edit category"
                        >
                            <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => removeCategory(category.id, category.name)}
                          disabled={categories.length <= 1 || processingCategoryId === category.id}
                            className="w-8 h-8 rounded-md border border-red-500/25 bg-red-500/10 text-red-400 disabled:opacity-40 flex items-center justify-center"
                          title="Delete category"
                        >
                            <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {!showNewCategory ? (
                <button
                  onClick={() => setShowNewCategory(true)}
                    className="w-full rounded-lg border border-dashed border-remembra-accent-primary/40 text-remembra-accent-primary py-2 text-[12px] font-medium flex items-center justify-center gap-1"
                >
                    <Plus size={12} />
                  New Category
                </button>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        createNewCategory();
                      }
                      if (event.key === 'Escape') {
                        setShowNewCategory(false);
                        setNewCategoryName('');
                      }
                    }}
                    placeholder="Category name"
                    className="bg-remembra-bg-tertiary border-white/10 text-remembra-text-primary"
                    autoFocus
                  />
                  <button onClick={createNewCategory} className="w-8 h-8 rounded-md gradient-primary text-white flex items-center justify-center">
                    <Check size={12} />
                  </button>
                  <button
                    onClick={() => {
                      setShowNewCategory(false);
                      setNewCategoryName('');
                    }}
                    className="w-8 h-8 rounded-md border border-white/10 bg-remembra-bg-tertiary text-remembra-text-muted flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            <div className="widget-surface inertia-card smooth-surface stagger-enter glass-card rounded-2xl p-2.5 sm:p-3" style={{ animationDelay: '200ms' }}>
              <p className="text-[9px] uppercase tracking-[0.18em] text-remembra-text-muted mb-1.5">Difficulty</p>
              <div className="space-y-1.5">
                {difficulties.map((entry) => {
                  const selected = difficulty === entry.value;
                  const colors: Record<Difficulty, string> = {
                    easy: '#00D26A',
                    medium: '#FF8000',
                    hard: '#E81224',
                  };
                  const color = colors[entry.value];

                  return (
                    <button
                      key={entry.value}
                      onClick={() => setDifficulty(entry.value)}
                      className={`w-full rounded-lg border px-2.5 py-2 text-left ${
                        selected
                          ? 'bg-black/35 border-white/20'
                          : 'bg-remembra-bg-tertiary/65 border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[12px] font-medium text-remembra-text-primary">{entry.label}</p>
                          <p className="text-[10px] text-remembra-text-muted mt-0.5">{entry.description}</p>
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full mt-1" style={{ backgroundColor: color }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="widget-surface inertia-card smooth-surface stagger-enter glass-card rounded-2xl p-2.5 sm:p-3" style={{ animationDelay: '240ms' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <Calendar size={12} className="text-remembra-accent-primary" />
                <p className="text-[9px] uppercase tracking-[0.18em] text-remembra-text-muted">Review Plan</p>
              </div>

              <div className={`grid gap-1.5 ${scheduleType === 'recurring' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {getReviewDates().map((entry) => (
                  <div key={entry.day} className="rounded-md border border-white/10 bg-black/20 p-2">
                    <p className="text-[10px] text-remembra-text-muted">
                      {scheduleType === 'recurring' ? `${recurringFrequency} cadence` : `Day ${entry.day}`}
                    </p>
                    <p className="text-[12px] font-medium text-remembra-text-primary mt-0.5">{entry.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="widget-surface inertia-card smooth-surface stagger-enter glass-card rounded-2xl p-2.5 sm:p-3" style={{ animationDelay: '280ms' }}>
              <p className="text-[9px] uppercase tracking-[0.18em] text-remembra-text-muted mb-1.5">Ready Check</p>
              <div className="space-y-1 text-[11px] text-remembra-text-muted">
                <p>{title.trim() ? '✓' : '•'} Title added</p>
                <p>{content.trim() ? '✓' : '•'} Content added</p>
                <p>{selectedCategory ? '✓' : '•'} Category selected</p>
                <p>{uploadedFiles.length > 0 ? `✓ ${uploadedFiles.length} attachment(s)` : '• Optional attachments'}</p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="flex-shrink-0 px-4 sm:px-6 safe-footer pt-2 pb-2.5 border-t border-white/10 bg-black/90 backdrop-blur-xl transition-smooth relative z-20 animate-slide-up" style={{ animationDelay: '320ms' }}>
        <div className="flex items-center justify-between gap-3 mb-1.5 text-[10px] text-remembra-text-muted">
          <span className="truncate">{selectedCategoryName} • {difficulty}</span>
          <span>{content.length.toLocaleString()} chars</span>
        </div>

        {formError && (
          <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[12px] text-red-300">
            {formError}
          </div>
        )}

        <Button
          onClick={handleCreate}
          disabled={isCreating || !isCreateReady}
          className="w-full gradient-primary h-11 rounded-xl text-white font-semibold text-[13px] disabled:opacity-60 tap-ripple press-glow"
        >
          {isCreating ? (
            <>
              <span className="mr-2 inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Check size={14} className="mr-2" />
              Create Item
            </>
          )}
        </Button>
      </footer>
    </div>
  );
}
