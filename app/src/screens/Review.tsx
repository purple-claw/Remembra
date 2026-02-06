import { useState } from 'react';
import { useStore } from '@/store/useStore';
import type { Performance } from '@/types';
import { RATING_BUTTONS } from '@/types';
import { ArrowLeft, MoreHorizontal, Eye, Sparkles, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function Review() {
  const { 
    reviewQueue, 
    currentReviewIndex, 
    completeReview, 
    setScreen,
    getCategoryById 
  } = useStore();
  
  const [showAnswer, setShowAnswer] = useState(false);

  const currentItem = reviewQueue[currentReviewIndex];
  const progress = ((currentReviewIndex) / reviewQueue.length) * 100;
  const category = currentItem ? getCategoryById(currentItem.category_id) : null;

  const handleRate = (performance: Performance) => {
    completeReview(performance);
    setShowAnswer(false);
    
    const messages: Record<Performance, string> = {
      again: 'Reviewing again in 1 minute',
      hard: 'Scheduled for 10 minutes',
      medium: 'Scheduled for tomorrow',
      easy: 'Scheduled for 4 days',
    };
    
    toast.success(messages[performance]);
  };

  const handleExit = () => {
    setScreen('dashboard');
  };

  if (!currentItem) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-5">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-remembra-success/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={32} className="text-remembra-success" />
          </div>
          <h2 className="text-2xl font-bold text-remembra-text-primary mb-2">All Done!</h2>
          <p className="text-remembra-text-muted mb-6">You&apos;ve completed all your reviews for today.</p>
          <Button onClick={() => setScreen('dashboard')} className="gradient-primary">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black lined-bg-subtle flex flex-col">
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={handleExit}
            className="w-10 h-10 rounded-xl bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary hover:text-remembra-text-primary transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-remembra-text-muted">
              {currentReviewIndex + 1} / {reviewQueue.length}
            </span>
            <button className="w-10 h-10 rounded-xl bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary">
              <MoreHorizontal size={20} />
            </button>
          </div>
        </div>
        
        <div className="h-1.5 bg-remembra-bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-remembra-accent-primary to-remembra-accent-secondary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="flex-1 px-5 py-4 flex flex-col">
        <div className="flex-1 bg-remembra-bg-secondary rounded-3xl border border-white/5 p-6 flex flex-col relative overflow-hidden">
          {category && (
            <div className="flex items-center gap-2 mb-4">
              <div 
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${category.color}20` }}
              >
                <span className="text-xs" style={{ color: category.color }}>
                  {category.icon.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-remembra-text-muted">{category.name}</span>
              
              <div className="ml-auto flex items-center gap-1 text-xs text-remembra-text-muted">
                <Clock size={12} />
                <span>Stage {currentItem.review_stage + 1}</span>
              </div>
            </div>
          )}
          
          <h2 className="text-xl font-bold text-remembra-text-primary mb-4">
            {currentItem.title}
          </h2>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {currentItem.content_type === 'code' ? (
              <pre className="bg-remembra-bg-tertiary rounded-xl p-4 text-sm font-mono text-remembra-text-secondary overflow-x-auto">
                <code>{currentItem.content}</code>
              </pre>
            ) : (
              <div className="prose prose-invert max-w-none">
                <p className="text-remembra-text-secondary whitespace-pre-wrap leading-relaxed">
                  {currentItem.content}
                </p>
              </div>
            )}
          </div>
          
          {showAnswer && currentItem.ai_summary && (
            <div className="mt-4 p-4 bg-remembra-accent-primary/10 rounded-xl border border-remembra-accent-primary/20 animate-slide-up">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-remembra-accent-primary" />
                <span className="text-sm font-medium text-remembra-accent-primary">AI Summary</span>
              </div>
              <p className="text-sm text-remembra-text-secondary whitespace-pre-line">
                {currentItem.ai_summary}
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-6">
          {!showAnswer ? (
            <Button
              onClick={() => setShowAnswer(true)}
              className="w-full gradient-primary py-6 rounded-2xl text-white font-semibold text-lg hover:opacity-90 transition-opacity"
            >
              <Eye size={20} className="mr-2" />
              Show Answer
            </Button>
          ) : (
            <div className="animate-slide-up">
              <p className="text-center text-sm text-remembra-text-muted mb-4">
                How well did you remember?
              </p>
              
              <div className="grid grid-cols-4 gap-2">
                {RATING_BUTTONS.map((button) => (
                  <button
                    key={button.performance}
                    onClick={() => handleRate(button.performance)}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{ backgroundColor: `${button.color}20` }}
                  >
                    <span 
                      className="text-lg font-bold"
                      style={{ color: button.color }}
                    >
                      {button.label}
                    </span>
                    <span 
                      className="text-xs"
                      style={{ color: button.color, opacity: 0.8 }}
                    >
                      {button.interval}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
