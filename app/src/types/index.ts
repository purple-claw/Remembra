import {
  DECISION_STAGE,
  MASTERED_STAGE,
  MAX_ACTIVE_STAGE,
  OPTIONAL_REVIEW_DAY_30,
  REVIEW_INTERVALS_147,
  THIRTY_DAY_STAGE,
  getCurrentIntervalForStage,
  getScheduledDateForStage,
  performanceToOutcome,
  process147Review,
  toIsoDate,
} from '@/domain/review147';

// Remembra Type Definitions

export type ContentType = 'text' | 'code' | 'image' | 'document' | 'mixed';
export type ReviewStatus = 'active' | 'completed' | 'archived';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Performance = 'again' | 'hard' | 'good' | 'easy';
export type ScheduleType = 'spaced' | 'recurring';
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly';

// ─── Pure 1-4-7 Retention Model ───
// pass/fail mapping only: good/easy => pass, again/hard => fail
export const QUALITY_MAP: Record<Performance, number> = {
  again: 0,
  hard: 0,
  good: 1,
  easy: 1,
};

export const LIFECYCLE_CONFIG = {
  // Auto-deletion is disabled; items remain until explicitly deleted by the user.
  deleteAfterMasteredDays: 0,
};

export const GRADUATION_THRESHOLD_DAYS = REVIEW_INTERVALS_147[REVIEW_INTERVALS_147.length - 1];

// Template compatibility
export interface ReviewTemplate { name: string; intervals: number[] }
export const DEFAULT_REVIEW_TEMPLATE: ReviewTemplate = { name: '1-4-7-30', intervals: [...REVIEW_INTERVALS_147, OPTIONAL_REVIEW_DAY_30] };
export const REVIEW_TEMPLATES: Record<string, ReviewTemplate> = {
  '1-4-7': { name: '1-4-7-30 Classic', intervals: [...REVIEW_INTERVALS_147, OPTIONAL_REVIEW_DAY_30] },
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
  path?: string;
  bucket?: string;
  mime_type?: string;
}

export interface ReviewHistory {
  date: string;
  performance: Performance;
  time_spent_seconds: number;
  stage_index?: number;
  interval?: number;
  easiness_factor?: number;
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
  schedule_type?: ScheduleType;
  recurring_frequency?: RecurringFrequency;
  // ─── 1-4-7 Scheduling State ───
  easiness_factor: number;         // compatibility field
  interval: number;                // next target interval in days
  repetition: number;              // mirrors review_stage
  lapse_count: number;
  next_review_date: string;
  cycle_started_at?: string;
  last_reviewed_at?: string;
  // ─── Review Data ───
  review_history: ReviewHistory[];
  // ─── Legacy compat ───
  review_template: string;
  current_stage_index: number;
  review_stage: number;
  // ─── Lifecycle ───
  completed_at?: string;
  mastered_at?: string;
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

/**
 * Compatibility wrapper (legacy API name retained).
 * In the 1-4-7 system, only pass/fail matters.
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
  cycleStartedAt: string;
  requiresDeletionConfirmation: boolean;
  requiresSevenDayDecision: boolean;
} {
  const stage = Math.max(0, Math.min(item.review_stage ?? item.repetition ?? 0, MAX_ACTIVE_STAGE));
  const cycleStartedAt = toIsoDate(item.cycle_started_at || item.created_at || new Date());

  const result = process147Review(
    {
      review_stage: stage,
      cycle_started_at: cycleStartedAt,
      lapse_count: item.lapse_count || 0,
    },
    performance,
  );

  const isLapse = result.outcome === 'fail';

  return {
    repetition: result.nextStage,
    easinessFactor: item.easiness_factor || 2.5,
    interval: result.intervalDays,
    nextReviewDate: result.nextReviewDate,
    nextStatus: result.status,
    isLapse,
    newLapseCount: result.lapseCount,
    isLeech: result.lapseCount >= 3,
    isGraduated: result.status === 'completed',
    completedAt: result.completedAt,
    archiveAt: undefined,
    deleteAt: result.deleteAt,
    cycleStartedAt: result.cycleStartedAt,
    requiresDeletionConfirmation: result.requiresDeletionConfirmation,
    requiresSevenDayDecision: result.requiresSevenDayDecision,
  };
}

/**
 * Priority score for queue ordering.
 * Higher means more urgent.
 */
export function calculatePriority(item: MemoryItem): number {
  if (item.status !== 'active' || !item.next_review_date) return -1;

  const today = new Date();
  const due = new Date(`${item.next_review_date}T00:00:00`);
  const overdueDays = Math.max(0, (today.getTime() - due.getTime()) / 86400000);
  const overdueFactor = 1 + overdueDays;
  const stageWeight = 1 + (item.review_stage || 0) * 0.1;
  const difficultyWeight = item.difficulty === 'hard' ? 1.3 : item.difficulty === 'medium' ? 1.1 : 1.0;
  const lapseWeight = 1 + (item.lapse_count || 0) * 0.2;

  return overdueFactor * stageWeight * difficultyWeight * lapseWeight;
}

/**
 * Rough retention estimate for display only.
 */
export function estimateRetention(item: MemoryItem): number {
  const anchor = item.last_reviewed_at || item.cycle_started_at || item.created_at;
  if (!anchor) return 100;

  const daysSince = (Date.now() - new Date(anchor).getTime()) / 86400000;
  if (daysSince <= 0) return 100;

  const stage = Math.max(0, Math.min(item.review_stage || 0, MAX_ACTIVE_STAGE));
  const horizon = stage === DECISION_STAGE ? REVIEW_INTERVALS_147[2] : Math.max(1, getCurrentIntervalForStage(stage));
  const retention = Math.exp(-daysSince / horizon) * 100;

  return Math.round(Math.max(0, Math.min(100, retention)));
}

/**
 * Predict outcomes for each button while preserving existing UI controls.
 * again/hard => fail (reset), good/easy => pass (advance).
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
    { perf: 'good', label: 'Done', color: '#10B981', emoji: '✅' },
  ];

  const state = {
    review_stage: Math.max(0, Math.min(item.review_stage || item.repetition || 0, MAX_ACTIVE_STAGE)),
    cycle_started_at: toIsoDate(item.cycle_started_at || item.created_at || new Date()),
    lapse_count: item.lapse_count || 0,
  };

  return configs.map(({ perf, label, color, emoji }) => {
    const projected = process147Review(state, perf);
    return {
      performance: perf,
      label,
      color,
      interval: projected.intervalDays,
      nextDate: projected.nextReviewDate,
      emoji,
    };
  });
}

/** Format days as compact human-readable interval */
export function formatInterval(days: number): string {
  if (days === 0) return 'Done';
  if (days === 1) return '1d';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.round(days / 7)}w`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

/** Format date as short readable (Feb 12) */
export function formatShortDate(dateStr: string): string {
  if (!dateStr) return 'Pending choice';
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  if (!item.next_review_date) return 'pending';
  if (item.next_review_date < today) return 'overdue';
  if (item.next_review_date === today) return 'pending';
  return 'completed';
}

export function getStageLabel(template: ReviewTemplate, stageIndex: number): string {
  if (stageIndex === DECISION_STAGE) return 'Choose Day 30 / Complete';
  if (stageIndex === THIRTY_DAY_STAGE) return 'Day 30';
  if (stageIndex >= MASTERED_STAGE) return 'Completed';
  return `Day ${template.intervals[stageIndex]}`;
}

export const DIFFICULTY_WEIGHTS: Record<Performance, number> = {
  again: 0,
  hard: 0.5,
  good: 1.0,
  easy: 1.0,
};

export function getRatingButtons(item: MemoryItem) {
  return getPredictedIntervals(item).map(p => ({
    label: p.label,
    color: p.color,
    interval: formatInterval(p.interval),
    performance: p.performance,
  }));
}

export const REVIEW_INTERVALS = [...REVIEW_INTERVALS_147, OPTIONAL_REVIEW_DAY_30];

export const RATING_BUTTONS = [
  { label: 'Revise Again', color: '#EF4444', interval: 'Reset to Day 1', performance: 'again' as Performance },
  { label: 'Done', color: '#10B981', interval: 'Advance Stage', performance: 'good' as Performance },
];

export function getScheduleDateFromStage(cycleStartedAt: string, stage: number): string {
  return getScheduledDateForStage(cycleStartedAt, stage);
}

export function getOutcome(performance: Performance) {
  return performanceToOutcome(performance);
}
