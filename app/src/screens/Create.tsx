import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { ContentType, Difficulty } from '@/types';
import { 
  ArrowLeft, 
  Type, 
  Code, 
  Image as ImageIcon, 
  FileText, 
  Layers,
  ChevronRight,
  Check,
  Sparkles,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

export function Create() {
  const { categories, addMemoryItem, setScreen } = useStore();
  const [step, setStep] = useState(1);
  const [contentType, setContentType] = useState<ContentType>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleNext = () => {
    if (step === 2 && (!title.trim() || !content.trim())) {
      toast.error('Please fill in both title and content');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 1) {
      setScreen('dashboard');
    } else {
      setStep(step - 1);
    }
  };

  const handleCreate = () => {
    const newItem = {
      user_id: '1',
      category_id: categoryId,
      title,
      content,
      content_type: contentType,
      attachments: [],
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
    setTimeout(() => {
      toast.success('AI summary generated!');
    }, 1500);
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

  return (
    <div className="min-h-screen bg-remembra-bg-primary flex flex-col">
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={handleBack}
            className="w-10 h-10 rounded-xl bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary hover:text-remembra-text-primary transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div 
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  s <= step ? 'bg-remembra-accent-primary' : 'bg-remembra-bg-tertiary'
                }`}
              />
            ))}
          </div>
          
          <div className="w-10" />
        </div>
        
        <h1 className="text-2xl font-bold text-remembra-text-primary">
          {step === 1 && 'What are you learning?'}
          {step === 2 && 'Add your content'}
          {step === 3 && 'Categorize'}
          {step === 4 && 'Preview'}
        </h1>
        <p className="text-remembra-text-muted mt-1">
          {step === 1 && 'Choose the type of content'}
          {step === 2 && 'Enter the title and details'}
          {step === 3 && 'Organize and set difficulty'}
          {step === 4 && 'Review before saving'}
        </p>
      </header>

      <main className="flex-1 px-5 py-4 overflow-y-auto">
        {step === 1 && (
          <div className="space-y-3 animate-slide-up">
            {contentTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = contentType === type.id;
              
              return (
                <button
                  key={type.id}
                  onClick={() => setContentType(type.id)}
                  className={`
                    w-full p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4
                    ${isSelected 
                      ? 'bg-remembra-accent-primary/10 border-remembra-accent-primary/50' 
                      : 'bg-remembra-bg-secondary border-white/5 hover:border-white/10'
                    }
                  `}
                >
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center
                    ${isSelected ? 'bg-remembra-accent-primary text-white' : 'bg-remembra-bg-tertiary text-remembra-text-muted'}
                  `}>
                    <Icon size={24} />
                  </div>
                  
                  <div className="text-left flex-1">
                    <h3 className={`font-semibold ${isSelected ? 'text-remembra-accent-primary' : 'text-remembra-text-primary'}`}>
                      {type.label}
                    </h3>
                    <p className="text-sm text-remembra-text-muted">{type.description}</p>
                  </div>
                  
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-remembra-accent-primary flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-slide-up">
            <div>
              <label className="block text-sm font-medium text-remembra-text-secondary mb-2">
                Title
              </label>
              <Input
                type="text"
                placeholder="Enter a title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-remembra-bg-secondary border-white/5 rounded-xl text-remembra-text-primary placeholder:text-remembra-text-muted focus:border-remembra-accent-primary/50 py-6"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-remembra-text-secondary mb-2">
                Content
              </label>
              <Textarea
                placeholder={contentType === 'code' ? 'Paste your code here...' : 'Enter your notes...'}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-remembra-bg-secondary border-white/5 rounded-xl text-remembra-text-primary placeholder:text-remembra-text-muted focus:border-remembra-accent-primary/50 min-h-[200px] resize-none"
              />
            </div>
            
            <button
              onClick={generateAISummary}
              disabled={isGenerating || !content.trim()}
              className="flex items-center gap-2 text-sm text-remembra-accent-primary hover:text-remembra-accent-secondary transition-colors disabled:opacity-50"
            >
              <Sparkles size={16} />
              {isGenerating ? 'Generating...' : 'Generate AI summary'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-slide-up">
            <div>
              <label className="block text-sm font-medium text-remembra-text-secondary mb-3">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium transition-all
                      ${categoryId === cat.id 
                        ? 'text-white' 
                        : 'bg-remembra-bg-secondary text-remembra-text-muted hover:text-remembra-text-primary'
                      }
                    `}
                    style={categoryId === cat.id ? { backgroundColor: cat.color } : {}}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-remembra-text-secondary mb-3">
                Difficulty Level
              </label>
              <div className="space-y-2">
                {difficulties.map((diff) => (
                  <button
                    key={diff.value}
                    onClick={() => setDifficulty(diff.value)}
                    className={`
                      w-full p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between
                      ${difficulty === diff.value 
                        ? 'bg-remembra-accent-primary/10 border-remembra-accent-primary/50' 
                        : 'bg-remembra-bg-secondary border-white/5 hover:border-white/10'
                      }
                    `}
                  >
                    <div className="text-left">
                      <h4 className={`font-medium ${difficulty === diff.value ? 'text-remembra-accent-primary' : 'text-remembra-text-primary'}`}>
                        {diff.label}
                      </h4>
                      <p className="text-sm text-remembra-text-muted">{diff.description}</p>
                    </div>
                    
                    {difficulty === diff.value && (
                      <div className="w-6 h-6 rounded-full bg-remembra-accent-primary flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-slide-up">
            <div className="bg-remembra-bg-secondary rounded-2xl p-5 border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <span 
                  className="px-2 py-1 rounded-lg text-xs font-medium"
                  style={{ 
                    backgroundColor: `${categories.find(c => c.id === categoryId)?.color}20`,
                    color: categories.find(c => c.id === categoryId)?.color 
                  }}
                >
                  {categories.find(c => c.id === categoryId)?.name}
                </span>
                <span className="px-2 py-1 rounded-lg text-xs font-medium bg-remembra-bg-tertiary text-remembra-text-muted capitalize">
                  {difficulty}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-remembra-text-primary mb-2">{title}</h3>
              
              <p className="text-sm text-remembra-text-secondary line-clamp-4">
                {content.slice(0, 200)}...
              </p>
            </div>
            
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
            
            <div className="bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={16} className="text-remembra-accent-primary" />
                <span className="text-sm font-medium text-remembra-text-primary">1-4-7 Review Schedule</span>
              </div>
              
              <div className="flex justify-between">
                {getReviewDates().map((date, index) => (
                  <div key={index} className="text-center">
                    <div className="w-10 h-10 rounded-full bg-remembra-accent-primary/20 flex items-center justify-center mb-1">
                      <span className="text-xs font-medium text-remembra-accent-primary">
                        {['1', '4', '7'][index]}
                      </span>
                    </div>
                    <span className="text-xs text-remembra-text-muted">{date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="px-5 pb-8 pt-4">
        {step < 4 ? (
          <Button
            onClick={handleNext}
            className="w-full gradient-primary py-6 rounded-2xl text-white font-semibold"
          >
            Continue
            <ChevronRight size={18} className="ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleCreate}
            className="w-full gradient-primary py-6 rounded-2xl text-white font-semibold"
          >
            <Check size={18} className="mr-2" />
            Create Item
          </Button>
        )}
      </footer>
    </div>
  );
}
