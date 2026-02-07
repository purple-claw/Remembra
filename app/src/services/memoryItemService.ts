import { getSupabase, requireAuth } from '@/lib/supabase';
import type { MemoryItem, Attachment, ReviewHistory, Performance, ReviewStatus, Difficulty, ContentType } from '@/types';

// Review intervals for 1-4-7 system
const REVIEW_INTERVALS = [1, 4, 7, 30, 90];

// Helper to transform database record to MemoryItem
const transformItem = (item: any): MemoryItem => ({
  id: item.id,
  user_id: item.user_id,
  category_id: item.category_id,
  title: item.title,
  content: item.content,
  content_type: item.content_type as ContentType,
  attachments: (item.attachments || []) as Attachment[],
  difficulty: item.difficulty as Difficulty,
  status: item.status as ReviewStatus,
  next_review_date: item.next_review_date,
  review_stage: item.review_stage,
  review_history: (item.review_history || []) as ReviewHistory[],
  ai_summary: item.ai_summary,
  ai_flowchart: item.ai_flowchart,
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
      status: item.status,
      next_review_date: item.next_review_date,
      review_stage: item.review_stage,
      review_history: item.review_history,
      ai_summary: item.ai_summary,
      ai_flowchart: item.ai_flowchart,
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

  // Complete a review and update spaced repetition
  // Returns the updated item, or null if the item was auto-deleted after 7-day review
  async completeReview(id: string, performance: Performance): Promise<MemoryItem | null> {
    // First, get the current item
    const item = await this.getMemoryItemById(id);
    if (!item) {
      throw new Error('Memory item not found');
    }
    
    // Calculate new review stage
    let newStage = item.review_stage;
    if (performance === 'again') {
      newStage = 0;
    } else if (performance === 'easy') {
      newStage = Math.min(item.review_stage + 2, 4);
    } else {
      newStage = Math.min(item.review_stage + 1, 4);
    }
    
    // Auto-delete after completing 7-day review (stage 2)
    // This happens when current stage is 2 and user progresses (not 'again')
    if (item.review_stage === 2 && performance !== 'again') {
      await this.deleteMemoryItem(id);
      console.log(`Auto-deleted item "${item.title}" after 7-day review completion`);
      return null;
    }
    
    // Calculate next review date
    const daysToAdd = REVIEW_INTERVALS[newStage];
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    
    // Determine new status
    let newStatus: ReviewStatus = item.status;
    if (newStage >= 3) newStatus = 'mastered';
    else if (newStage > 0) newStatus = 'reviewing';
    else newStatus = 'learning';
    
    // Add to review history
    const newReviewHistory: ReviewHistory[] = [
      ...item.review_history,
      {
        date: new Date().toISOString().split('T')[0],
        performance,
        time_spent_seconds: Math.floor(Math.random() * 120) + 60, // TODO: Track actual time
      },
    ];
    
    // Update the item
    return this.updateMemoryItem(id, {
      review_stage: newStage,
      next_review_date: nextDate.toISOString().split('T')[0],
      status: newStatus,
      review_history: newReviewHistory,
    });
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
    return this.updateMemoryItem(id, { status: 'reviewing' });
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
