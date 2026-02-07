import { getSupabase, requireAuth } from '@/lib/supabase';
import type { MemoryItem, Attachment, ReviewHistory, Performance, ReviewStatus, Difficulty, ContentType } from '@/types';
import { processReviewCompletion } from '@/types';

// Helper to transform database record to MemoryItem (handles legacy + SM-2 fields)
const transformItem = (item: any): MemoryItem => ({
  id: item.id,
  user_id: item.user_id,
  category_id: item.category_id,
  title: item.title,
  content: item.content,
  content_type: item.content_type as ContentType,
  attachments: (item.attachments || []) as Attachment[],
  difficulty: item.difficulty as Difficulty,
  status: (item.status === 'learning' || item.status === 'reviewing')
    ? 'active' as ReviewStatus
    : item.status === 'mastered'
      ? 'completed' as ReviewStatus
      : item.status as ReviewStatus,
  // SM-2 fields with sensible defaults for legacy items
  easiness_factor: item.easiness_factor ?? 2.5,
  interval: item.interval ?? 0,
  repetition: item.repetition ?? 0,
  lapse_count: item.lapse_count ?? 0,
  next_review_date: item.next_review_date,
  last_reviewed_at: item.last_reviewed_at,
  review_history: (item.review_history || []) as ReviewHistory[],
  // Legacy compat
  review_template: item.review_template || 'sm2',
  current_stage_index: item.current_stage_index ?? item.review_stage ?? item.repetition ?? 0,
  review_stage: item.review_stage ?? item.repetition ?? 0,
  // Lifecycle
  completed_at: item.completed_at,
  archive_at: item.archive_at,
  delete_at: item.delete_at,
  // AI & notes
  ai_summary: item.ai_summary,
  ai_flowchart: item.ai_flowchart,
  notes: item.notes,
  is_bookmarked: item.is_bookmarked ?? false,
  created_at: item.created_at,
  updated_at: item.updated_at,
});

export const memoryItemService = {
  // Get all memory items for current user
  async getMemoryItems(): Promise<MemoryItem[]> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const { data, error } = await supabase
      .from('memory_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching memory items:', error);
      throw error;
    }
    
    return (data || []).map(transformItem);
  },

  // Get memory item by ID
  async getMemoryItemById(id: string): Promise<MemoryItem | null> {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('memory_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching memory item:', error);
      throw error;
    }
    
    return data ? transformItem(data) : null;
  },

  // Get items due today
  async getItemsDueToday(): Promise<MemoryItem[]> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('memory_items')
      .select('*')
      .eq('user_id', userId)
      .lte('next_review_date', today)
      .neq('status', 'archived')
      .order('next_review_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching items due today:', error);
      throw error;
    }
    
    return (data || []).map(transformItem);
  },

  // Get items by category
  async getItemsByCategory(categoryId: string): Promise<MemoryItem[]> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const { data, error } = await supabase
      .from('memory_items')
      .select('*')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching items by category:', error);
      throw error;
    }
    
    return (data || []).map(transformItem);
  },

  // Get items by status
  async getItemsByStatus(status: ReviewStatus): Promise<MemoryItem[]> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const { data, error } = await supabase
      .from('memory_items')
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching items by status:', error);
      throw error;
    }
    
    return (data || []).map(transformItem);
  },

  // Create a new memory item
  async createMemoryItem(item: Omit<MemoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<MemoryItem> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const insertData = {
      user_id: userId,
      category_id: item.category_id,
      title: item.title,
      content: item.content,
      content_type: item.content_type,
      attachments: item.attachments,
      difficulty: item.difficulty,
      status: item.status || 'active',
      next_review_date: item.next_review_date,
      review_stage: item.review_stage ?? 0,
      review_history: item.review_history || [],
      ai_summary: item.ai_summary,
      ai_flowchart: item.ai_flowchart,
      // SM-2 fields
      easiness_factor: item.easiness_factor ?? 2.5,
      interval: item.interval ?? 0,
      repetition: item.repetition ?? 0,
      lapse_count: item.lapse_count ?? 0,
      review_template: item.review_template || 'sm2',
      current_stage_index: item.current_stage_index ?? 0,
      is_bookmarked: item.is_bookmarked ?? false,
      notes: item.notes,
    };
    
    const { data, error } = await supabase
      .from('memory_items')
      .insert(insertData as any)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating memory item:', error);
      throw error;
    }
    
    return transformItem(data);
  },

  // Update a memory item
  async updateMemoryItem(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem> {
    const supabase = getSupabase();
    
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.user_id;
    delete updateData.created_at;
    
    const { data, error } = await supabase
      .from('memory_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating memory item:', error);
      throw error;
    }
    
    return transformItem(data);
  },

  // ─── Complete a review using SM-2 Adaptive Algorithm ───
  async completeReview(id: string, performance: Performance, timeSpentSeconds?: number): Promise<MemoryItem | null> {
    const item = await this.getMemoryItemById(id);
    if (!item) throw new Error('Memory item not found');

    const result = processReviewCompletion(item, performance);

    const newReviewHistory: ReviewHistory[] = [
      ...item.review_history,
      {
        date: new Date().toISOString().split('T')[0],
        performance,
        time_spent_seconds: timeSpentSeconds ?? Math.floor(Math.random() * 120) + 30,
        interval: result.interval,
        easiness_factor: result.easinessFactor,
      },
    ];

    if (result.isGraduated) {
      return this.updateMemoryItem(id, {
        easiness_factor: result.easinessFactor,
        interval: result.interval,
        repetition: result.repetition,
        lapse_count: result.newLapseCount,
        current_stage_index: result.repetition,
        review_stage: result.repetition,
        next_review_date: result.nextReviewDate,
        status: 'completed',
        completed_at: result.completedAt,
        archive_at: result.archiveAt,
        delete_at: result.deleteAt,
        last_reviewed_at: new Date().toISOString(),
        review_history: newReviewHistory,
      });
    }

    return this.updateMemoryItem(id, {
      easiness_factor: result.easinessFactor,
      interval: result.interval,
      repetition: result.repetition,
      lapse_count: result.newLapseCount,
      current_stage_index: result.repetition,
      review_stage: result.repetition,
      next_review_date: result.nextReviewDate,
      status: 'active',
      last_reviewed_at: new Date().toISOString(),
      review_history: newReviewHistory,
    });
  },

  // ─── Lifecycle: Process archived/deleted items ───
  // Call this periodically (on app load, etc.)
  async processLifecycle(): Promise<{ archived: number; deleted: number }> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    const today = new Date().toISOString().split('T')[0];
    let archived = 0;
    let deleted = 0;

    // 1. Delete items past delete_at
    const { data: toDelete } = await supabase
      .from('memory_items')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'archived')
      .lte('delete_at', today);

    if (toDelete && toDelete.length > 0) {
      const ids = toDelete.map(i => i.id);
      await supabase.from('memory_items').delete().in('id', ids);
      deleted = ids.length;
    }

    // 2. Archive items past archive_at
    const { data: toArchive } = await supabase
      .from('memory_items')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .lte('archive_at', today);

    if (toArchive && toArchive.length > 0) {
      const ids = toArchive.map(i => i.id);
      await supabase
        .from('memory_items')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .in('id', ids);
      archived = ids.length;
    }

    if (archived > 0 || deleted > 0) {
      console.log(`Lifecycle: archived ${archived}, deleted ${deleted} items`);
    }
    return { archived, deleted };
  },

  // Delete a memory item
  async deleteMemoryItem(id: string): Promise<void> {
    const supabase = getSupabase();
    
    const { error } = await supabase
      .from('memory_items')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting memory item:', error);
      throw error;
    }
  },

  // Archive a memory item
  async archiveMemoryItem(id: string): Promise<MemoryItem> {
    return this.updateMemoryItem(id, { status: 'archived' });
  },

  // Restore an archived item
  async restoreMemoryItem(id: string): Promise<MemoryItem> {
    return this.updateMemoryItem(id, { status: 'active' });
  },

  // Search memory items
  async searchMemoryItems(query: string): Promise<MemoryItem[]> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const { data, error } = await supabase
      .from('memory_items')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error searching memory items:', error);
      throw error;
    }
    
    return (data || []).map(transformItem);
  },
};
