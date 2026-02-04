// Database service layer for Remembra
import { supabase } from './supabase'
import type {
  Profile,
  Category,
  MemoryItem,
  Review,
  AIContent,
  ReviewQueueItem,
  UserStats,
  CalendarHeatmapData,
  StudyInsights,
  NotificationPreferences,
} from '@/types'

export class DatabaseService {
  // ============ PROFILES ============
  static async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data as Profile
  }

  static async updateProfile(userId: string, updates: Partial<Omit<Profile, 'id' | 'created_at'>>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      // @ts-ignore - Supabase type mismatch
      .update(updates as any)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data as Profile
  }

  // ============ CATEGORIES ============
  static async getCategories(userId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return (data as Category[]) || []
  }

  static async createCategory(userId: string, category: Omit<Category, 'id' | 'user_id' | 'created_at'>): Promise<Category> {
    const { data, error} = await supabase
      .from('categories')
      .insert({ ...category, user_id: userId } as any)
      .select()
      .single()
    
    if (error) throw error
    return data as Category
  }

  static async getCategory(id: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as Category
  }

  static async updateCategory(id: string, updates: Partial<Omit<Category, 'id' | 'created_at'>>): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      // @ts-ignore - Supabase type mismatch
      .update(updates as any)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Category
  }

  static async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // ============ MEMORY ITEMS ============
  static async getMemoryItems(
    userId: string,
    options?: {
      categoryId?: string
      includeArchived?: boolean
      limit?: number
    }
  ): Promise<MemoryItem[]> {
    let query = supabase
      .from('memory_items')
      .select('*')
      .eq('user_id', userId)

    if (options?.categoryId) {
      query = query.eq('category_id', options.categoryId)
    }

    if (!options?.includeArchived) {
      query = query.eq('is_archived', false)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query
    
    if (error) throw error
    return (data as MemoryItem[]) || []
  }

  static async getMemoryItem(id: string): Promise<MemoryItem | null> {
    const { data, error } = await supabase
      .from('memory_items')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as MemoryItem
  }

  static async createMemoryItem(userId: string, item: Omit<MemoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'stage' | 'next_review_date' | 'last_reviewed_at' | 'review_count' | 'success_count' | 'difficulty'>): Promise<MemoryItem> {
    const { data, error } = await supabase
      .from('memory_items')
      .insert({ ...item, user_id: userId } as any)
      .select()
      .single()
    
    if (error) throw error
    return data as MemoryItem
  }

  static async updateMemoryItem(id: string, updates: Partial<Omit<MemoryItem, 'id' | 'created_at'>>): Promise<MemoryItem> {
    const { data, error } = await supabase
      .from('memory_items')
      // @ts-ignore - Supabase type mismatch
      .update(updates as any)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as MemoryItem
  }

  static async deleteMemoryItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('memory_items')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }

  // ============ REVIEWS ============
  static async submitReview(
    userId: string,
    itemId: string,
    review: {
      was_correct: boolean
      difficulty_rating?: number
      time_taken?: number
      notes?: string
    }
  ): Promise<{ next_stage: number; next_review_date: string; new_difficulty: number }> {
    const { data, error } = await supabase.rpc('submit_review' as any, {
      p_item_id: itemId,
      p_user_id: userId,
      p_success: review.was_correct,
      p_duration_seconds: review.time_taken,
      p_difficulty_rating: review.difficulty_rating,
      p_notes: review.notes,
    } as any)
    
    if (error) throw error
    return data as { next_stage: number; next_review_date: string; new_difficulty: number }
  }

  static async getReviewHistory(itemId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return (data as Review[]) || []
  }

  // ============ REVIEW QUEUE ============
  static async getReviewQueue(userId: string): Promise<ReviewQueueItem[]> {
    const { data, error } = await supabase.rpc('get_review_queue' as any, {
      user_uuid: userId
    } as any)
    
    if (error) throw error
    return (data as ReviewQueueItem[]) || []
  }

  // ============ STATISTICS ============
  static async getUserStats(userId: string): Promise<UserStats> {
    const { data, error } = await supabase.rpc('get_user_stats' as any, {
      user_uuid: userId
    } as any)
    
    if (error) throw error
    return data as UserStats
  }

  static async getCalendarHeatmap(userId: string, daysBack: number = 90): Promise<CalendarHeatmapData[]> {
    const { data, error } = await supabase.rpc('get_calendar_heatmap' as any, {
      user_uuid: userId,
      days_back: daysBack
    } as any)
    
    if (error) throw error
    return (data as CalendarHeatmapData[]) || []
  }

  static async getStudyInsights(userId: string): Promise<StudyInsights> {
    const { data, error } = await supabase.rpc('get_study_insights' as any, {
      user_uuid: userId
    } as any)
    
    if (error) throw error
    return data as StudyInsights
  }

  // ============ AI CONTENT ============
  static async getAIContent(itemId: string, contentType?: string): Promise<AIContent[]> {
    let query = supabase
      .from('ai_content')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
    
    if (contentType) {
      query = query.eq('content_type', contentType)
    }

    const { data, error } = await query
    
    if (error) throw error
    return (data as AIContent[]) || []
  }

  static async createAIContent(userId: string, itemId: string, content: { content_type: string; content: any }): Promise<AIContent> {
    const { data, error } = await supabase
      .from('ai_content')
      .insert({
        user_id: userId,
        item_id: itemId,
        content_type: content.content_type,
        content: content.content,
        provider: 'groq',
        model: 'llama-3.3-70b-versatile'
      } as any)
      .select()
      .single()
    
    if (error) throw error
    return data as AIContent
  }

  static async saveAIContent(content: Omit<AIContent, 'id' | 'created_at'>): Promise<AIContent> {
    const { data, error } = await supabase
      .from('ai_content')
      .insert(content as any)
      .select()
      .single()
    
    if (error) throw error
    return data as AIContent
  }

  // ============ NOTIFICATION PREFERENCES ============
  static async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return (data as NotificationPreferences | null)
  }

  static async updateNotificationPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({ user_id: userId, ...updates } as any)
      .select()
      .single()
    
    if (error) throw error
    return data as NotificationPreferences
  }

  // ============ REALTIME SUBSCRIPTIONS ============
  static subscribeToMemoryItems(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('memory_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memory_items',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe()
  }

  static subscribeToCategories(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('categories_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `user_id=eq.${userId}`,
        },
        callback
      )
      .subscribe()
  }
}

export const db = DatabaseService
