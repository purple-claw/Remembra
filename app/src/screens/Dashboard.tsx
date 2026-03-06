import { useStore } from '@/store/useStore';
import {
  Flame,
  ChevronRight,
  Brain,
  Target,
  Layers,
  Plus,
  Sparkles,
  CalendarClock,
  CheckCircle2,
  BookOpen,
  TrendingUp,
} from 'lucide-react';
import { ProgressRing } from '@/components/ProgressRing';
import { CalendarStrip } from '@/components/CalendarStrip';
import { CategoryCard } from '@/components/CategoryCard';
import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useState } from 'react';

export function Dashboard() {
  const { profile, categories, memoryItems, setScreen, startReviewSession, getItemsDueToday } = useStore();
  const [greeting, setGreeting] = useState('Good morning');
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const itemsDueToday = getItemsDueToday();

  const completedToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return memoryItems.reduce((count, item) => count + (item.review_history || []).filter((review) => review.date === today).length, 0);
  }, [memoryItems]);

  const dailyGoal = Math.max(itemsDueToday.length + completedToday, 5);
  const progressPercentage = Math.round((completedToday / dailyGoal) * 100);
  const completedItemsCount = useMemo(
    () => memoryItems.filter((item) => item.status === 'completed').length,
    [memoryItems],
  );
  const activeItemsCount = useMemo(
    () => memoryItems.filter((item) => item.status === 'active').length,
    [memoryItems],
  );
  const dueLabel = itemsDueToday.length === 1 ? 'review due' : 'reviews due';

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [profile?.avatar_url]);

  const handleStartReview = () => {
    if (itemsDueToday.length > 0) {
      startReviewSession();
    }
  };

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-black flex flex-col">
      {/* Fixed Header */}
      <header className="flex-shrink-0 border-b border-white/[0.06] bg-black/80 px-4 sm:px-5 safe-top pb-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setScreen('profile')}
            className="flex items-center gap-3 rounded-2xl bg-white/[0.04] px-2.5 py-1.5 transition-all active:scale-95 hover:bg-white/[0.07]"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className="relative">
              <div className="w-11 h-11 rounded-full border border-white/15 p-[2px]">
                {profile?.avatar_url && !avatarLoadFailed ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile?.username || 'User'}
                    onError={() => setAvatarLoadFailed(true)}
                    className="w-full h-full rounded-full object-cover bg-remembra-bg-secondary"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-remembra-bg-secondary flex items-center justify-center">
                    <span className="text-base font-bold text-remembra-accent-primary">
                      {(profile?.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-black bg-remembra-success" />
            </div>

            <div className="text-left">
              <p className="text-remembra-text-muted text-xs">{greeting}</p>
              <h1 className="text-base font-semibold text-remembra-text-primary leading-tight">{profile?.username || 'User'}</h1>
            </div>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-1.5">
              <Flame size={15} className="text-orange-400 animate-flame" />
              <span className="text-xs font-semibold text-orange-300">{profile?.streak_count || 0}</span>
            </div>
            <ProgressRing percentage={progressPercentage} size={42} strokeWidth={3.5} color="#FF8000" />
          </div>
        </div>
      </header>

      {/* Scrollable Content */}
      <div
        data-nav-scroll="true"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        {/* Ambient page glow blobs — make glassmorphism visible against dark bg */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }} aria-hidden>
          <div className="absolute top-16 right-[-8%] w-[22rem] h-[22rem] rounded-full bg-orange-500/[0.09] blur-[90px]" />
          <div className="absolute top-[50%] left-[-6%] w-72 h-72 rounded-full bg-red-600/[0.07] blur-[80px]" />
          <div className="absolute bottom-32 right-[12%] w-60 h-60 rounded-full bg-orange-400/[0.06] blur-[70px]" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl space-y-5 px-4 sm:px-5 pt-5 safe-bottom-nav" style={{ zIndex: 1 }}>

          {/* Hero Focus Card — liquid glass with ambient glow visible through it */}
          <section className="animate-slide-up">
            <div className="liquid-glass relative overflow-hidden rounded-3xl p-5 sm:p-6">

              <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1.5fr),minmax(0,1fr)]">
                <div className="min-w-0">
                  <div className="mb-3 flex items-center gap-2 flex-wrap">
                    <span className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1 text-xs text-white/65 backdrop-blur-sm">
                      Today's Focus
                    </span>
                    {itemsDueToday.length > 0 && (
                      <span className="rounded-full bg-remembra-accent-primary/18 border border-remembra-accent-primary/28 px-2.5 py-1 text-xs font-semibold text-remembra-accent-primary backdrop-blur-sm">
                        {itemsDueToday.length} due
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl font-bold text-white sm:text-3xl mb-2">
                    {itemsDueToday.length > 0 ? (
                      <>{itemsDueToday.length} {dueLabel}</>
                    ) : (
                      <span className="text-remembra-success">All caught up!</span>
                    )}
                  </h2>
                  <p className="text-sm text-white/60 mb-5 leading-relaxed">
                    Keep your memory sharp with adaptive spaced repetition.
                  </p>

                  <Button
                    onClick={handleStartReview}
                    disabled={itemsDueToday.length === 0}
                    className="rounded-xl border border-white/30 bg-white/88 px-6 py-5 font-semibold text-remembra-accent-primary hover:bg-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm w-full sm:w-auto"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {itemsDueToday.length > 0 ? (
                      <>
                        Start Review Session
                        <ChevronRight size={18} className="ml-1" />
                      </>
                    ) : (
                      '✓ All caught up today'
                    )}
                  </Button>
                </div>

                {/* Mini stat chips — glass on glass layering */}
                <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm p-3.5">
                    <div className="mb-1.5 flex items-center gap-1.5 text-white/50">
                      <CalendarClock size={12} />
                      <span className="text-[10px] uppercase tracking-wide">Due</span>
                    </div>
                    <p className="text-xl font-bold text-white">{itemsDueToday.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm p-3.5">
                    <div className="mb-1.5 flex items-center gap-1.5 text-white/50">
                      <CheckCircle2 size={12} />
                      <span className="text-[10px] uppercase tracking-wide">Done</span>
                    </div>
                    <p className="text-xl font-bold text-white">{completedToday}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-sm p-3.5">
                    <div className="mb-1.5 flex items-center gap-1.5 text-white/50">
                      <Target size={12} />
                      <span className="text-[10px] uppercase tracking-wide">Goal</span>
                    </div>
                    <p className="text-xl font-bold text-white">{Math.min(100, progressPercentage)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Quick-stat row */}
          <section className="animate-slide-up stagger-1">
            <div className="grid grid-cols-3 gap-3">
              <div className="liquid-glass-soft rounded-2xl p-4">
                <div className="mb-2 flex items-center gap-1.5 text-remembra-text-muted">
                  <Target size={14} className="text-remembra-accent-primary" />
                  <span className="text-xs">Reviews</span>
                </div>
                <p className="text-2xl font-bold text-remembra-text-primary">{profile?.total_reviews || 0}</p>
                <p className="text-[10px] text-remembra-text-muted mt-0.5">all time</p>
              </div>
              <div className="liquid-glass-soft rounded-2xl p-4">
                <div className="mb-2 flex items-center gap-1.5 text-remembra-text-muted">
                  <Layers size={14} className="text-remembra-success" />
                  <span className="text-xs">Mastered</span>
                </div>
                <p className="text-2xl font-bold text-remembra-text-primary">{completedItemsCount}</p>
                <p className="text-[10px] text-remembra-text-muted mt-0.5">items</p>
              </div>
              <div className="liquid-glass-soft rounded-2xl p-4">
                <div className="mb-2 flex items-center gap-1.5 text-remembra-text-muted">
                  <BookOpen size={14} className="text-remembra-warning" />
                  <span className="text-xs">Active</span>
                </div>
                <p className="text-2xl font-bold text-remembra-text-primary">{activeItemsCount}</p>
                <p className="text-[10px] text-remembra-text-muted mt-0.5">learning</p>
              </div>
            </div>
          </section>

          {/* Review Rhythm */}
          <section className="animate-slide-up stagger-2">
            <div className="liquid-glass-soft rounded-3xl p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-remembra-text-primary">Review Rhythm</h3>
                  <p className="text-xs text-remembra-text-muted mt-0.5">Your adaptive cadence</p>
                </div>
                <button
                  onClick={() => setScreen('stats')}
                  className="flex items-center gap-1 text-xs text-remembra-accent-primary active:opacity-70 transition-opacity"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <TrendingUp size={13} />
                  Stats
                </button>
              </div>
              <CalendarStrip />
            </div>
          </section>

          {/* Categories */}
          <section className="animate-slide-up stagger-3">
            <div className="liquid-glass-soft rounded-3xl p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-remembra-text-primary">Categories</h3>
                <button
                  onClick={() => setScreen('library')}
                  className="text-xs text-remembra-accent-primary active:opacity-70 transition-opacity"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  See all
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                {categories.length > 0 ? (
                  categories.map((category, index) => (
                    <CategoryCard
                      key={category.id}
                      category={category}
                      style={{ animationDelay: `${index * 50}ms` }}
                    />
                  ))
                ) : (
                  <div
                    onClick={() => setScreen('create')}
                    className="glass-card flex-shrink-0 w-40 h-24 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover-lift"
                  >
                    <Plus size={22} className="text-remembra-accent-primary" />
                    <span className="text-xs text-remembra-text-muted">Add Category</span>
                  </div>
                )}

                <button
                  onClick={() => setScreen('create')}
                  className="flex-shrink-0 w-14 h-14 self-center rounded-2xl glass-button flex items-center justify-center text-remembra-accent-primary hover:scale-105 transition-all"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <Plus size={22} />
                </button>
              </div>
            </div>
          </section>

          {/* Recent Items or Empty CTA */}
          {memoryItems.length > 0 ? (
            <section className="animate-slide-up stagger-4">
              <div className="liquid-glass-soft rounded-3xl p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-remembra-text-primary">Recent Items</h3>
                  <button
                    onClick={() => setScreen('library')}
                    className="text-xs text-remembra-accent-primary active:opacity-70"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    Library →
                  </button>
                </div>
                <div className="space-y-2.5">
                  {memoryItems.slice(0, 4).map((item, index) => (
                    <div
                      key={item.id}
                      onClick={() => setScreen('library')}
                      className="liquid-glass-soft liquid-glass-interactive flex items-center gap-3.5 rounded-2xl p-3.5 cursor-pointer"
                      style={{ animationDelay: `${index * 40}ms`, WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-remembra-accent-primary/10 flex items-center justify-center">
                        <Brain size={16} className="text-remembra-accent-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-remembra-text-primary">{item.title}</p>
                        <p className="text-[11px] text-remembra-text-muted capitalize">{item.status}</p>
                      </div>
                      <ChevronRight size={14} className="text-remembra-text-muted flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <section className="animate-slide-up stagger-4">
              <div className="liquid-glass-soft rounded-3xl p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-remembra-accent-primary/10">
                  <Sparkles size={28} className="text-remembra-accent-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-remembra-text-primary">Get Started</h3>
                <p className="mb-5 text-sm text-remembra-text-muted leading-relaxed">
                  Create your first Review to begin your learning.
                </p>
                <Button onClick={() => setScreen('create')} className="gradient-primary text-white px-6">
                  <Plus size={16} className="mr-2" />
                  Create Item
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}