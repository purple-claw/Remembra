import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import type { Performance } from '@/types';
import { getPredictedIntervals, formatInterval, formatShortDate, estimateRetention } from '@/types';
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

  const predictions = useMemo(
    () => (currentItem ? getPredictedIntervals(currentItem) : []),
    [currentItem],
  );

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
      again: "No worries — you'll see this again tomorrow",
      hard: 'Keep at it — interval adjusted',
      good: 'Nice recall! Moving forward',
      easy: 'Excellent! Big interval boost ⚡',
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
    ? Math.round((session.performances.filter(p => p !== 'again').length / session.cardsReviewed) * 100)
    : 100;
  const sessionMinutes = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));

  // ─── Session Complete ───
  if (!currentItem) {
    return (
      <div className="h-screen bg-black flex items-center justify-center px-5">
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
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* ─── Header ─── */}
      <header className="px-4 pt-5 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button onClick={handleExit} className="w-9 h-9 rounded-xl bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-3">
            {session.correctStreak > 1 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-lg animate-slide-up">
                <Flame size={12} className="text-orange-400" />
                <span className="text-xs font-bold text-orange-400">{session.correctStreak}</span>
              </div>
            )}
            <span className="text-xs text-remembra-text-muted font-medium">
              {currentReviewIndex + 1}/{reviewQueue.length}
            </span>
          </div>
        </div>

        <div className="h-1 bg-remembra-bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-remembra-accent-primary to-remembra-accent-secondary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* ─── Scrollable Content ─── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3">
        {/* Meta bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {category && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-remembra-bg-secondary">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
                <span className="text-[11px] text-remembra-text-muted">{category.name}</span>
              </div>
            )}
            {currentItem.lapse_count >= 4 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10">
                <AlertTriangle size={10} className="text-red-400" />
                <span className="text-[10px] text-red-400 font-medium">Leech</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
              retention > 80 ? 'bg-green-500/10' : retention > 50 ? 'bg-yellow-500/10' : 'bg-red-500/10'
            }`}>
              <Brain size={10} className={retention > 80 ? 'text-green-400' : retention > 50 ? 'text-yellow-400' : 'text-red-400'} />
              <span className={`text-[10px] font-semibold ${retention > 80 ? 'text-green-400' : retention > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {retention}%
              </span>
            </div>
            <div className="flex items-center gap-1 text-remembra-text-muted">
              <Timer size={12} />
              <span className="text-xs font-mono">{fmtTime(elapsedSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-white leading-snug">
          {currentItem.title}
        </h2>

        {/* Content Card */}
        <div className="bg-remembra-bg-secondary rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-4">
            <div className="prose prose-invert prose-sm max-w-none">
              <MarkdownRenderer content={currentItem.content} />
            </div>
          </div>
        </div>

        {/* ─── Interaction Bar ─── */}
        <div className="flex items-center justify-around py-1">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${showNotes ? 'bg-remembra-accent-primary/10 text-remembra-accent-primary' : 'text-remembra-text-muted hover:text-white'}`}
          >
            <StickyNote size={16} />
            <span className="text-[9px]">Notes</span>
          </button>

          <button onClick={handleCopy} className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-remembra-text-muted hover:text-white transition-all">
            {copied ? <Check size={16} className="text-remembra-success" /> : <Copy size={16} />}
            <span className="text-[9px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleBookmark}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${currentItem.is_bookmarked ? 'text-yellow-400' : 'text-remembra-text-muted hover:text-white'}`}
          >
            {currentItem.is_bookmarked ? <Bookmark size={16} className="fill-yellow-400" /> : <BookmarkPlus size={16} />}
            <span className="text-[9px]">{currentItem.is_bookmarked ? 'Saved' : 'Save'}</span>
          </button>

          <button onClick={handleSkip} className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-remembra-text-muted hover:text-white transition-all">
            <SkipForward size={16} />
            <span className="text-[9px]">Skip</span>
          </button>
        </div>

        {/* ─── Inline Notes ─── */}
        {showNotes && (
          <div className="bg-remembra-bg-secondary rounded-2xl border border-remembra-accent-primary/20 p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-remembra-accent-primary">Your Notes</span>
              <button
                onClick={handleSaveNote}
                className="text-xs px-3 py-1 rounded-lg bg-remembra-accent-primary/20 text-remembra-accent-primary hover:bg-remembra-accent-primary/30 transition-colors"
              >
                Save
              </button>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note, mnemonic, or insight..."
              className="w-full bg-black/30 rounded-xl p-3 text-sm text-remembra-text-primary placeholder-remembra-text-muted/50 border border-white/5 focus:border-remembra-accent-primary/30 focus:outline-none resize-none"
              rows={3}
            />
          </div>
        )}

        {/* ─── AI Insights (on reveal) ─── */}
        {phase === 'revealed' && currentItem.ai_summary && (
          <div className="bg-gradient-to-br from-remembra-accent-primary/5 to-remembra-accent-secondary/5 rounded-2xl border border-remembra-accent-primary/15 p-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-remembra-accent-primary" />
              <span className="text-xs font-semibold text-remembra-accent-primary">AI Summary</span>
            </div>
            <div className="prose prose-invert prose-sm max-w-none">
              <MarkdownRenderer content={currentItem.ai_summary} />
            </div>
          </div>
        )}

        {/* ─── Review History Mini (on reveal) ─── */}
        {phase === 'revealed' && currentItem.review_history.length > 0 && (
          <div className="bg-remembra-bg-secondary rounded-2xl border border-white/5 p-3 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-remembra-text-muted">
                Last {Math.min(8, currentItem.review_history.length)} reviews
              </p>
              <p className="text-[10px] text-remembra-text-muted">
                EF {currentItem.easiness_factor.toFixed(2)} · {currentItem.repetition} reps
              </p>
            </div>
            <div className="flex items-center gap-1">
              {currentItem.review_history.slice(-8).map((r, i) => {
                const perf = r.performance;
                const color = perf === 'again' ? '#EF4444' : perf === 'hard' ? '#F59E0B' : perf === 'good' ? '#6366F1' : '#10B981';
                return (
                  <div key={i} className="flex-1 h-2.5 rounded-full" style={{ backgroundColor: color + '50' }} />
                );
              })}
            </div>
          </div>
        )}

        <div className="h-2" />
      </div>

      {/* ─── Bottom Action Area ─── */}
      <div className="flex-shrink-0 px-4 pb-5 pt-2 bg-gradient-to-t from-black via-black/95 to-transparent">
        {phase === 'thinking' ? (
          <Button
            onClick={handleReveal}
            className="w-full gradient-primary py-5 rounded-2xl text-white font-semibold text-base hover:opacity-90 transition-opacity"
          >
            <Eye size={18} className="mr-2" />
            Check Answer
          </Button>
        ) : (
          <div className="animate-slide-up space-y-3">
            <p className="text-center text-[11px] text-remembra-text-muted">
              How well did you recall this?
            </p>

            <div className="grid grid-cols-4 gap-2">
              {predictions.map(pred => (
                <button
                  key={pred.performance}
                  onClick={() => handleRate(pred.performance)}
                  className="flex flex-col items-center gap-0.5 p-2.5 rounded-xl transition-all duration-200 hover:scale-[1.03] active:scale-95 border"
                  style={{
                    backgroundColor: `${pred.color}08`,
                    borderColor: `${pred.color}25`,
                  }}
                >
                  <span className="text-sm">{pred.emoji}</span>
                  <span className="text-xs font-bold" style={{ color: pred.color }}>
                    {pred.label}
                  </span>
                  <span className="text-[10px] font-medium" style={{ color: pred.color, opacity: 0.7 }}>
                    {formatInterval(pred.interval)}
                  </span>
                  <span className="text-[9px] text-remembra-text-muted/60">
                    {formatShortDate(pred.nextDate)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
