import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { 
  Target, 
  Flame, 
  Award,
  ChevronRight,
  Brain,
  Clock,
  Settings,
  TrendingUp,
  Calendar as CalendarIcon,
  Zap
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
  Area
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function Stats() {
  const { profile, memoryItems, categories, achievements, setScreen } = useStore();
  const [activeTab, setActiveTab] = useState('overview');

  // Compute real stats from review history
  const computedStats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Collect all review history entries
    const allReviews = memoryItems.flatMap(item => 
      (item.review_history || []).map(review => ({
        ...review,
        itemId: item.id,
        itemTitle: item.title,
        categoryId: item.category_id
      }))
    );

    // Reviews in last 30 days
    const recentReviews = allReviews.filter(r => 
      new Date(r.date) >= thirtyDaysAgo
    );

    // Calculate accuracy from performance
    const goodReviews = recentReviews.filter(r => 
      r.performance === 'good' || r.performance === 'easy'
    ).length;
    const accuracy = recentReviews.length > 0 
      ? Math.round((goodReviews / recentReviews.length) * 100) 
      : 0;

    // Calculate total study time (in hours)
    const totalSeconds = recentReviews.reduce((sum, r) => 
      sum + (r.time_spent_seconds || 0), 0
    );
    const studyHours = Math.round(totalSeconds / 3600 * 10) / 10;
    const studyMinutes = Math.round(totalSeconds / 60);

    // Generate heatmap data for last 84 days (12 weeks)
    const heatmapData = [];
    const reviewsByDate = new Map<string, number>();
    allReviews.forEach(r => {
      const date = r.date;
      reviewsByDate.set(date, (reviewsByDate.get(date) || 0) + 1);
    });
    
    // Find max reviews per day for scaling
    const maxReviews = Math.max(1, ...Array.from(reviewsByDate.values()));
    
    for (let i = 83; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = reviewsByDate.get(dateStr) || 0;
      
      // Calculate level based on review count
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
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' })
      });
    }

    // Weekly activity (last 7 days)
    const dailyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = reviewsByDate.get(dateStr) || 0;
      dailyActivity.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: dateStr,
        count
      });
    }

    // Items per category (for pie chart)
    const categoryBreakdown = categories.map(c => ({
      name: c.name,
      value: memoryItems.filter(i => i.category_id === c.id).length,
      color: c.color
    })).filter(c => c.value > 0);

    // Review progress over time (cumulative mastered items by date)
    const progressData: { date: string; mastered: number; total: number }[] = [];
    const sortedItems = [...memoryItems].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    let masteredCount = 0;
    const seenDates = new Set<string>();
    sortedItems.forEach(item => {
      const date = new Date(item.created_at).toISOString().split('T')[0];
      if (item.status === 'completed') masteredCount++;
      if (!seenDates.has(date)) {
        seenDates.add(date);
        progressData.push({ date, mastered: masteredCount, total: sortedItems.indexOf(item) + 1 });
      }
    });

    // Recent week stats comparison
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const thisWeekReviews = allReviews.filter(r => new Date(r.date) >= lastWeekStart).length;
    const lastWeekReviews = allReviews.filter(r => {
      const d = new Date(r.date);
      return d >= twoWeeksAgo && d < lastWeekStart;
    }).length;
    
    const weeklyChange = lastWeekReviews > 0 
      ? Math.round(((thisWeekReviews - lastWeekReviews) / lastWeekReviews) * 100)
      : thisWeekReviews > 0 ? 100 : 0;

    return {
      accuracy,
      studyHours,
      studyMinutes,
      heatmapData,
      dailyActivity,
      categoryBreakdown,
      progressData: progressData.slice(-30), // Last 30 data points
      totalReviews: allReviews.length,
      recentReviews: recentReviews.length,
      weeklyChange,
      thisWeekReviews,
      avgDailyReviews: Math.round(recentReviews.length / 30 * 10) / 10
    };
  }, [memoryItems, categories]);

  const masteredItems = memoryItems.filter(i => i.status === 'completed').length;
  const learningItems = memoryItems.filter(i => i.status === 'active').length;
  const archivedItems = memoryItems.filter(i => i.status === 'archived').length;

  const getHeatmapColor = (level: number) => {
    const colors = [
      'bg-remembra-bg-tertiary',
      'bg-remembra-accent-primary/20',
      'bg-remembra-accent-primary/40',
      'bg-remembra-accent-primary/60',
      'bg-remembra-accent-primary',
    ];
    return colors[level];
  };

  const formatStudyTime = () => {
    if (computedStats.studyMinutes < 60) {
      return `${computedStats.studyMinutes}m`;
    }
    return `${computedStats.studyHours}h`;
  };

  return (
    <div className="bg-black lined-bg-subtle px-5 pt-6 pb-8">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-remembra-text-primary mb-1">Insights</h1>
          <p className="text-remembra-text-muted">Track your learning progress</p>
        </div>
        <button
          onClick={() => setScreen('profile')}
          className="w-10 h-10 rounded-xl bg-remembra-bg-secondary border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <Settings size={20} className="text-remembra-text-muted" />
        </button>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-remembra-bg-secondary mb-6">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-remembra-accent-primary data-[state=active]:text-white"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="charts"
            className="data-[state=active]:bg-remembra-accent-primary data-[state=active]:text-white"
          >
            Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="achievements"
            className="data-[state=active]:bg-remembra-accent-primary data-[state=active]:text-white"
          >
            Badges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-6">
          {/* Summary Stats Row */}
          <div className="bg-gradient-to-r from-remembra-accent-primary/20 to-remembra-accent-secondary/20 rounded-2xl p-4 border border-remembra-accent-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-remembra-accent-primary/30 flex items-center justify-center">
                  <TrendingUp size={24} className="text-remembra-accent-primary" />
                </div>
                <div>
                  <p className="text-sm text-remembra-text-muted">This Week</p>
                  <p className="text-2xl font-bold text-remembra-text-primary">{computedStats.thisWeekReviews} reviews</p>
                </div>
              </div>
              {computedStats.weeklyChange !== 0 && (
                <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  computedStats.weeklyChange > 0 
                    ? 'bg-remembra-success/20 text-remembra-success' 
                    : 'bg-remembra-error/20 text-remembra-error'
                }`}>
                  {computedStats.weeklyChange > 0 ? '+' : ''}{computedStats.weeklyChange}%
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Flame size={16} className="text-orange-500" />
                </div>
                <span className="text-xs text-remembra-text-muted">Current Streak</span>
              </div>
              <p className="text-2xl font-bold text-remembra-text-primary">
                {profile?.streak_count || 0} days
              </p>
              <p className="text-xs text-remembra-text-muted mt-1">
                {computedStats.totalReviews} total reviews
              </p>
            </div>

            <div className="bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-remembra-accent-primary/20 flex items-center justify-center">
                  <Brain size={16} className="text-remembra-accent-primary" />
                </div>
                <span className="text-xs text-remembra-text-muted">Items Mastered</span>
              </div>
              <p className="text-2xl font-bold text-remembra-text-primary">
                {masteredItems}
              </p>
              <p className="text-xs text-remembra-text-muted mt-1">
                of {memoryItems.length} total
              </p>
            </div>

            <div className="bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-remembra-success/20 flex items-center justify-center">
                  <Target size={16} className="text-remembra-success" />
                </div>
                <span className="text-xs text-remembra-text-muted">Accuracy</span>
              </div>
              <p className="text-2xl font-bold text-remembra-text-primary">
                {computedStats.accuracy}%
              </p>
              <p className="text-xs text-remembra-text-muted mt-1">
                Last 30 days
              </p>
            </div>

            <div className="bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-remembra-warning/20 flex items-center justify-center">
                  <Clock size={16} className="text-remembra-warning" />
                </div>
                <span className="text-xs text-remembra-text-muted">Study Time</span>
              </div>
              <p className="text-2xl font-bold text-remembra-text-primary">
                {formatStudyTime()}
              </p>
              <p className="text-xs text-remembra-text-muted mt-1">
                Last 30 days
              </p>
            </div>
          </div>

          {/* Learning Status */}
          <div className="bg-remembra-bg-secondary rounded-2xl p-5 border border-white/5">
            <h3 className="font-semibold text-remembra-text-primary mb-4">Learning Status</h3>
            <div className="flex gap-3">
              <div className="flex-1 bg-remembra-bg-tertiary rounded-xl p-3 text-center">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
                  <Zap size={16} className="text-blue-500" />
                </div>
                <p className="text-lg font-bold text-remembra-text-primary">{learningItems}</p>
                <p className="text-[10px] text-remembra-text-muted">Learning</p>
              </div>
              <div className="flex-1 bg-remembra-bg-tertiary rounded-xl p-3 text-center">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                  <CalendarIcon size={16} className="text-purple-500" />
                </div>
                <p className="text-lg font-bold text-remembra-text-primary">{archivedItems}</p>
                <p className="text-[10px] text-remembra-text-muted">Archived</p>
              </div>
              <div className="flex-1 bg-remembra-bg-tertiary rounded-xl p-3 text-center">
                <div className="w-8 h-8 rounded-full bg-remembra-success/20 flex items-center justify-center mx-auto mb-2">
                  <Award size={16} className="text-remembra-success" />
                </div>
                <p className="text-lg font-bold text-remembra-text-primary">{masteredItems}</p>
                <p className="text-[10px] text-remembra-text-muted">Mastered</p>
              </div>
            </div>
          </div>

          <div className="bg-remembra-bg-secondary rounded-2xl p-5 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-remembra-text-primary">Activity Heatmap</h3>
              <span className="text-xs text-remembra-text-muted">Last 12 weeks</span>
            </div>
            
            <div className="grid grid-cols-12 gap-1">
              {computedStats.heatmapData.map((day, index) => (
                <div
                  key={index}
                  className={`aspect-square rounded-sm ${getHeatmapColor(day.level)} cursor-default`}
                  title={`${day.date}: ${day.count} reviews`}
                />
              ))}
            </div>
            
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-xs text-remembra-text-muted">Less</span>
              {[0, 1, 2, 3, 4].map(level => (
                <div 
                  key={level}
                  className={`w-3 h-3 rounded-sm ${getHeatmapColor(level)}`}
                />
              ))}
              <span className="text-xs text-remembra-text-muted">More</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-remembra-text-primary">Recent Badges</h3>
              <button 
                onClick={() => setActiveTab('achievements')}
                className="text-sm text-remembra-accent-primary hover:text-remembra-accent-secondary transition-colors flex items-center"
              >
                See all
                <ChevronRight size={16} />
              </button>
            </div>
            
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {achievements.filter(a => a.unlocked_at).slice(0, 3).map(achievement => (
                <div 
                  key={achievement.id}
                  className="flex-shrink-0 w-24 bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-remembra-accent-primary to-remembra-accent-secondary flex items-center justify-center mx-auto mb-2">
                    <Award size={24} className="text-white" />
                  </div>
                  <p className="text-xs font-medium text-remembra-text-primary truncate">
                    {achievement.name}
                  </p>
                </div>
              ))}
              {achievements.filter(a => a.unlocked_at).length === 0 && (
                <div className="flex-1 text-center py-6">
                  <p className="text-sm text-remembra-text-muted">Complete reviews to earn badges</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="charts" className="mt-0 space-y-6">
          <div className="bg-remembra-bg-secondary rounded-2xl p-5 border border-white/5">
            <h3 className="font-semibold text-remembra-text-primary mb-4">Learning Progress</h3>
            <div className="h-48">
              {computedStats.progressData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={computedStats.progressData}>
                    <defs>
                      <linearGradient id="colorMastered" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF8000" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#FF8000" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#22222E" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#71717A" 
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                      stroke="#71717A" 
                      fontSize={12}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1A1A24', 
                        border: '1px solid #22222E',
                        borderRadius: '12px'
                      }}
                      labelStyle={{ color: '#FAFAFA' }}
                      formatter={(value: number, name: string) => [value, name === 'mastered' ? 'Mastered' : 'Total']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="mastered" 
                      stroke="#FF8000" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorMastered)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-remembra-text-muted">Add items to see progress</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-remembra-bg-secondary rounded-2xl p-5 border border-white/5">
            <h3 className="font-semibold text-remembra-text-primary mb-4">Items by Category</h3>
            <div className="h-48">
              {computedStats.categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={computedStats.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {computedStats.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1A1A24', 
                        border: '1px solid #22222E',
                        borderRadius: '12px'
                      }}
                      formatter={(value: number, _name: string, props: any) => [value, props.payload.name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-remembra-text-muted">No items yet</p>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3 mt-4">
              {computedStats.categoryBreakdown.map((cat) => (
                <div key={cat.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-xs text-remembra-text-secondary">{cat.name} ({cat.value})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-remembra-bg-secondary rounded-2xl p-5 border border-white/5">
            <h3 className="font-semibold text-remembra-text-primary mb-4">Weekly Activity</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={computedStats.dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#22222E" vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    stroke="#71717A" 
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#71717A" 
                    fontSize={12}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1A1A24', 
                      border: '1px solid #22222E',
                      borderRadius: '12px'
                    }}
                    formatter={(value: number) => [`${value} reviews`, 'Reviews']}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#FF8000" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="mt-0 space-y-4">
          {achievements.map((achievement) => {
            const isUnlocked = !!achievement.unlocked_at;
            const progressPercent = (achievement.progress / achievement.max_progress) * 100;
            
            return (
              <div 
                key={achievement.id}
                className={`
                  bg-remembra-bg-secondary rounded-2xl p-4 border transition-all
                  ${isUnlocked 
                    ? 'border-remembra-accent-primary/30' 
                    : 'border-white/5'
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0
                    ${isUnlocked 
                      ? 'bg-gradient-to-br from-remembra-accent-primary to-remembra-accent-secondary' 
                      : 'bg-remembra-bg-tertiary'
                    }
                  `}>
                    <Award size={24} className={isUnlocked ? 'text-white' : 'text-remembra-text-muted'} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold ${isUnlocked ? 'text-remembra-text-primary' : 'text-remembra-text-muted'}`}>
                        {achievement.name}
                      </h4>
                      {isUnlocked && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-remembra-success/20 text-remembra-success">
                          Unlocked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-remembra-text-muted mb-2">
                      {achievement.description}
                    </p>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-remembra-bg-tertiary rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            isUnlocked ? 'bg-remembra-success' : 'bg-remembra-accent-primary'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-xs text-remembra-text-muted">
                        {achievement.progress}/{achievement.max_progress}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
