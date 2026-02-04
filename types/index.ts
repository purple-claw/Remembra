// Type definitions for Remembra

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at'>
        Update: Partial<Omit<Category, 'id' | 'created_at'>>
      }
      memory_items: {
        Row: MemoryItem
        Insert: Omit<MemoryItem, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MemoryItem, 'id' | 'created_at'>>
      }
      reviews: {
        Row: Review
        Insert: Omit<Review, 'id' | 'created_at'>
        Update: never
      }
      ai_content: {
        Row: AIContent
        Insert: Omit<AIContent, 'id' | 'created_at'>
        Update: never
      }
      notification_preferences: {
        Row: NotificationPreferences
        Insert: Omit<NotificationPreferences, 'id' | 'updated_at'>
        Update: Partial<Omit<NotificationPreferences, 'id' | 'user_id'>>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_review_queue: {
        Args: { user_uuid: string }
        Returns: ReviewQueueItem[]
      }
      submit_review: {
        Args: {
          p_item_id: string
          p_user_id: string
          p_success: boolean
          p_duration_seconds?: number
          p_difficulty_rating?: number
          p_notes?: string
        }
        Returns: {
          next_stage: number
          next_review_date: string
          new_difficulty: number
        }
      }
      get_user_stats: {
        Args: { user_uuid: string }
        Returns: UserStats
      }
      get_calendar_heatmap: {
        Args: { user_uuid: string; days_back?: number }
        Returns: CalendarHeatmapData[]
      }
      get_study_insights: {
        Args: { user_uuid: string }
        Returns: StudyInsights
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Core domain types
export interface Profile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  timezone: string
  daily_goal: number
  streak_count: number
  total_reviews: number
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  icon: string
  color: string
  description: string | null
  item_count: number
  created_at: string
}

export type ContentType = 'text' | 'markdown' | 'code' | 'flashcard' | 'flowchart'

export interface ContentBlock {
  type: 'text' | 'code' | 'image' | 'flowchart' | 'flashcard'
  content: string
  language?: string // For code blocks
  metadata?: Record<string, any>
}

export interface MemoryItem {
  id: string
  user_id: string
  category_id: string | null
  title: string
  content: ContentBlock[]
  content_type: ContentType
  
  // Spaced repetition
  stage: number // 0, 1, 4, 7, 30, 90
  next_review_date: string
  last_reviewed_at: string | null
  review_count: number
  success_count: number
  difficulty: number // 0-1
  
  // AI features
  has_quiz: boolean
  has_summary: boolean
  has_flashcards: boolean
  has_flowchart: boolean
  
  // Metadata
  tags: string[]
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  item_id: string
  user_id: string
  success: boolean
  duration_seconds: number | null
  difficulty_rating: number | null // 1-5
  stage_at_review: number
  notes: string | null
  created_at: string
}

export type AIContentType = 'summary' | 'quiz' | 'flashcards' | 'flowchart'

export interface AIContent {
  id: string
  item_id: string
  content_type: AIContentType
  content: QuizContent | FlashcardContent | FlowchartContent | SummaryContent
  provider: 'groq' | 'cohere' | null
  created_at: string
}

export interface NotificationPreferences {
  id: string
  user_id: string
  enabled: boolean
  daily_reminder_time: string
  smart_scheduling: boolean
  review_reminders: boolean
  streak_reminders: boolean
  achievement_notifications: boolean
  updated_at: string
}

// AI Content types
export interface SummaryContent {
  summary: string
  keyPoints: string[]
}

export interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

export interface QuizContent {
  questions: QuizQuestion[]
}

export interface Flashcard {
  front: string
  back: string
}

export interface FlashcardContent {
  cards: Flashcard[]
}

export interface FlowchartNode {
  id: string
  label: string
  type: 'start' | 'process' | 'decision' | 'end'
}

export interface FlowchartEdge {
  from: string
  to: string
  label?: string
}

export interface FlowchartContent {
  nodes: FlowchartNode[]
  edges: FlowchartEdge[]
  mermaidCode?: string
}

// View models
export interface ReviewQueueItem {
  id: string
  title: string
  category_id: string | null
  category_name: string | null
  category_color: string | null
  stage: number
  next_review_date: string
  difficulty: number
  content_type: ContentType
}

export interface UserStats {
  total_items: number
  items_learning: number
  items_mastered: number
  due_today: number
  reviewed_this_week: number
  success_rate: number
}

export interface CalendarHeatmapData {
  date: string
  review_count: number
  success_count: number
}

export interface StudyInsights {
  best_time_of_day: number | null
  average_session_duration: number | null
  most_difficult_category: string | null
  total_study_time_hours: number | null
}

// App state types
export interface AppState {
  // Auth
  user: Profile | null
  session: any | null
  
  // Data
  categories: Category[]
  reviewQueue: ReviewQueueItem[]
  stats: UserStats | null
  
  // UI state
  isLoading: boolean
  error: string | null
  
  // Actions
  setUser: (user: Profile | null) => void
  setCategories: (categories: Category[]) => void
  setReviewQueue: (queue: ReviewQueueItem[]) => void
  setStats: (stats: UserStats) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

// Navigation types
export type RootStackParamList = {
  '(tabs)': undefined
  'auth/index': undefined
  'item/[id]': { id: string; mode?: 'view' | 'edit' | 'review' }
  'modal': undefined
  '+not-found': undefined
}

export type TabParamList = {
  'index': undefined // Today/Home
  'library': undefined
  'calendar': undefined
  'stats': undefined
}

// AI Service types
export interface AIProvider {
  name: 'groq' | 'cohere'
  generateSummary: (content: string) => Promise<SummaryContent>
  generateQuiz: (content: string, questionCount?: number) => Promise<QuizContent>
  generateFlashcards: (content: string, cardCount?: number) => Promise<FlashcardContent>
  generateFlowchart: (content: string) => Promise<FlowchartContent>
  studyAssist: (question: string, context: string) => Promise<string>
}

export interface AIServiceConfig {
  primaryProvider: AIProvider
  fallbackProvider: AIProvider
  rateLimits: {
    requestsPerMinute: number
    tokensPerMinute: number
  }
}

// Theme types
export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  surfaceVariant: string
  text: string
  textSecondary: string
  error: string
  success: string
  warning: string
  border: string
}

export interface Theme {
  colors: ThemeColors
  spacing: (multiplier: number) => number
  borderRadius: {
    small: number
    medium: number
    large: number
    full: number
  }
  typography: {
    h1: { fontSize: number; fontWeight: string }
    h2: { fontSize: number; fontWeight: string }
    h3: { fontSize: number; fontWeight: string }
    body: { fontSize: number; fontWeight: string }
    caption: { fontSize: number; fontWeight: string }
  }
}
