// Database Types for Supabase
// These types are auto-generated based on the database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          timezone: string;
          notification_preferences: Json;
          streak_count: number;
          total_reviews: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          timezone?: string;
          notification_preferences?: Json;
          streak_count?: number;
          total_reviews?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          timezone?: string;
          notification_preferences?: Json;
          streak_count?: number;
          total_reviews?: number;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          icon: string;
          order_index: number;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color: string;
          icon?: string;
          order_index?: number;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          color?: string;
          icon?: string;
          order_index?: number;
          is_default?: boolean;
        };
      };
      memory_items: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          title: string;
          content: string;
          content_type: string;
          attachments: Json;
          difficulty: string;
          status: string;
          next_review_date: string;
          review_stage: number;
          review_history: Json;
          ai_summary: string | null;
          ai_flowchart: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          title: string;
          content: string;
          content_type?: string;
          attachments?: Json;
          difficulty?: string;
          status?: string;
          next_review_date?: string;
          review_stage?: number;
          review_history?: Json;
          ai_summary?: string | null;
          ai_flowchart?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          title?: string;
          content?: string;
          content_type?: string;
          attachments?: Json;
          difficulty?: string;
          status?: string;
          next_review_date?: string;
          review_stage?: number;
          review_history?: Json;
          ai_summary?: string | null;
          ai_flowchart?: string | null;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          memory_item_id: string;
          scheduled_date: string;
          completed_date: string | null;
          performance: string | null;
          time_spent_seconds: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          memory_item_id: string;
          scheduled_date: string;
          completed_date?: string | null;
          performance?: string | null;
          time_spent_seconds?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          scheduled_date?: string;
          completed_date?: string | null;
          performance?: string | null;
          time_spent_seconds?: number | null;
          notes?: string | null;
        };
      };
      streak_entries: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          reviews_completed: number;
          streak_broken: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          reviews_completed?: number;
          streak_broken?: boolean;
          created_at?: string;
        };
        Update: {
          reviews_completed?: number;
          streak_broken?: boolean;
        };
      };
      achievements: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          icon: string;
          unlocked_at: string | null;
          progress: number;
          max_progress: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description: string;
          icon: string;
          unlocked_at?: string | null;
          progress?: number;
          max_progress: number;
          created_at?: string;
        };
        Update: {
          unlocked_at?: string | null;
          progress?: number;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_calendar_data: {
        Args: {
          p_user_id: string;
          p_start_date: string;
          p_end_date: string;
        };
        Returns: {
          date: string;
          reviews_due: number;
          reviews_completed: number;
        }[];
      };
      get_stats_data: {
        Args: {
          p_user_id: string;
        };
        Returns: Json;
      };
      update_streak: {
        Args: {
          p_user_id: string;
        };
        Returns: number;
      };
    };
    Enums: {
      content_type: 'text' | 'code' | 'image' | 'document' | 'mixed';
      review_status: 'learning' | 'reviewing' | 'mastered' | 'archived';
      difficulty: 'easy' | 'medium' | 'hard';
      performance: 'again' | 'hard' | 'medium' | 'easy';
    };
  };
}

// Type helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
