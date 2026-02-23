import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import type { Performance } from '@/types';
import { estimateRetention } from '@/types';
import {
  ArrowLeft, Eye, Sparkles, Clock,
  BookmarkPlus, Bookmark, Copy, Check, StickyNote,
  SkipForward, AlertTriangle, Brain,
  Timer, TrendingUp, Target,
  Trophy, Flame, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { toast } from 'sonner';
import { getStageDayLabel } from '@/domain/review147';

interface SessionStats {
  startedAt: number;
  cardsReviewed: number;
  correctStreak: number;
  maxStreak: number;
  performances: Performance[];
}

export function Review() {
  const {
    reviewQueue,
    currentReviewIndex,
    completeReview,
    setScreen,
    getCategoryById,
    updateMemoryItem,
    nextReviewItem,
  } = useStore();

  const [phase, setPhase] = useState<'thinking' | 'revealed'>('thinking');
  const [cardStartTime, setCardStartTime] = useState(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [session, setSession] = useState<SessionStats>({
    startedAt: Date.now(),
    cardsReviewed: 0,
    correctStreak: 0,
    maxStreak: 0,
    performances: [],
  });

  const currentItem = reviewQueue[currentReviewIndex];
  const progress = reviewQueue.length > 0 ? ((currentReviewIndex) / reviewQueue.length) * 100 : 0;
  const category = currentItem ? getCategoryById(currentItem.category_id) : null;

  const retention = useMemo(
    () => (currentItem ? estimateRetention(currentItem) : 100),
    [currentItem],
  );

  // Live timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - cardStartTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [cardStartTime]);

  // Reset on card change
  useEffect(() => {
    setPhase('thinking');
    setCardStartTime(Date.now());
    setElapsedSeconds(0);
    setShowNotes(false);
    setCopied(false);
    if (currentItem) setNoteText(currentItem.notes || '');
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentReviewIndex, currentItem]);

  const handleReveal = () => setPhase('revealed');

  const handleRate = useCallback(async (performance: Performance) => {
    if (!currentItem) return;
    const timeSpent = Math.round((Date.now() - cardStartTime) / 1000);

    const isCorrect = performance !== 'again';
    const newStreak = isCorrect ? session.correctStreak + 1 : 0;
    setSession(prev => ({
      ...prev,
      cardsReviewed: prev.cardsReviewed + 1,
      correctStreak: newStreak,
      maxStreak: Math.max(prev.maxStreak, newStreak),
      performances: [...prev.performances, performance],
    }));

    await completeReview(performance, timeSpent);

    const messages: Record<Performance, string> = {
      again: 'Revised again. Scheduled from Day 1.',
      hard: 'Revised again. Scheduled from Day 1.',
      good: 'Marked done. Moved to next stage.',
      easy: 'Marked done. Moved to next stage.',
    };
    toast.success(messages[performance]);
  }, [completeReview, currentItem, cardStartTime, session.correctStreak]);

  const handleSkip = () => {
    toast('Skipped — will review later', { icon: '⏭️' });
    nextReviewItem();
  };

  const handleCopy = () => {
    if (!currentItem) return;
    navigator.clipboard.writeText(currentItem.content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveNote = async () => {
    if (!currentItem) return;
    await updateMemoryItem(currentItem.id, { notes: noteText });
    toast.success('Note saved');
    setShowNotes(false);
  };

  const handleBookmark = async () => {
    if (!currentItem) return;
    const newVal = !currentItem.is_bookmarked;
    await updateMemoryItem(currentItem.id, { is_bookmarked: newVal } as any);
    toast.success(newVal ? 'Bookmarked!' : 'Bookmark removed');
  };

  const handleExit = () => setScreen('dashboard');

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
  };

  const sessionAccuracy = session.cardsReviewed > 0
    ? Math.round((session.performances.filter(p => p === 'good' || p === 'easy').length / session.cardsReviewed) * 100)
    : 100;
  const sessionMinutes = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
  const stageLabel = currentItem ? getStageDayLabel(currentItem.review_stage, currentItem.status) : '';

  // ─── Session Complete ───
  if (!currentItem) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
        <div className="text-center max-w-sm w-full">
          <div className="relative mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-remembra-accent-primary/30 to-remembra-success/30 flex items-center justify-center mx-auto animate-pulse-slow">
              <Trophy size={40} className="text-remembra-accent-primary" />
            </div>
            <div className="absolute -top-2 -right-4 animate-bounce">
              <Star size={20} className="text-yellow-400 fill-yellow-400" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-remembra-text-primary mb-2">Session Complete!</h2>
          <p className="text-remembra-text-muted mb-8">Great job — here's your summary.</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Target size={16} className="text-remembra-accent-primary" />
                <span className="text-2xl font-bold text-remembra-text-primary">{session.cardsReviewed}</span>
              </div>
              <p className="text-xs text-remembra-text-muted">Cards Reviewed</p>
            </div>
            <div className="bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp size={16} className="text-remembra-success" />
                <span className="text-2xl font-bold text-remembra-text-primary">{sessionAccuracy}%</span>
              </div>
              <p className="text-xs text-remembra-text-muted">Accuracy</p>
            </div>
            <div className="bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Flame size={16} className="text-orange-400" />
                <span className="text-2xl font-bold text-remembra-text-primary">{session.maxStreak}</span>
              </div>
              <p className="text-xs text-remembra-text-muted">Best Streak</p>
            </div>
            <div className="bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock size={16} className="text-remembra-accent-secondary" />
                <span className="text-2xl font-bold text-remembra-text-primary">{sessionMinutes}m</span>
              </div>
              <p className="text-xs text-remembra-text-muted">Time Spent</p>
            </div>
          </div>

          {session.performances.length > 0 && (
            <div className="bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5 mb-8">
              <p className="text-xs text-remembra-text-muted mb-3">Performance Breakdown</p>
              <div className="flex items-center gap-1 justify-center flex-wrap">
                {session.performances.map((p, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold"
                    style={{
                      backgroundColor: p === 'again' ? '#EF444420' : p === 'hard' ? '#F59E0B20' : p === 'good' ? '#6366F120' : '#10B98120',
                      color: p === 'again' ? '#EF4444' : p === 'hard' ? '#F59E0B' : p === 'good' ? '#6366F1' : '#10B981',
                    }}
                  >
                    {p === 'again' ? '✗' : p === 'hard' ? '~' : p === 'good' ? '✓' : '★'}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={() => setScreen('dashboard')} className="w-full gradient-primary py-5 rounded-2xl">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col" style={{ height: '100vh', maxHeight: '100vh' }}>
      {/* ─── Fixed Header ─── */}
      <header className="flex-shrink-0 px-4 safe-top-compact pb-3 bg-black border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <button onClick={handleExit} className="w-10 h-10 rounded-xl bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary active:bg-remembra-bg-tertiary">
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-3">
            {session.correctStreak > 1 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/15 rounded-lg">
                <Flame size={14} className="text-orange-400" />
                <span className="text-sm font-bold text-orange-400">{session.correctStreak}</span>
              </div>
            )}
            <div className="px-3 py-1 bg-remembra-bg-secondary rounded-lg">
              <span className="text-sm text-remembra-text-primary font-medium">
                {currentReviewIndex + 1}/{reviewQueue.length}
              </span>
            </div>
          </div>
        </div>

        <div className="h-1.5 bg-remembra-bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-remembra-accent-primary to-remembra-accent-secondary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* ─── Scrollable Content Area ─── */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        }}
      >
        {/* Meta badges */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {category && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-remembra-bg-secondary border border-white/5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: category.color }} />
              <span className="text-xs font-medium text-remembra-text-primary">{category.name}</span>
            </div>
          )}
          <div className="px-3 py-1.5 rounded-lg bg-remembra-accent-primary/10 border border-remembra-accent-primary/20">
            <span className="text-xs text-remembra-accent-primary font-semibold">{stageLabel}</span>
          </div>
          {currentItem.lapse_count >= 4 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={12} className="text-red-400" />
              <span className="text-xs text-red-400 font-medium">Needs Focus</span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
            retention > 80 ? 'bg-green-500/10' : retention > 50 ? 'bg-yellow-500/10' : 'bg-red-500/10'
          }`}>
            <Brain size={16} className={retention > 80 ? 'text-green-400' : retention > 50 ? 'text-yellow-400' : 'text-red-400'} />
            <div>
              <span className={`text-sm font-bold ${retention > 80 ? 'text-green-400' : retention > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {retention}%
              </span>
              <span className="text-[10px] text-remembra-text-muted ml-1">recall</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-remembra-bg-secondary rounded-xl">
            <Timer size={14} className="text-remembra-text-muted" />
            <span className="text-sm font-mono text-remembra-text-primary">{fmtTime(elapsedSeconds)}</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white leading-tight mb-4">
          {currentItem.title}
        </h2>

        {/* Content Card - Full height, parent handles scrolling */}
        <div className="bg-remembra-bg-secondary rounded-2xl border border-white/10 mb-4">
          <div className="p-5">
            <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-headings:font-bold prose-p:text-remembra-text-secondary prose-p:leading-relaxed prose-a:text-remembra-accent-primary prose-a:underline prose-strong:text-white prose-code:text-remembra-accent-secondary prose-code:bg-black/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-black/70 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl prose-ul:text-remembra-text-secondary prose-ol:text-remembra-text-secondary prose-li:my-1">
              <MarkdownRenderer content={currentItem.content} />
            </div>
          </div>
        </div>

        {/* ─── Action Buttons ─── */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl transition-all active:scale-95 ${
              showNotes 
                ? 'bg-remembra-accent-primary/15 border-2 border-remembra-accent-primary/30' 
                : 'bg-remembra-bg-secondary border-2 border-white/5'
            }`}
          >
            <StickyNote size={20} className={showNotes ? 'text-remembra-accent-primary' : 'text-remembra-text-muted'} />
            <span className={`text-[10px] font-medium ${showNotes ? 'text-remembra-accent-primary' : 'text-remembra-text-muted'}`}>
              Notes
            </span>
          </button>

          <button 
            onClick={handleCopy} 
            className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl bg-remembra-bg-secondary border-2 border-white/5 transition-all active:scale-95"
          >
            {copied ? <Check size={20} className="text-remembra-success" /> : <Copy size={20} className="text-remembra-text-muted" />}
            <span className="text-[10px] font-medium text-remembra-text-muted">
              {copied ? 'Copied' : 'Copy'}
            </span>
          </button>

          <button
            onClick={handleBookmark}
            className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl transition-all active:scale-95 ${
              currentItem.is_bookmarked
                ? 'bg-yellow-500/15 border-2 border-yellow-500/30'
                : 'bg-remembra-bg-secondary border-2 border-white/5'
            }`}
          >
            {currentItem.is_bookmarked ? (
              <Bookmark size={20} className="fill-yellow-400 text-yellow-400" />
            ) : (
              <BookmarkPlus size={20} className="text-remembra-text-muted" />
            )}
            <span className={`text-[10px] font-medium ${currentItem.is_bookmarked ? 'text-yellow-400' : 'text-remembra-text-muted'}`}>
              {currentItem.is_bookmarked ? 'Saved' : 'Save'}
            </span>
          </button>

          <button 
            onClick={handleSkip} 
            className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl bg-remembra-bg-secondary border-2 border-white/5 transition-all active:scale-95"
          >
            <SkipForward size={20} className="text-remembra-text-muted" />
            <span className="text-[10px] font-medium text-remembra-text-muted">Skip</span>
          </button>
        </div>

        {/* ─── Inline Notes ─── */}
        {showNotes && (
          <div className="bg-remembra-bg-secondary rounded-2xl border border-remembra-accent-primary/20 p-4 mb-4 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-remembra-accent-primary">Your Notes</span>
              <button
                onClick={handleSaveNote}
                className="px-4 py-1.5 rounded-lg bg-remembra-accent-primary text-white text-xs font-medium active:opacity-80"
              >
                Save
              </button>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add notes, mnemonics, or insights..."
              className="w-full bg-black/40 rounded-xl p-3 text-sm text-remembra-text-primary placeholder-remembra-text-muted/50 border border-white/10 focus:border-remembra-accent-primary/50 focus:outline-none resize-none"
              rows={4}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            />
          </div>
        )}

        {/* ─── AI Insights (on reveal) ─── */}
        {phase === 'revealed' && currentItem.ai_summary && (
          <div className="bg-gradient-to-br from-remembra-accent-primary/10 to-remembra-accent-secondary/10 rounded-2xl border border-remembra-accent-primary/20 p-4 mb-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-remembra-accent-primary" />
              <span className="text-sm font-semibold text-remembra-accent-primary">AI Summary</span>
            </div>
            <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-remembra-text-secondary">
              <MarkdownRenderer content={currentItem.ai_summary} />
            </div>
          </div>
        )}

        {/* ─── Review History (on reveal) ─── */}
        {phase === 'revealed' && currentItem.review_history.length > 0 && (
          <div className="bg-remembra-bg-secondary rounded-2xl border border-white/10 p-4 mb-4 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-remembra-text-muted font-medium">
                Last {Math.min(8, currentItem.review_history.length)} reviews
              </p>
              <p className="text-xs text-remembra-text-muted">
                EF {currentItem.easiness_factor.toFixed(2)} · {currentItem.repetition} reps
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {currentItem.review_history.slice(-8).map((r, i) => {
                const perf = r.performance;
                const color = perf === 'again' ? '#EF4444' : perf === 'hard' ? '#F59E0B' : perf === 'good' ? '#6366F1' : '#10B981';
                return (
                  <div key={i} className="flex-1 h-3 rounded-full" style={{ backgroundColor: color + '50' }} />
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom padding for footer */}
        <div className="h-32" />
      </div>

      {/* ─── Fixed Bottom Action Area ─── */}
      <div className="flex-shrink-0 px-4 safe-footer pt-4 pb-2 bg-gradient-to-t from-black via-black/98 to-transparent border-t border-white/10">
        {phase === 'thinking' ? (
          <Button
            onClick={handleReveal}
            className="w-full py-6 rounded-2xl text-white font-semibold text-base shadow-lg active:scale-[0.98] transition-transform"
            style={{ background: 'linear-gradient(135deg, rgb(16, 222, 13) 0%, rgb(20, 241, 0) 100%)' }}
          >
            <Eye size={20} className="mr-2" />
            Reviewed
          </Button>
        ) : (
          <div className="space-y-3 animate-slide-up">
            <p className="text-center text-sm text-remembra-text-muted font-medium mb-1">
              How well did you recall this?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleRate('again')}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 bg-red-500/10 border-2 border-red-500/30 hover:bg-red-500/15"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className="text-2xl">🔁</span>
                <span className="text-sm font-bold text-red-400">Revise Again</span>
                <span className="text-xs text-red-300/80">Back to Day 1</span>
              </button>
              <button
                onClick={() => handleRate('good')}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 bg-green-500/10 border-2 border-green-500/30 hover:bg-green-500/15"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className="text-2xl">✅</span>
                <span className="text-sm font-bold text-green-400">Got It!</span>
                <span className="text-xs text-green-300/80">Next stage</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
