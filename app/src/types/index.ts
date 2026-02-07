// Remembra Type Definitions

export type ContentType = 'text' | 'code' | 'image' | 'document' | 'mixed';
export type ReviewStatus = 'active' | 'completed' | 'archived';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Performance = 'again' | 'hard' | 'good' | 'easy';

// ─── SM-2 Spaced Repetition Engine ───
// Quality mapping: user rating → SM-2 quality score (0-5)
export const QUALITY_MAP: Record<Performance, number> = {
  again: 1,   // Complete blackout / forgot
  hard: 3,    // Recalled with significant difficulty
  good: 4,    // Recalled with some effort — normal progression
  easy: 5,    // Effortless, instant recall
};

// Items with interval > this auto-graduate to 'completed'
export const GRADUATION_THRESHOLD_DAYS = 365;

// Lifecycle config
export const LIFECYCLE_CONFIG = {
  archiveAfterDays: 30,   // Archive completed items after 30 days
  deleteAfterDays: 90,    // Delete archived items after 90 days
};

// Legacy template compat
export interface ReviewTemplate { name: string; intervals: number[] }
export const DEFAULT_REVIEW_TEMPLATE: ReviewTemplate = { name: 'sm2', intervals: [1, 6, 15] };
export const REVIEW_TEMPLATES: Record<string, ReviewTemplate> = {
  'sm2': { name: 'SM-2 Adaptive', intervals: [1, 6, 15] },
  '1-4-7': { name: '1-4-7 Classic', intervals: [1, 4, 7] },
};

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
  stage_index?: number;            // legacy compat
  interval?: number;               // interval computed at this review
  easiness_factor?: number;        // EF snapshot at time of review
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
  // ─── SM-2 Adaptive Scheduling ───
  easiness_factor: number;         // EF, starts at 2.5, min 1.3
  interval: number;                // current interval in days (0 = new item)
  repetition: number;              // consecutive correct recalls
  lapse_count: number;             // total times forgotten (quality < 3)
  next_review_date: string;        // ISO date
  last_reviewed_at?: string;       // timestamp of last review
  // ─── Review Data ───
  review_history: ReviewHistory[];
  // ─── Legacy compat (mapped from SM-2 fields) ───
  review_template: string;
  current_stage_index: number;     // = repetition
  review_stage: number;            // = repetition
  // ─── Lifecycle ───
  completed_at?: string;
  archive_at?: string;
  delete_at?: string;
  // ─── AI & Notes ───
  ai_summary?: string;
  ai_flowchart?: string;
  ai_bullet_points?: string[];
  notes?: string;
  is_bookmarked?: boolean;
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

// ─── SM-2 Spaced Repetition Algorithm ───
// Based on SuperMemo SM-2. Adapts intervals to individual memory strength.

/**
 * Core SM-2 computation.
 * Given quality of recall (0-5) and current card state, returns next state.
 */
export function sm2Algorithm(
  quality: number,
  repetition: number,
  easinessFactor: number,
  currentInterval: number,
): { repetition: number; easinessFactor: number; interval: number } {
  let newRepetition: number;
  let newInterval: number;

  if (quality >= 3) {
    // Successful recall — grow interval
    if (repetition === 0) newInterval = 1;
    else if (repetition === 1) newInterval = 6;
    else newInterval = Math.round(currentInterval * easinessFactor);
    newRepetition = repetition + 1;
  } else {
    // Failed recall — lapse, reset
    newRepetition = 0;
    newInterval = 1;
  }

  // Update easiness factor (never below 1.3)
  const newEF = Math.max(
    1.3,
    easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  return {
    repetition: newRepetition,
    easinessFactor: Math.round(newEF * 100) / 100,
    interval: Math.max(1, newInterval),
  };
}

/**
 * Process a review completion using SM-2.
 * Returns all data needed to update the item and schedule next review.
 */
export function processReviewCompletion(
  item: MemoryItem,
  performance: Performance,
): {
  repetition: number;
  easinessFactor: number;
  interval: number;
  nextReviewDate: string;
  nextStatus: ReviewStatus;
  isLapse: boolean;
  newLapseCount: number;
  isLeech: boolean;
  isGraduated: boolean;
  completedAt?: string;
  archiveAt?: string;
  deleteAt?: string;
} {
  const quality = QUALITY_MAP[performance];
  const result = sm2Algorithm(
    quality,
    item.repetition,
    item.easiness_factor,
    item.interval,
  );

  const isLapse = quality < 3;
  const newLapseCount = isLapse ? item.lapse_count + 1 : item.lapse_count;
  const isLeech = newLapseCount >= 4 && item.review_history.length >= 8;
  const isGraduated = result.interval >= GRADUATION_THRESHOLD_DAYS;

  // Calculate next review date
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + result.interval);
  const nextReviewDate = nextDate.toISOString().split('T')[0];

  if (isGraduated) {
    // Auto-complete: interval exceeds graduation threshold
    const now = new Date();
    const archiveDate = new Date(now);
    archiveDate.setDate(archiveDate.getDate() + LIFECYCLE_CONFIG.archiveAfterDays);
    const deleteDate = new Date(now);
    deleteDate.setDate(deleteDate.getDate() + LIFECYCLE_CONFIG.deleteAfterDays);
    return {
      ...result,
      nextReviewDate: '',
      nextStatus: 'completed',
      isLapse,
      newLapseCount,
      isLeech,
      isGraduated: true,
      completedAt: now.toISOString(),
      archiveAt: archiveDate.toISOString().split('T')[0],
      deleteAt: deleteDate.toISOString().split('T')[0],
    };
  }

  return {
    ...result,
    nextReviewDate,
    nextStatus: 'active',
    isLapse,
    newLapseCount,
    isLeech,
    isGraduated: false,
  };
}

/**
 * Smart priority score for queue ordering.
 * Higher = more urgent to review.
 */
export function calculatePriority(item: MemoryItem): number {
  if (item.status !== 'active' || !item.next_review_date) return -1;

  const today = new Date();
  const due = new Date(item.next_review_date + 'T00:00:00');
  const daysDiff = (today.getTime() - due.getTime()) / 86400000;

  const overdueFactor = Math.max(0, daysDiff + 1);
  const diffMult = item.difficulty === 'hard' ? 1.4 : item.difficulty === 'medium' ? 1.1 : 0.9;
  const lapseBoost = 1 + item.lapse_count * 0.15;
  const efBoost = item.easiness_factor < 2.0 ? 1.3 : 1.0;

  return overdueFactor * diffMult * lapseBoost * efBoost;
}

/**
 * Estimate current memory retention using the forgetting curve.
 * R = e^(-t/S) where t = days since last review, S = stability
 */
export function estimateRetention(item: MemoryItem): number {
  const lastReview = item.last_reviewed_at || item.created_at;
  if (!lastReview) return 100;

  const daysSince = (Date.now() - new Date(lastReview).getTime()) / 86400000;
  if (daysSince < 0) return 100;

  const stability = Math.max(1, item.interval * (item.easiness_factor / 2.5));
  const retention = Math.exp(-daysSince / stability) * 100;

  return Math.round(Math.max(0, Math.min(100, retention)));
}

/**
 * Get predicted intervals for each rating option.
 * Powers the smart rating buttons showing exact consequences of each choice.
 */
export function getPredictedIntervals(item: MemoryItem): {
  performance: Performance;
  label: string;
  color: string;
  interval: number;
  nextDate: string;
  emoji: string;
}[] {
  const configs: { perf: Performance; label: string; color: string; emoji: string }[] = [
    { perf: 'again', label: 'Again', color: '#EF4444', emoji: '🔄' },
    { perf: 'hard', label: 'Hard', color: '#F59E0B', emoji: '😤' },
    { perf: 'good', label: 'Good', color: '#6366F1', emoji: '👍' },
    { perf: 'easy', label: 'Easy', color: '#10B981', emoji: '⚡' },
  ];

  return configs.map(({ perf, label, color, emoji }) => {
    const quality = QUALITY_MAP[perf];
    const result = sm2Algorithm(quality, item.repetition, item.easiness_factor, item.interval);
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + result.interval);
    return { performance: perf, label, color, interval: result.interval, nextDate: nextDate.toISOString().split('T')[0], emoji };
  });
}

/** Format days as compact human-readable interval */
export function formatInterval(days: number): string {
  if (days === 0) return 'Now';
  if (days === 1) return '1d';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.round(days / 7)}w`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

/** Format date as short readable (Feb 12) */
export function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Legacy Compat ───

export function calculateNextReviewDate(
  createdAt: string,
  template: ReviewTemplate,
  stageIndex: number,
): string {
  const interval = template.intervals[stageIndex];
  if (interval === undefined) return '';
  const base = new Date(createdAt);
  base.setDate(base.getDate() + interval);
  return base.toISOString().split('T')[0];
}

export function getReviewStatus(item: MemoryItem): 'pending' | 'overdue' | 'completed' {
  if (item.status === 'completed' || item.status === 'archived') return 'completed';
  const today = new Date().toISOString().split('T')[0];
  if (!item.next_review_date) return 'completed';
  if (item.next_review_date < today) return 'overdue';
  if (item.next_review_date === today) return 'pending';
  return 'completed';
}

export function getStageLabel(template: ReviewTemplate, stageIndex: number): string {
  if (stageIndex >= template.intervals.length) return 'Completed';
  return `Day ${template.intervals[stageIndex]}`;
}

export const DIFFICULTY_WEIGHTS: Record<Performance, number> = {
  again: 0,
  hard: 0.8,
  good: 1.0,
  easy: 1.3,
};

export function getRatingButtons(item: MemoryItem) {
  return getPredictedIntervals(item).map(p => ({
    label: p.label,
    color: p.color,
    interval: formatInterval(p.interval),
    performance: p.performance,
  }));
}

export const REVIEW_INTERVALS = [1, 4, 7];
export const RATING_BUTTONS = [
  { label: 'Again', color: '#EF4444', interval: '1 day', performance: 'again' as Performance },
  { label: 'Hard', color: '#F59E0B', interval: 'Adaptive', performance: 'hard' as Performance },
  { label: 'Good', color: '#6366F1', interval: 'Adaptive', performance: 'good' as Performance },
  { label: 'Easy', color: '#10B981', interval: 'Adaptive', performance: 'easy' as Performance },
];
