import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import {
  Target,
  Flame,
  Award,
  ChevronRight,
  Brain,
  Clock,
  Settings,
  Calendar as CalendarIcon,
  Zap,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type StatsTab = 'overview' | 'analytics' | 'achievements';

export function Stats() {
  const { profile, memoryItems, categories, achievements, setScreen } = useStore();
  const [activeTab, setActiveTab] = useState<StatsTab>('overview');

  const computedStats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allReviews = memoryItems.flatMap((item) =>
      (item.review_history || []).map((review) => ({
        ...review,
        itemId: item.id,
        itemTitle: item.title,
        categoryId: item.category_id,
      })),
    );

    const recentReviews = allReviews.filter((review) => new Date(review.date) >= thirtyDaysAgo);
    const successfulReviews = recentReviews.filter((review) => review.performance === 'good' || review.performance === 'easy').length;
    const accuracy = recentReviews.length > 0 ? Math.round((successfulReviews / recentReviews.length) * 100) : 0;

    const totalSeconds = recentReviews.reduce((sum, review) => sum + (review.time_spent_seconds || 0), 0);
    const studyHours = Math.round((totalSeconds / 3600) * 10) / 10;
    const studyMinutes = Math.round(totalSeconds / 60);

    const reviewsByDate = new Map<string, number>();
    allReviews.forEach((review) => {
      reviewsByDate.set(review.date, (reviewsByDate.get(review.date) || 0) + 1);
    });

    const maxReviews = Math.max(1, ...Array.from(reviewsByDate.values()));

    const heatmapData = [];
    for (let i = 83; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = reviewsByDate.get(dateStr) || 0;

      let level = 0;
      if (count > 0) {
        const ratio = count / maxReviews;
        if (ratio >= 0.75) level = 4;
        else if (ratio >= 0.5) level = 3;
        else if (ratio >= 0.25) level = 2;
        else level = 1;
      }

      heatmapData.push({
        date: dateStr,
        count,
        level,
      });
    }

    const dailyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyActivity.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: dateStr,
        count: reviewsByDate.get(dateStr) || 0,
      });
    }

    const categoryBreakdown = categories
      .map((category) => ({
        name: category.name,
        value: memoryItems.filter((item) => item.category_id === category.id).length,
        color: category.color,
      }))
      .filter((entry) => entry.value > 0);

    const sortedItems = [...memoryItems].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    let masteredCount = 0;
    const rawProgressData = sortedItems.map((item, index) => {
      if (item.status === 'completed') masteredCount += 1;
      return {
        date: new Date(item.created_at).toISOString().split('T')[0],
        mastered: masteredCount,
        total: index + 1,
      };
    });

    const progressData = rawProgressData.reduce<Array<{ date: string; mastered: number; total: number }>>((acc, entry) => {
      const last = acc[acc.length - 1];
      if (last && last.date === entry.date) {
        last.mastered = entry.mastered;
        last.total = entry.total;
        return acc;
      }
      acc.push(entry);
      return acc;
    }, []);

    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const thisWeekReviews = allReviews.filter((review) => new Date(review.date) >= lastWeekStart).length;
    const lastWeekReviews = allReviews.filter((review) => {
      const reviewDate = new Date(review.date);
      return reviewDate >= twoWeeksAgo && reviewDate < lastWeekStart;
    }).length;

    const weeklyChange = lastWeekReviews > 0
      ? Math.round(((thisWeekReviews - lastWeekReviews) / lastWeekReviews) * 100)
      : thisWeekReviews > 0
        ? 100
        : 0;

    return {
      accuracy,
      studyHours,
      studyMinutes,
      heatmapData,
      dailyActivity,
      categoryBreakdown,
      progressData: progressData.slice(-40),
      totalReviews: allReviews.length,
      recentReviews: recentReviews.length,
      weeklyChange,
      thisWeekReviews,
      avgDailyReviews: Math.round((recentReviews.length / 30) * 10) / 10,
    };
  }, [memoryItems, categories]);

  const masteredItems = memoryItems.filter((item) => item.status === 'completed').length;
  const learningItems = memoryItems.filter((item) => item.status === 'active').length;
  const archivedItems = memoryItems.filter((item) => item.status === 'archived').length;
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked_at);

  const getHeatmapColor = (level: number) => {
    const colors = [
      'bg-remembra-bg-tertiary',
      'bg-remembra-accent-primary/25',
      'bg-remembra-accent-primary/45',
      'bg-remembra-accent-primary/65',
      'bg-remembra-accent-primary',
    ];
    return colors[level];
  };

  const formatStudyTime = () => (computedStats.studyMinutes < 60 ? `${computedStats.studyMinutes}m` : `${computedStats.studyHours}h`);

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-black flex flex-col animate-screen-enter">
      <header className="flex-shrink-0 px-4 sm:px-5 safe-top pb-4 bg-black/80 border-b border-white/[0.06] backdrop-blur-xl transition-smooth relative z-30 animate-slide-up">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-remembra-text-primary">Insights</h1>
            <p className="text-sm text-remembra-text-muted mt-0.5">See, You got this Far.</p>
          </div>
          <button
            onClick={() => setScreen('profile')}
            className="h-9 w-9 rounded-xl border border-white/10 bg-white/[0.04] flex items-center justify-center transition-colors hover:bg-white/[0.08] flex-shrink-0 tap-ripple press-glow"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            aria-label="Open settings"
          >
            <Settings size={18} className="text-remembra-text-muted" />
          </button>
        </div>
      </header>

      <div
        data-nav-scroll="true"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 custom-scrollbar fluid-scroll-zone smooth-scroll-content relative z-0"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
      >
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as StatsTab)} className="mx-auto w-full max-w-6xl safe-bottom-nav space-y-5">
          {/* Tab bar */}
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1">
            <TabsTrigger value="overview" className="rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-remembra-accent-primary data-[state=active]:text-white data-[state=active]:shadow-none">
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-remembra-accent-primary data-[state=active]:text-white data-[state=active]:shadow-none">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="achievements" className="rounded-xl py-2.5 text-sm font-medium data-[state=active]:bg-remembra-accent-primary data-[state=active]:text-white data-[state=active]:shadow-none">
              Badges
            </TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ── */}
          <TabsContent value="overview" className="mt-0 space-y-5">
            {/* Weekly hero */}
            <section className="widget-surface inertia-card smooth-surface stagger-enter liquid-glass rounded-3xl p-5 sm:p-6" style={{ animationDelay: '40ms' }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-wider text-remembra-text-muted mb-1">This Week</p>
                  <p className="text-4xl font-bold text-remembra-text-primary leading-none">{computedStats.thisWeekReviews}</p>
                  <p className="text-sm text-remembra-text-secondary mt-1.5">reviews completed</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    computedStats.weeklyChange > 0
                      ? 'bg-remembra-success/15 text-remembra-success'
                      : computedStats.weeklyChange < 0
                        ? 'bg-remembra-danger/15 text-remembra-danger'
                        : 'bg-white/8 text-remembra-text-secondary'
                  }`}>
                    {computedStats.weeklyChange > 0 ? '+' : ''}{computedStats.weeklyChange}% vs last week
                  </span>
                  <div className="flex gap-2 text-xs text-remembra-text-muted">
                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">
                      {computedStats.totalReviews} Total
                    </span>
                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">
                      {computedStats.avgDailyReviews}/Day avg
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* 4 stat chips */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="widget-surface inertia-card smooth-surface stagger-enter liquid-glass-soft rounded-2xl p-4" style={{ animationDelay: '80ms' }}>
                <div className="mb-2 flex items-center gap-2 text-remembra-text-muted">
                  <Flame size={15} className="text-orange-400" />
                  <span className="text-xs uppercase tracking-wide">Streak</span>
                </div>
                <p className="text-2xl font-bold text-remembra-text-primary">{profile?.streak_count || 0}</p>
                <p className="text-xs text-remembra-text-muted mt-0.5">days</p>
              </div>
              <div className="widget-surface inertia-card smooth-surface stagger-enter liquid-glass-soft rounded-2xl p-4" style={{ animationDelay: '120ms' }}>
                <div className="mb-2 flex items-center gap-2 text-remembra-text-muted">
                  <Brain size={15} className="text-remembra-accent-primary" />
                  <span className="text-xs uppercase tracking-wide">Mastered</span>
                </div>
                <p className="text-2xl font-bold text-remembra-text-primary">{masteredItems}</p>
                <p className="text-xs text-remembra-text-muted mt-0.5">items</p>
              </div>
              <div className="widget-surface inertia-card smooth-surface stagger-enter liquid-glass-soft rounded-2xl p-4" style={{ animationDelay: '160ms' }}>
                <div className="mb-2 flex items-center gap-2 text-remembra-text-muted">
                  <Target size={15} className="text-remembra-success" />
                  <span className="text-xs uppercase tracking-wide">Accuracy</span>
                </div>
                <p className="text-2xl font-bold text-remembra-text-primary">{computedStats.accuracy}%</p>
                <p className="text-xs text-remembra-text-muted mt-0.5">30-day</p>
              </div>
              <div className="widget-surface inertia-card smooth-surface stagger-enter liquid-glass-soft rounded-2xl p-4" style={{ animationDelay: '200ms' }}>
                <div className="mb-2 flex items-center gap-2 text-remembra-text-muted">
                  <Clock size={15} className="text-remembra-warning" />
                  <span className="text-xs uppercase tracking-wide">Study</span>
                </div>
                <p className="text-2xl font-bold text-remembra-text-primary">{formatStudyTime()}</p>
                <p className="text-xs text-remembra-text-muted mt-0.5">30-day</p>
              </div>
            </section>

            {/* Learning status bars */}
            <section className="widget-surface inertia-card smooth-surface stagger-enter liquid-glass-soft rounded-3xl p-5" style={{ animationDelay: '240ms' }}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-remembra-text-primary">Learning Status</h3>
                <span className="text-xs text-remembra-text-muted">{memoryItems.length} items total</span>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Learning', count: learningItems, color: 'bg-remembra-warning', icon: Zap, iconClass: 'text-remembra-warning' },
                  { label: 'Mastered', count: masteredItems, color: 'bg-remembra-success', icon: Award, iconClass: 'text-remembra-success' },
                  { label: 'Archived', count: archivedItems, color: 'bg-remembra-text-muted/60', icon: CalendarIcon, iconClass: 'text-remembra-text-muted' },
                ].map(({ label, count, color, icon: Icon, iconClass }) => (
                  <div key={label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm text-remembra-text-secondary flex items-center gap-2">
                        <Icon size={14} className={iconClass} />
                        {label}
                      </span>
                      <span className="text-sm font-semibold text-remembra-text-primary">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/40 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${color}`}
                        style={{ width: `${memoryItems.length ? (count / memoryItems.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Activity Heatmap — horizontally scrollable on mobile */}
            <section className="widget-surface inertia-card smooth-surface stagger-enter liquid-glass-soft rounded-3xl p-5" style={{ animationDelay: '280ms' }}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-remembra-text-primary">Activity</h3>
                <span className="text-xs text-remembra-text-muted">Last 12 weeks</span>
              </div>
              <div className="overflow-x-auto -mx-1 px-1 scrollbar-hide">
                <div className="grid gap-1 min-w-[520px]" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
                  {computedStats.heatmapData.map((day, index) => (
                    <div
                      key={index}
                      className={`aspect-square rounded-[3px] ${getHeatmapColor(day.level)}`}
                      title={`${day.date}: ${day.count} reviews`}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-1.5">
                <span className="text-[11px] text-remembra-text-muted">Less</span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <div key={level} className={`h-3 w-3 rounded-[3px] ${getHeatmapColor(level)}`} />
                ))}
                <span className="text-[11px] text-remembra-text-muted">More</span>
              </div>
            </section>

            {/* Recent badges */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-remembra-text-primary">Recent Badges</h3>
                <button
                  onClick={() => setActiveTab('achievements')}
                  className="text-sm text-remembra-accent-primary hover:text-remembra-accent-secondary transition-colors flex items-center gap-1"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  See all
                  <ChevronRight size={15} />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {unlockedAchievements.length > 0 ? unlockedAchievements.slice(0, 5).map((achievement) => (
                  <div key={achievement.id} className="liquid-glass-soft min-w-[7.5rem] rounded-2xl p-4 text-center flex-shrink-0">
                    <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-remembra-accent-primary to-remembra-accent-secondary">
                      <Award size={20} className="text-white" />
                    </div>
                    <p className="text-xs font-medium text-remembra-text-primary truncate">{achievement.name}</p>
                  </div>
                )) : (
                  <div className="liquid-glass-soft w-full rounded-2xl p-5 text-center text-sm text-remembra-text-muted">
                    Complete more reviews to unlock badges.
                  </div>
                )}
              </div>
            </section>
          </TabsContent>

          {/* ── ANALYTICS ── */}
          <TabsContent value="analytics" className="mt-0 space-y-5">
            {/* Charts row */}
            <section className="grid gap-4 lg:grid-cols-2">
              <div className="liquid-glass-soft rounded-3xl p-5 overflow-hidden">
                <h3 className="text-base font-semibold text-remembra-text-primary">Learning Progress</h3>
                <p className="text-xs text-remembra-text-muted mb-4 mt-0.5">Mastered items over time</p>
                <div className="h-48 sm:h-56 min-w-0">
                  {computedStats.progressData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={computedStats.progressData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="statsMasteredGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF8000" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#FF8000" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e28" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#555560"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          interval="preserveStartEnd"
                        />
                        <YAxis stroke="#555560" fontSize={10} tickLine={false} axisLine={false} width={28} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0e0e14', border: '1px solid #2b2b35', borderRadius: '12px', fontSize: '12px' }}
                          labelStyle={{ color: '#FAFAFA' }}
                        />
                        <Area type="monotone" dataKey="mastered" stroke="#FF8000" strokeWidth={2} fillOpacity={1} fill="url(#statsMasteredGradient)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-remembra-text-muted">
                      Add items to see progress.
                    </div>
                  )}
                </div>
              </div>

              <div className="liquid-glass-soft rounded-3xl p-5 overflow-hidden">
                <h3 className="text-base font-semibold text-remembra-text-primary">Weekly Activity</h3>
                <p className="text-xs text-remembra-text-muted mb-4 mt-0.5">Reviews in the last 7 days</p>
                <div className="h-48 sm:h-56 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={computedStats.dailyActivity} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e1e28" vertical={false} />
                      <XAxis dataKey="day" stroke="#555560" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#555560" fontSize={11} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0e0e14', border: '1px solid #2b2b35', borderRadius: '12px', fontSize: '12px' }}
                        formatter={(value: number) => [`${value} reviews`, 'Reviews']}
                      />
                      <Bar dataKey="count" fill="#FF8000" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* Category distribution */}
            <section className="liquid-glass-soft rounded-3xl p-5">
              <h3 className="text-base font-semibold text-remembra-text-primary">Category Distribution</h3>
              <p className="text-xs text-remembra-text-muted mb-5 mt-0.5">Reviews by category</p>
              {computedStats.categoryBreakdown.length > 0 ? (
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  <div className="w-full sm:w-[220px] flex-shrink-0 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={computedStats.categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={74}
                          paddingAngle={4}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {computedStats.categoryBreakdown.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0e0e14', border: '1px solid #2b2b35', borderRadius: '12px', fontSize: '12px', color: '#FAFAFA' }}
                          itemStyle={{ color: '#FAFAFA' }}
                          formatter={(value: number, _name: string, props: any) => [value, props.payload.name]}
                          labelStyle={{ color: '#FAFAFA' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                    {computedStats.categoryBreakdown.map((entry) => (
                      <div key={entry.name} className="rounded-xl border border-white/8 bg-black/25 p-3 flex items-center gap-2.5">
                        <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <div className="min-w-0">
                          <p className="text-sm text-remembra-text-primary truncate font-medium">{entry.name}</p>
                          <p className="text-xs text-remembra-text-muted">{entry.value} items</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center text-sm text-remembra-text-muted">
                  No categories data yet.
                </div>
              )}
            </section>

            {/* Summary chips */}
            <section className="grid gap-3 sm:grid-cols-3">
              <div className="liquid-glass-soft rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wider text-remembra-text-muted">30-Day Reviews</p>
                <p className="mt-2 text-2xl font-bold text-remembra-text-primary">{computedStats.recentReviews}</p>
              </div>
              <div className="liquid-glass-soft rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wider text-remembra-text-muted">Total Reviews</p>
                <p className="mt-2 text-2xl font-bold text-remembra-text-primary">{computedStats.totalReviews}</p>
              </div>
              <div className="liquid-glass-soft rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wider text-remembra-text-muted">Daily Average</p>
                <p className="mt-2 text-2xl font-bold text-remembra-text-primary">{computedStats.avgDailyReviews}</p>
              </div>
            </section>
          </TabsContent>

          {/* ── ACHIEVEMENTS ── */}
          <TabsContent value="achievements" className="mt-0 space-y-4">
            <section className="liquid-glass rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-wider text-remembra-text-muted mb-1">Unlocked</p>
                  <p className="text-4xl font-bold text-remembra-text-primary">{unlockedAchievements.length}</p>
                </div>
                <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs text-remembra-text-secondary">
                  {achievements.length} total tracks
                </span>
              </div>
            </section>

            <section className="space-y-3">
              {achievements.map((achievement) => {
                const isUnlocked = !!achievement.unlocked_at;
                const progressPercent = Math.max(0, Math.min(100, (achievement.progress / achievement.max_progress) * 100));

                return (
                  <div
                    key={achievement.id}
                    className={`liquid-glass-soft rounded-2xl p-4 transition-all ${
                      isUnlocked ? 'border border-remembra-accent-primary/25' : 'border border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`h-13 w-13 min-w-[3.25rem] rounded-2xl flex items-center justify-center ${
                        isUnlocked
                          ? 'bg-gradient-to-br from-remembra-accent-primary to-remembra-accent-secondary'
                          : 'bg-black/40 border border-white/8'
                      }`}>
                        <Award size={22} className={isUnlocked ? 'text-white' : 'text-remembra-text-muted'} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h4 className={`font-semibold text-sm ${isUnlocked ? 'text-remembra-text-primary' : 'text-remembra-text-secondary'}`}>
                            {achievement.name}
                          </h4>
                          {isUnlocked && (
                            <span className="rounded-full bg-remembra-success/15 px-2 py-0.5 text-[11px] font-medium text-remembra-success">
                              Unlocked
                            </span>
                          )}
                        </div>
                        <p className="mb-3 text-xs text-remembra-text-muted leading-relaxed">{achievement.description}</p>
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/40">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${isUnlocked ? 'bg-remembra-success' : 'bg-remembra-accent-primary'}`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-remembra-text-muted whitespace-nowrap">{achievement.progress}/{achievement.max_progress}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
