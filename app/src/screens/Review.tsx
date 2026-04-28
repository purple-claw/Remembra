import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import type { MemoryItem, Performance } from '@/types';
import { estimateRetention } from '@/types';
import {
  ArrowLeft,
  Bookmark,
  BookmarkPlus,
  Brain,
  Check,
  Clock,
  Copy,
  Eye,
  Flame,
  SkipForward,
  StickyNote,
  Target,
  Timer,
  Trophy,
} from 'lucide-react';
import { saveSession } from '@/services/persistService';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { toast } from 'sonner';
import { getItemScheduleLabel } from '@/domain/review147';
import { ensureCodeFence, parseCodeContent } from '@/lib/codeContent';

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
    goBack,
    getCategoryById,
    updateMemoryItem,
    nextReviewItem,
    categories,
  } = useStore();

  const [phase, setPhase] = useState<'thinking' | 'revealed'>('thinking');
  const [cardStartTime, setCardStartTime] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [session, setSession] = useState<SessionStats>(() => ({
    startedAt: Date.now(),
    cardsReviewed: 0,
    correctStreak: 0,
    maxStreak: 0,
    performances: [],
  }));

  // Snapshot of items as they are rated (used for Persist)
  const [reviewedItems, setReviewedItems] = useState<MemoryItem[]>([]);
  const [persistSaved, setPersistSaved] = useState(false);
  const [persistSaving, setPersistSaving] = useState(false);
  const [persistAutoSaveFailed, setPersistAutoSaveFailed] = useState(false);
  const autoSaveAttemptedRef = useRef(false);

  const currentItem = reviewQueue[currentReviewIndex];
  const progress = reviewQueue.length > 0 ? (currentReviewIndex / reviewQueue.length) * 100 : 0;
  const category = currentItem ? getCategoryById(currentItem.category_id) : null;

  const retention = useMemo(
    () => (currentItem ? estimateRetention(currentItem) : 100),
    [currentItem],
  );

  const codeParts = useMemo(() => {
    if (!currentItem || currentItem.content_type !== 'code') return null;
    return parseCodeContent(currentItem.content);
  }, [currentItem]);

  const codeQuestion = (codeParts?.question || '').trim();
  const codeAnswer = (codeParts?.answer || '').trim();
  const codeAnswerMarkdown = codeAnswer
    ? ensureCodeFence(codeAnswer, codeParts?.language)
    : '';
  const showCodeSplit = !!codeQuestion && !!codeAnswer;
  const showQuestionOnly = !!codeQuestion && !codeAnswer;

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - cardStartTime) / 1000));
      setSessionSeconds(Math.round((Date.now() - session.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [cardStartTime, session.startedAt]);

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
    setSession((previous) => ({
      ...previous,
      cardsReviewed: previous.cardsReviewed + 1,
      correctStreak: newStreak,
      maxStreak: Math.max(previous.maxStreak, newStreak),
      performances: [...previous.performances, performance],
    }));

    // Capture a snapshot before the item is mutated by completeReview
    setReviewedItems((prev) => [...prev, { ...currentItem }]);

    await completeReview(performance, timeSpent);

    const messages: Record<Performance, string> = {
      again: 'Marked for revision. Back to Day 1.',
      hard: 'Marked for revision. Back to Day 1.',
      good: 'Marked done. Advanced to next stage.',
      easy: 'Marked done. Advanced to next stage.',
    };
    toast.success(messages[performance]);
  }, [completeReview, currentItem, cardStartTime, session.correctStreak]);

  const handleSkip = () => {
    toast('Skipped. We will review it later.');
    nextReviewItem();
  };

  // Auto-save to Persist when the session completes
  useEffect(() => {
    if (currentItem || reviewedItems.length === 0 || autoSaveAttemptedRef.current) return;
    autoSaveAttemptedRef.current = true;
    setPersistSaving(true);
    setPersistAutoSaveFailed(false);
    saveSession(reviewedItems, categories)
      .then(() => {
        setPersistSaved(true);
        toast.success('Session archived to Persist!');
      })
      .catch((err) => {
        console.error('[Persist] auto-save failed', err);
        setPersistAutoSaveFailed(true);
        toast.error('Failed to archive session');
      })
      .finally(() => setPersistSaving(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem]);

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
    const nextValue = !currentItem.is_bookmarked;
    await updateMemoryItem(currentItem.id, { is_bookmarked: nextValue });
    toast.success(nextValue ? 'Bookmarked' : 'Bookmark removed');
  };

  const handleExit = () => goBack('dashboard');

  const formatElapsed = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return minutes > 0 ? `${minutes}:${remainder.toString().padStart(2, '0')}` : `${seconds}s`;
  };

  const sessionAccuracy = session.cardsReviewed > 0
    ? Math.round((session.performances.filter((value) => value === 'good' || value === 'easy').length / session.cardsReviewed) * 100)
    : 100;

  const sessionMinutes = Math.max(1, Math.round(sessionSeconds / 60));
  const stageLabel = currentItem ? getItemScheduleLabel(currentItem) : '';

  if (!currentItem) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[calc(env(safe-area-inset-bottom)+1.25rem)] animate-screen-enter">
        <div className="widget-surface inertia-card smooth-surface stagger-enter w-full max-w-md glass-card rounded-3xl p-6 text-center">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-remembra-accent-primary/30 to-remembra-success/30 flex items-center justify-center mb-5">
            <Trophy size={34} className="text-remembra-accent-primary" />
          </div>

          <h2 className="text-2xl font-semibold text-remembra-text-primary mb-1">Session Complete</h2>
          <p className="text-sm text-remembra-text-muted mb-6">Solid work. Here is your recap.</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
              <p className="text-xs text-remembra-text-muted mb-1">Cards Reviewed</p>
              <p className="text-2xl font-semibold text-remembra-text-primary">{session.cardsReviewed}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
              <p className="text-xs text-remembra-text-muted mb-1">Accuracy</p>
              <p className="text-2xl font-semibold text-remembra-text-primary">{sessionAccuracy}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
              <p className="text-xs text-remembra-text-muted mb-1">Best Streak</p>
              <p className="text-2xl font-semibold text-remembra-text-primary">{session.maxStreak}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
              <p className="text-xs text-remembra-text-muted mb-1">Time Spent</p>
              <p className="text-2xl font-semibold text-remembra-text-primary">{sessionMinutes}m</p>
            </div>
          </div>

          {/* ── Persist status ── */}
          {persistSaving ? (
            <div className="mb-4 rounded-2xl border border-remembra-accent-primary/20 bg-remembra-accent-primary/5 p-3 flex items-center gap-2 text-sm text-remembra-text-secondary">
              <span className="animate-spin">⏳</span>
              Archiving session to Persist…
            </div>
          ) : persistSaved ? (
            <div className="mb-4 rounded-2xl border border-remembra-success/20 bg-remembra-success/5 p-3 text-center text-sm text-remembra-success">
              ✓ Archived to Persist
            </div>
          ) : persistAutoSaveFailed ? (
            <div className="mb-4 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
              <p className="text-sm text-orange-400 mb-3">Auto-archive failed. Retry?</p>
              <button
                onClick={async () => {
                  if (reviewedItems.length === 0) return;
                  setPersistSaving(true);
                  setPersistAutoSaveFailed(false);
                  try {
                    await saveSession(reviewedItems, categories);
                    setPersistSaved(true);
                    toast.success('Session archived to Persist!');
                  } catch {
                    setPersistAutoSaveFailed(true);
                    toast.error('Failed to archive session.');
                  } finally {
                    setPersistSaving(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500/20 border border-orange-500/30 py-2.5 text-sm font-medium text-orange-400"
              >
                Retry Archive
              </button>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button onClick={() => setScreen('dashboard')} className="flex-1 gradient-primary py-5 rounded-2xl text-white">
              Back to Dashboard
            </Button>
            <Button onClick={() => setScreen('persist')} variant="outline" className="px-5 py-5 rounded-2xl border-white/15 text-remembra-text-secondary">
              View Persist
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-black flex flex-col animate-screen-enter">
      <header className="flex-shrink-0 px-4 sm:px-6 safe-top-compact pb-4 border-b border-white/10 bg-black/80 backdrop-blur-xl transition-smooth relative z-30 animate-slide-up">
        <div className="flex items-center justify-between gap-3 mb-3">
          <button
            onClick={handleExit}
            className="w-10 h-10 rounded-xl border border-white/10 bg-remembra-bg-secondary flex items-center justify-center text-remembra-text-secondary tap-ripple press-glow"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-2">
            {session.correctStreak > 1 && (
              <div className="px-2.5 py-1 rounded-lg bg-orange-500/15 text-orange-400 text-sm font-semibold flex items-center gap-1">
                <Flame size={13} />
                {session.correctStreak}
              </div>
            )}
            <div className="px-3 py-1 rounded-lg bg-remembra-bg-secondary border border-white/10 text-sm font-medium text-remembra-text-primary">
              {currentReviewIndex + 1}/{reviewQueue.length}
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

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 pb-6 custom-scrollbar fluid-scroll-zone smooth-scroll-content relative z-0"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr),320px]">
          <section className="min-w-0 space-y-4">
            <div className="widget-surface inertia-card smooth-surface stagger-enter glass-card rounded-2xl p-4" style={{ animationDelay: '40ms' }}>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {category && (
                  <div className="px-3 py-1.5 rounded-lg text-xs border border-white/10 flex items-center gap-1.5" style={{ backgroundColor: `${category.color}15` }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="text-remembra-text-primary">{category.name}</span>
                  </div>
                )}
                <div className="px-3 py-1.5 rounded-lg text-xs bg-remembra-accent-primary/10 border border-remembra-accent-primary/20 text-remembra-accent-primary">
                  {stageLabel}
                </div>
              </div>

              <h2 className="mb-3 break-words text-xl font-semibold leading-tight text-remembra-text-primary sm:text-2xl">{currentItem.title}</h2>

              <div className="min-w-0 rounded-xl border border-white/10 bg-black/30 p-3 sm:p-4">
                <div className="min-w-0 max-w-full">
                  {currentItem.content_type === 'code' ? (
                    showCodeSplit ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-white/10 bg-black/35 p-3">
                          <p className="text-[10px] uppercase tracking-wide text-remembra-text-muted mb-2">Question</p>
                          <MarkdownRenderer content={codeQuestion} />
                        </div>
                        {phase === 'revealed' ? (
                          <div className="rounded-lg border border-white/10 bg-black/35 p-3">
                            <p className="text-[10px] uppercase tracking-wide text-remembra-text-muted mb-2">Answer</p>
                            <MarkdownRenderer content={codeAnswerMarkdown} />
                          </div>
                        ) : (
                          <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-remembra-text-muted">
                            Answer hidden. Tap "Complete Review" to reveal.
                          </div>
                        )}
                      </div>
                    ) : (
                      showQuestionOnly ? (
                        <MarkdownRenderer content={codeQuestion} />
                      ) : (
                        <MarkdownRenderer content={ensureCodeFence(currentItem.content)} />
                      )
                    )
                  ) : (
                    <MarkdownRenderer content={currentItem.content} />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                onClick={() => setShowNotes((value) => !value)}
                className={`rounded-xl border px-3 py-3 text-xs font-medium transition-colors flex flex-col items-center gap-1.5 ${
                  showNotes
                    ? 'bg-remembra-accent-primary/15 border-remembra-accent-primary/30 text-remembra-accent-primary'
                    : 'bg-remembra-bg-secondary border-white/10 text-remembra-text-muted'
                }`}
              >
                <StickyNote size={18} />
                Notes
              </button>

              <button
                onClick={handleCopy}
                className="rounded-xl border border-white/10 bg-remembra-bg-secondary px-3 py-3 text-xs font-medium text-remembra-text-muted flex flex-col items-center gap-1.5"
              >
                {copied ? <Check size={18} className="text-remembra-success" /> : <Copy size={18} />}
                {copied ? 'Copied' : 'Copy'}
              </button>

              <button
                onClick={handleBookmark}
                className={`rounded-xl border px-3 py-3 text-xs font-medium transition-colors flex flex-col items-center gap-1.5 ${
                  currentItem.is_bookmarked
                    ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
                    : 'bg-remembra-bg-secondary border-white/10 text-remembra-text-muted'
                }`}
              >
                {currentItem.is_bookmarked ? <Bookmark size={18} className="fill-yellow-400" /> : <BookmarkPlus size={18} />}
                {currentItem.is_bookmarked ? 'Saved' : 'Save'}
              </button>

              <button
                onClick={handleSkip}
                className="rounded-xl border border-white/10 bg-remembra-bg-secondary px-3 py-3 text-xs font-medium text-remembra-text-muted flex flex-col items-center gap-1.5"
              >
                <SkipForward size={18} />
                Skip
              </button>
            </div>

            {showNotes && (
              <div className="widget-surface inertia-card smooth-surface stagger-enter glass-card rounded-2xl border border-remembra-accent-primary/20 p-4" style={{ animationDelay: '120ms' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-remembra-accent-primary">Notes</p>
                  <button
                    onClick={handleSaveNote}
                    className="px-4 py-1.5 rounded-lg bg-remembra-accent-primary text-white text-xs font-medium"
                  >
                    Save
                  </button>
                </div>
                <textarea
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  placeholder="Add notes, mnemonics, or insights..."
                  className="w-full bg-black/40 rounded-xl p-3 text-sm text-remembra-text-primary placeholder-remembra-text-muted/60 border border-white/10 focus:border-remembra-accent-primary/50 focus:outline-none resize-none"
                  rows={4}
                />
              </div>
            )}

          </section>

          <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 h-fit">
            <div className="widget-surface inertia-card smooth-surface stagger-enter glass-card rounded-2xl p-4" style={{ animationDelay: '80ms' }}>
              <p className="text-xs uppercase tracking-wider text-remembra-text-muted mb-3">Live Metrics</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-black/25 border border-white/10 p-2.5">
                  <div className="flex items-center gap-2 text-remembra-text-muted text-xs">
                    <Brain size={14} />
                    Recall
                  </div>
                  <span className="text-sm font-semibold text-remembra-text-primary">{retention}%</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-black/25 border border-white/10 p-2.5">
                  <div className="flex items-center gap-2 text-remembra-text-muted text-xs">
                    <Timer size={14} />
                    Card Timer
                  </div>
                  <span className="text-sm font-semibold text-remembra-text-primary">{formatElapsed(elapsedSeconds)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-black/25 border border-white/10 p-2.5">
                  <div className="flex items-center gap-2 text-remembra-text-muted text-xs">
                    <Target size={14} />
                    Accuracy
                  </div>
                  <span className="text-sm font-semibold text-remembra-text-primary">{sessionAccuracy}%</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-black/25 border border-white/10 p-2.5">
                  <div className="flex items-center gap-2 text-remembra-text-muted text-xs">
                    <Clock size={14} />
                    Session
                  </div>
                  <span className="text-sm font-semibold text-remembra-text-primary">{sessionMinutes}m</span>
                </div>
              </div>
            </div>

            {phase === 'revealed' && currentItem.review_history.length > 0 && (
              <div className="widget-surface inertia-card smooth-surface stagger-enter glass-card rounded-2xl p-4" style={{ animationDelay: '160ms' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase tracking-wider text-remembra-text-muted">Recent Reviews</p>
                  <p className="text-xs text-remembra-text-muted">EF {currentItem.easiness_factor.toFixed(2)}</p>
                </div>
                <div className="grid grid-cols-8 gap-1.5 mb-3">
                  {currentItem.review_history.slice(-8).map((entry, index) => {
                    const color = entry.performance === 'again'
                      ? 'bg-red-500/60'
                      : entry.performance === 'hard'
                        ? 'bg-amber-500/60'
                        : entry.performance === 'good'
                          ? 'bg-remembra-accent-primary/60'
                          : 'bg-green-500/60';
                    return <div key={index} className={`h-3 rounded-full ${color}`} />;
                  })}
                </div>
                <p className="text-xs text-remembra-text-muted">{currentItem.review_history.length} total review events.</p>
              </div>
            )}
          </aside>
        </div>
      </div>

      <div className="flex-shrink-0 px-4 sm:px-6 safe-footer pt-4 pb-3 border-t border-white/10 bg-black/90 backdrop-blur-xl transition-smooth relative z-20 animate-slide-up">
        {phase === 'thinking' ? (
          <Button
            onClick={handleReveal}
            className="w-full py-6 rounded-2xl text-white font-semibold text-base bg-gradient-to-r from-green-500 to-lime-500 tap-ripple press-glow"
          >
            <Eye size={20} className="mr-2" />
            Complete Review
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-sm text-remembra-text-muted font-medium">How well did you recall this?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleRate('again')}
                className="rounded-2xl border-2 border-red-500/30 bg-red-500/10 py-4 text-center tap-ripple press-glow"
              >
                <p className="text-sm font-semibold text-red-400">Revise Again</p>
                <p className="text-xs text-red-300/70 mt-1">Reset to Day 1</p>
              </button>
              <button
                onClick={() => handleRate('good')}
                className="rounded-2xl border-2 border-green-500/30 bg-green-500/10 py-4 text-center tap-ripple press-glow"
              >
                <p className="text-sm font-semibold text-green-400">Got It</p>
                <p className="text-xs text-green-300/70 mt-1">Next Stage</p>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
