import { useState } from 'react';
import { mockStatsData, mockAchievements } from '@/data/mockData';
import { 
  Target, 
  Flame, 
  Award,
  ChevronRight,
  Brain,
  Clock
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function Stats() {
  const [activeTab, setActiveTab] = useState('overview');

  const generateHeatmapData = () => {
    const data = [];
    for (let i = 0; i < 84; i++) {
      const intensity = Math.random();
      let level = 0;
      if (intensity > 0.8) level = 4;
      else if (intensity > 0.6) level = 3;
      else if (intensity > 0.3) level = 2;
      else if (intensity > 0.1) level = 1;
      
      data.push({ level });
    }
    return data;
  };

  const heatmapData = generateHeatmapData();

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

  return (
    <div className="min-h-screen bg-remembra-bg-primary px-5 pt-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-remembra-text-primary mb-1">Insights</h1>
        <p className="text-remembra-text-muted">Track your learning progress</p>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-remembra-bg-secondary rounded-2xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Flame size={16} className="text-orange-500" />
                </div>
                <span className="text-xs text-remembra-text-muted">Current Streak</span>
              </div>
              <p className="text-2xl font-bold text-remembra-text-primary">
                {mockStatsData.current_streak} days
              </p>
              <p className="text-xs text-remembra-text-muted mt-1">
                Best: {mockStatsData.longest_streak} days
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
                {mockStatsData.mastered_items}
              </p>
              <p className="text-xs text-remembra-text-muted mt-1">
                of {mockStatsData.total_items} total
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
                {mockStatsData.average_accuracy}%
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
                24h
              </p>
              <p className="text-xs text-remembra-text-muted mt-1">
                This week
              </p>
            </div>
          </div>

          <div className="bg-remembra-bg-secondary rounded-2xl p-5 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-remembra-text-primary">Activity Heatmap</h3>
              <span className="text-xs text-remembra-text-muted">Last 12 weeks</span>
            </div>
            
            <div className="grid grid-cols-12 gap-1">
              {heatmapData.map((day, index) => (
                <div
                  key={index}
                  className={`aspect-square rounded-sm ${getHeatmapColor(day.level)}`}
                  title={`Activity level: ${day.level}`}
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
              {mockAchievements.filter(a => a.unlocked_at).slice(0, 3).map(achievement => (
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
            </div>
          </div>
        </TabsContent>

        <TabsContent value="charts" className="mt-0 space-y-6">
          <div className="bg-remembra-bg-secondary rounded-2xl p-5 border border-white/5">
            <h3 className="font-semibold text-remembra-text-primary mb-4">Memory Retention</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockStatsData.retention_curve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#22222E" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#71717A" 
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#71717A" 
                    fontSize={12}
                    tickLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1A1A24', 
                      border: '1px solid #22222E',
                      borderRadius: '12px'
                    }}
                    labelStyle={{ color: '#FAFAFA' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="retention" 
                    stroke="#6366F1" 
                    strokeWidth={3}
                    dot={{ fill: '#6366F1', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: '#8B5CF6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-remembra-bg-secondary rounded-2xl p-5 border border-white/5">
            <h3 className="font-semibold text-remembra-text-primary mb-4">Time by Category</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockStatsData.category_breakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="time_spent"
                  >
                    {mockStatsData.category_breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1A1A24', 
                      border: '1px solid #22222E',
                      borderRadius: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-4">
              {mockStatsData.category_breakdown.map((cat) => (
                <div key={cat.category} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-xs text-remembra-text-secondary">{cat.category}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-remembra-bg-secondary rounded-2xl p-5 border border-white/5">
            <h3 className="font-semibold text-remembra-text-primary mb-4">Weekly Activity</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockStatsData.daily_activity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#22222E" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#71717A" 
                    fontSize={12}
                    tickLine={false}
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
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#6366F1" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="mt-0 space-y-4">
          {mockAchievements.map((achievement) => {
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
