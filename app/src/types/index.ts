// Remembra Type Definitions

export type ContentType = 'text' | 'code' | 'image' | 'document' | 'mixed';
export type ReviewStatus = 'learning' | 'reviewing' | 'mastered' | 'archived';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Performance = 'again' | 'hard' | 'medium' | 'easy';

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  timezone: string;
  notification_preferences: NotificationPreferences;
  streak_count: number;
  total_reviews: number;
  created_at: string;
}

export interface NotificationPreferences {
  daily_reminder: boolean;
  reminder_time: string;
  streak_reminder: boolean;
  achievement_notifications: boolean;
  ai_insights: boolean;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  order_index: number;
  is_default: boolean;
  created_at: string;
}

export interface Attachment {
  type: ContentType;
  url: string;
  name: string;
  size?: number;
}

export interface ReviewHistory {
  date: string;
  performance: Performance;
  time_spent_seconds: number;
}

export interface MemoryItem {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  content: string;
  content_type: ContentType;
  attachments: Attachment[];
  difficulty: Difficulty;
  status: ReviewStatus;
  next_review_date: string;
  review_stage: number;
  review_history: ReviewHistory[];
  ai_summary?: string;
  ai_flowchart?: string;
  ai_bullet_points?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  memory_item_id: string;
  scheduled_date: string;
  completed_date?: string;
  performance?: Performance;
  time_spent_seconds?: number;
  notes?: string;
}

export interface StreakEntry {
  id: string;
  user_id: string;
  date: string;
  reviews_completed: number;
  streak_broken: boolean;
}

export interface DaySchedule {
  date: string;
  reviews_due: number;
  reviews_completed: number;
  items: MemoryItem[];
}

export interface DailyReview {
  id: string;
  memory_item_id: string;
  scheduled_date: string;
  completed_at?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  performance?: Performance;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked_at?: string;
  progress: number;
  max_progress: number;
}

export interface AITool {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

export interface StatsData {
  retention_curve: { date: string; retention: number }[];
  category_breakdown: { category: string; time_spent: number; color: string }[];
  daily_activity: { date: string; count: number }[];
  total_items: number;
  mastered_items: number;
  current_streak: number;
  longest_streak: number;
  average_accuracy: number;
}

// Review intervals for 1-4-7 system (in days)
export const REVIEW_INTERVALS = [1, 4, 7, 30, 90];

// Calculate next review date based on current stage and performance
export function calculateNextReviewDate(currentStage: number, performance: Performance, currentDate: Date = new Date()): { nextDate: string; nextStage: number } {
  let nextStage = currentStage;
  
  // Adjust stage based on performance
  if (performance === 'again') {
    nextStage = 0; // Reset to beginning
  } else if (performance === 'hard') {
    nextStage = Math.max(0, currentStage); // Stay at same stage
  } else if (performance === 'medium') {
    nextStage = Math.min(currentStage + 1, REVIEW_INTERVALS.length - 1);
  } else if (performance === 'easy') {
    nextStage = Math.min(currentStage + 2, REVIEW_INTERVALS.length - 1);
  }
  
  const daysToAdd = REVIEW_INTERVALS[nextStage];
  const nextDate = new Date(currentDate);
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  
  return {
    nextDate: nextDate.toISOString().split('T')[0],
    nextStage
  };
}

// Get review status based on item
export function getReviewStatus(item: MemoryItem): 'pending' | 'overdue' | 'completed' {
  const today = new Date().toISOString().split('T')[0];
  const reviewDate = item.next_review_date;
  
  if (reviewDate < today) return 'overdue';
  if (reviewDate === today) return 'pending';
  return 'completed';
}

// Review intervals for 1-4-7 system
// export const REVIEW_INTERVALS = [1, 4, 7, 30, 90];

// Difficulty weights for adaptive algorithm
export const DIFFICULTY_WEIGHTS: Record<Performance, number> = {
  again: 0,
  hard: 0.8,
  medium: 1.0,
  easy: 1.3,
};

// Rating button configurations
export const RATING_BUTTONS: { label: string; color: string; interval: string; performance: Performance }[] = [
  { label: 'Again', color: '#EF4444', interval: '1 min', performance: 'again' },
  { label: 'Hard', color: '#F59E0B', interval: '10 min', performance: 'hard' },
  { label: 'Good', color: '#6366F1', interval: '1 day', performance: 'medium' },
  { label: 'Easy', color: '#10B981', interval: '4 days', performance: 'easy' },
];
