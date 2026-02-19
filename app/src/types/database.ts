// Database Types for Supabase
// These types are manually aligned with app/supabase/schema.sql

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
          color?: string;
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
          cycle_started_at: string;
          next_review_date: string | null;
          review_stage: number;
          current_stage_index: number;
          review_template: string;
          easiness_factor: number;
          interval: number;
          repetition: number;
          lapse_count: number;
          last_reviewed_at: string | null;
          review_history: Json;
          ai_summary: string | null;
          ai_flowchart: string | null;
          ai_bullet_points: Json;
          notes: string | null;
          is_bookmarked: boolean;
          completed_at: string | null;
          mastered_at: string | null;
          archive_at: string | null;
          delete_at: string | null;
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
          cycle_started_at?: string;
          next_review_date?: string | null;
          review_stage?: number;
          current_stage_index?: number;
          review_template?: string;
          easiness_factor?: number;
          interval?: number;
          repetition?: number;
          lapse_count?: number;
          last_reviewed_at?: string | null;
          review_history?: Json;
          ai_summary?: string | null;
          ai_flowchart?: string | null;
          ai_bullet_points?: Json;
          notes?: string | null;
          is_bookmarked?: boolean;
          completed_at?: string | null;
          mastered_at?: string | null;
          archive_at?: string | null;
          delete_at?: string | null;
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
          cycle_started_at?: string;
          next_review_date?: string | null;
          review_stage?: number;
          current_stage_index?: number;
          review_template?: string;
          easiness_factor?: number;
          interval?: number;
          repetition?: number;
          lapse_count?: number;
          last_reviewed_at?: string | null;
          review_history?: Json;
          ai_summary?: string | null;
          ai_flowchart?: string | null;
          ai_bullet_points?: Json;
          notes?: string | null;
          is_bookmarked?: boolean;
          completed_at?: string | null;
          mastered_at?: string | null;
          archive_at?: string | null;
          delete_at?: string | null;
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
      device_push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: string;
          device_info: Json;
          created_at: string;
          updated_at: string;
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform: string;
          device_info?: Json;
          created_at?: string;
          updated_at?: string;
          last_seen_at?: string;
        };
        Update: {
          token?: string;
          platform?: string;
          device_info?: Json;
          updated_at?: string;
          last_seen_at?: string;
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
      update_streak: {
        Args: {
          p_user_id: string;
        };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
