import type { Category, MemoryItem, Achievement, AITool, DaySchedule, StatsData, Profile } from '@/types';

// Default profile for new/unauthenticated users
export const mockProfile: Profile = {
  id: '',
  username: 'Guest',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  notification_preferences: {
    daily_reminder: true,
    reminder_time: '09:00',
    streak_reminder: true,
    achievement_notifications: true,
    ai_insights: true,
  },
  streak_count: 0,
  total_reviews: 0,
  created_at: new Date().toISOString(),
};

// Empty defaults - real data comes from Supabase
export const mockCategories: Category[] = [];
export const mockMemoryItems: MemoryItem[] = [];
export const mockAchievements: Achievement[] = [];

// AI Tools configuration - used for AI Studio screen
export const mockAITools: AITool[] = [
  { id: 'summarizer', name: 'Smart Summary', description: 'Generate concise bullet points from any content', icon: 'file-text', color: '#FF8000' },
  { id: 'flowchart', name: 'Visual Mapper', description: 'Create interactive flowcharts from text', icon: 'git-branch', color: '#FF6B00' },
  { id: 'quiz', name: 'Quiz Generator', description: 'Generate practice questions automatically', icon: 'help-circle', color: '#00D26A' },
  { id: 'memory-palace', name: 'Memory Palace', description: 'Create visual memory journeys', icon: 'home', color: '#FFB800' },
  { id: 'chat', name: 'Study Buddy', description: 'AI tutor for your learning materials', icon: 'message-circle', color: '#FF4500' },
];

// Generate empty calendar data
export const generateCalendarData = (): DaySchedule[] => {
  const data: DaySchedule[] = [];
  const today = new Date();
  
  for (let i = -7; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    data.push({
      date: dateStr,
      reviews_due: 0,
      reviews_completed: 0,
      items: [],
    });
  }
  
  return data;
};

export const mockCalendarData = generateCalendarData();

// Empty stats
export const mockStatsData: StatsData = {
  retention_curve: [],
  category_breakdown: [],
  daily_activity: [],
  total_items: 0,
  mastered_items: 0,
  current_streak: 0,
  longest_streak: 0,
  average_accuracy: 0,
};

// Helper functions
export const getCategoryById = (id: string): Category | undefined => {
  return mockCategories.find(c => c.id === id);
};

export const getItemsDueToday = (): MemoryItem[] => {
  const today = new Date().toISOString().split('T')[0];
  return mockMemoryItems.filter(item => item.next_review_date === today);
};

export const getItemsByCategory = (categoryId: string): MemoryItem[] => {
  return mockMemoryItems.filter(item => item.category_id === categoryId);
};

export const getItemsByStatus = (status: string): MemoryItem[] => {
  return mockMemoryItems.filter(item => item.status === status);
};
