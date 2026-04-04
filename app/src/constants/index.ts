/**
 * Application-wide constants
 * Centralized source of truth for all magic strings, limits, and configuration values
 * Ensures consistency and makes changes easy across the codebase
 */

export const APP_CONSTANTS = {
  // ─── Storage & Persistence ───────────────────────────────────────────
  STORAGE: {
    PERSIST_DB_NAME: 'remembra-persist',
    PERSIST_STORE_NAME: 'sessions',
    PERSIST_MAX_SESSIONS: 50,
    PERSIST_FALLBACK_KEY: 'remembra-persist-fallback-sessions',
    STORE_NAME: 'remembra-storage',
  },

  // ─── Review Status ───────────────────────────────────────────────────
  REVIEW_STATUS: {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    ARCHIVED: 'archived',
  } as const,

  // ─── Performance Ratings ─────────────────────────────────────────────
  PERFORMANCE: {
    AGAIN: 'again',
    HARD: 'hard',
    GOOD: 'good',
    EASY: 'easy',
  } as const,

  // ─── Content Types ───────────────────────────────────────────────────
  CONTENT_TYPE: {
    TEXT: 'text',
    CODE: 'code',
    IMAGE: 'image',
    DOCUMENT: 'document',
    MIXED: 'mixed',
  } as const,

  // ─── Difficulty Levels ───────────────────────────────────────────────
  DIFFICULTY: {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard',
  } as const,

  // ─── Schedule Types ──────────────────────────────────────────────────
  SCHEDULE_TYPE: {
    SPACED: 'spaced',
    RECURRING: 'recurring',
  } as const,

  // ─── Recurring Frequency ─────────────────────────────────────────────
  RECURRING_FREQUENCY: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
  } as const,

  // ─── Input Limits ────────────────────────────────────────────────────
  LIMITS: {
    // Text limits
    MIN_TITLE_LENGTH: 1,
    MAX_TITLE_LENGTH: 200,
    MIN_CONTENT_LENGTH: 1,
    MAX_CONTENT_LENGTH: 50000,
    USERNAME_MAX_LENGTH: 100,

    // UI/Display limits
    MAX_VISIBLE_LIBRARY_ITEMS: 36,
    LOAD_MORE_INCREMENT: 24,
    SEARCH_WINDOW_CHARS: 2800,
    MAX_CATEGORY_ORDER_INDEX: 1000,

    // API limits
    MAX_RETRIES: 3,
    DEFAULT_RETRY_DELAY_MS: 1000,

    // File limits
    MAX_ATTACHMENT_SIZE_MB: 10,
    MAX_ATTACHMENTS_PER_ITEM: 5,
    MAX_IMAGE_WIDTH_PX: 2000,
    MAX_IMAGE_HEIGHT_PX: 2000,
  } as const,

  // ─── Timing Constants ────────────────────────────────────────────────
  TIME: {
    // Spaced repetition intervals (in days)
    REVIEW_INTERVALS_DAYS: [1, 4, 7, 30] as const,
    MAX_ACTIVE_STAGE: 3, // After stage 3 (day 7), awaiting decision
    DECISION_STAGE: 4, // User chooses day 30 or complete
    OPTIONAL_REVIEW_DAY_30: 30,

    // Streak timing
    STREAK_RESET_HOURS: 24,
    STREAK_TIMEZONE_OFFSET: 0, // UTC by default

    // Notification delays
    DAILY_REMINDER_DELAY_MS: 0,
    SESSION_AUTO_SAVE_DELAY_MS: 100,
  } as const,

  // ─── Navigation ──────────────────────────────────────────────────────
  SCREENS: {
    AUTH: 'auth',
    DASHBOARD: 'dashboard',
    CALENDAR: 'calendar',
    REVIEW: 'review',
    LIBRARY: 'library',
    CREATE: 'create',
    STATS: 'stats',
    PROFILE: 'profile',
    PERSIST: 'persist',
    TEST: 'test',
  } as const,

  // ─── Colors & Theming ────────────────────────────────────────────────
  COLORS: {
    PRIMARY: '#FF8000', // McLaren Orange
    SECONDARY: '#E81224', // Red
    SUCCESS: '#10B981', // Emerald
    WARNING: '#F59E0B', // Amber
    ERROR: '#EF4444', // Red
  } as const,

  // ─── UI Transitions & Animation ──────────────────────────────────────
  ANIMATION: {
    FAST_MS: 150,
    NORMAL_MS: 300,
    SLOW_MS: 500,
    EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  } as const,

  // ─── Feature Flags ───────────────────────────────────────────────────
  FEATURES: {
    ENABLE_PUSH_NOTIFICATIONS: true,
    ENABLE_OFFLINE_MODE: false, // Experimental
    ENABLE_DARK_MODE: true,
    ENABLE_ANALYTICS: false, // Requires API key
  } as const,

  // ─── Firebase Collections ────────────────────────────────────────────
  COLLECTIONS: {
    USERS: 'users',
    PROFILES: 'profiles',
    MEMORY_ITEMS: 'memory_items',
    CATEGORIES: 'categories',
    REVIEWS: 'reviews',
    ACHIEVEMENTS: 'achievements',
    STREAKS: 'streaks',
  } as const,

  // ─── Error Messages ──────────────────────────────────────────────────
  MESSAGES: {
    DEFAULT_ERROR: 'Something went wrong. Please try again.',
    NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
    AUTH_FAILED: 'Authentication failed. Please try again.',
    ITEM_NOT_FOUND: 'Item not found. It may have been deleted.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    VALIDATION_FAILED: 'Please check your input and try again.',
  } as const,

  // ─── API Endpoints (for external services) ────────────────────────
  API_ENDPOINTS: {
    GROQ_API: 'https://api.groq.com/openai/v1',
    OPENROUTER_API: 'https://openrouter.ai/api/v1',
  } as const,

  // ─── Default Values ──────────────────────────────────────────────────
  DEFAULTS: {
    TIMEZONE: 'UTC',
    LANGUAGE: 'en',
    THEME: 'dark',
    ITEMS_PER_PAGE: 36,
    SEARCH_DEBOUNCE_MS: 300,
    AUTO_SAVE_DELAY_MS: 500,
  } as const,
} as const;

// Type-safe constant access
export type ReviewStatus = typeof APP_CONSTANTS.REVIEW_STATUS[keyof typeof APP_CONSTANTS.REVIEW_STATUS];
export type Performance = typeof APP_CONSTANTS.PERFORMANCE[keyof typeof APP_CONSTANTS.PERFORMANCE];
export type ContentType = typeof APP_CONSTANTS.CONTENT_TYPE[keyof typeof APP_CONSTANTS.CONTENT_TYPE];
export type ScreenName = typeof APP_CONSTANTS.SCREENS[keyof typeof APP_CONSTANTS.SCREENS];
export type RecurringFrequency =
  typeof APP_CONSTANTS.RECURRING_FREQUENCY[keyof typeof APP_CONSTANTS.RECURRING_FREQUENCY];

// Validation helpers
export const VALID_REVIEW_STATUSES = Object.values(APP_CONSTANTS.REVIEW_STATUS);
export const VALID_PERFORMANCES = Object.values(APP_CONSTANTS.PERFORMANCE);
export const VALID_CONTENT_TYPES = Object.values(APP_CONSTANTS.CONTENT_TYPE);
export const VALID_SCREENS = Object.values(APP_CONSTANTS.SCREENS);
export const VALID_DIFFICULTIES = Object.values(APP_CONSTANTS.DIFFICULTY);

export function isValidReviewStatus(value: any): value is ReviewStatus {
  return VALID_REVIEW_STATUSES.includes(value);
}

export function isValidPerformance(value: any): value is Performance {
  return VALID_PERFORMANCES.includes(value);
}

export function isValidContentType(value: any): value is ContentType {
  return VALID_CONTENT_TYPES.includes(value);
}
