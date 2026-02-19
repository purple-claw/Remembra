import { getSupabase, requireAuth } from '@/lib/supabase';
import type {
  Attachment,
  ContentType,
  Difficulty,
  MemoryItem,
  Performance,
  ReviewHistory,
  ReviewStatus,
} from '@/types';
import { processReviewCompletion } from '@/types';
import {
  DECISION_STAGE,
  DELETE_AFTER_COMPLETION_DAYS,
  MAX_ACTIVE_STAGE,
  OPTIONAL_REVIEW_DAY_30,
  THIRTY_DAY_STAGE,
  addDays,
  getScheduledDateForStage,
  toIsoDate,
} from '@/domain/review147';
import { storageService } from './storageService';

const normalizeStatus = (status: string): ReviewStatus => {
  if (status === 'learning' || status === 'reviewing') return 'active';
  if (status === 'mastered') return 'completed';
  if (status === 'active' || status === 'completed' || status === 'archived') return status;
  return 'active';
};

const normalizeStage = (item: any): number => {
  const raw = item.review_stage ?? item.current_stage_index ?? item.repetition ?? 0;
  return Math.max(0, Math.min(Number(raw) || 0, MAX_ACTIVE_STAGE));
};

// Helper to transform database record to MemoryItem (legacy-safe)
const transformItem = (item: any): MemoryItem => {
  const stage = normalizeStage(item);
  const cycleStartedAt = toIsoDate(item.cycle_started_at || item.created_at || new Date());
  const status = normalizeStatus(item.status);

  return {
    id: item.id,
    user_id: item.user_id,
    category_id: item.category_id,
    title: item.title,
    content: item.content,
    content_type: item.content_type as ContentType,
    attachments: (item.attachments || []) as Attachment[],
    difficulty: item.difficulty as Difficulty,
    status,
    easiness_factor: item.easiness_factor ?? 2.5,
    interval: item.interval ?? (
      stage === 0 ? 1
        : stage === 1 ? 4
          : stage === 2 ? 7
            : stage === THIRTY_DAY_STAGE ? OPTIONAL_REVIEW_DAY_30
              : 0
    ),
    repetition: item.repetition ?? stage,
    lapse_count: item.lapse_count ?? 0,
    next_review_date: item.next_review_date || (status === 'active' ? getScheduledDateForStage(cycleStartedAt, stage) : ''),
    cycle_started_at: cycleStartedAt,
    last_reviewed_at: item.last_reviewed_at,
    review_history: (item.review_history || []) as ReviewHistory[],
    review_template: item.review_template || '1-4-7',
    current_stage_index: item.current_stage_index ?? stage,
    review_stage: stage,
    completed_at: item.completed_at,
    mastered_at: item.mastered_at ?? item.completed_at,
    archive_at: item.archive_at,
    delete_at: item.delete_at,
    ai_summary: item.ai_summary,
    ai_flowchart: item.ai_flowchart,
    ai_bullet_points: item.ai_bullet_points,
    notes: item.notes,
    is_bookmarked: item.is_bookmarked ?? false,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
};

export const memoryItemService = {
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

  async getMemoryItemById(id: string): Promise<MemoryItem | null> {
    const supabase = getSupabase();
    const userId = await requireAuth();

    const { data, error } = await supabase
      .from('memory_items')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('Error fetching memory item:', error);
      throw error;
    }

    return data ? transformItem(data) : null;
  },

  async getItemsDueToday(): Promise<MemoryItem[]> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('memory_items')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .lte('next_review_date', today)
      .order('next_review_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching items due today:', error);
      throw error;
    }

    return (data || []).map(transformItem);
  },

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

  async createMemoryItem(item: Omit<MemoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<MemoryItem> {
    const supabase = getSupabase();
    const userId = await requireAuth();

    const cycleStartedAt = toIsoDate(item.cycle_started_at || new Date());
    const reviewStage = 0;
    const nextReviewDate = getScheduledDateForStage(cycleStartedAt, reviewStage);

    const insertData = {
      user_id: userId,
      category_id: item.category_id,
      title: item.title,
      content: item.content,
      content_type: item.content_type,
      attachments: item.attachments,
      difficulty: item.difficulty,
      status: 'active',
      next_review_date: nextReviewDate,
      cycle_started_at: cycleStartedAt,
      review_stage: reviewStage,
      review_history: item.review_history || [],
      ai_summary: item.ai_summary,
      ai_flowchart: item.ai_flowchart,
      ai_bullet_points: item.ai_bullet_points || [],
      easiness_factor: item.easiness_factor ?? 2.5,
      interval: 1,
      repetition: 0,
      lapse_count: item.lapse_count ?? 0,
      review_template: '1-4-7',
      current_stage_index: 0,
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

  async updateMemoryItem(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem> {
    const supabase = getSupabase();
    const userId = await requireAuth();

    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    delete updateData.id;
    delete updateData.user_id;
    delete updateData.created_at;

    if (updateData.next_review_date === '') {
      updateData.next_review_date = null;
    }

    const { data, error } = await supabase
      .from('memory_items')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating memory item:', error);
      throw error;
    }

    return transformItem(data);
  },

  // Complete a review using strict 1-4-7 pass/fail progression
  async completeReview(
    id: string,
    performance: Performance,
    timeSpentSeconds?: number,
    scheduledDateOverride?: string,
  ): Promise<MemoryItem | null> {
    const supabase = getSupabase();
    const userId = await requireAuth();

    const item = await this.getMemoryItemById(id);
    if (!item) throw new Error('Memory item not found');

    const result = processReviewCompletion(item, performance);
    const now = new Date().toISOString();
    const eventDate = new Date().toISOString().split('T')[0];

    const newReviewHistory: ReviewHistory[] = [
      ...item.review_history,
      {
        date: eventDate,
        performance,
        time_spent_seconds: timeSpentSeconds ?? 0,
        stage_index: result.repetition,
        interval: result.interval,
        easiness_factor: result.easinessFactor,
      },
    ];

    const updates: Partial<MemoryItem> = {
      easiness_factor: result.easinessFactor,
      interval: result.interval,
      repetition: result.repetition,
      lapse_count: result.newLapseCount,
      current_stage_index: result.repetition,
      review_stage: result.repetition,
      cycle_started_at: result.cycleStartedAt,
      next_review_date: result.nextReviewDate,
      status: result.nextStatus,
      last_reviewed_at: now,
      review_history: newReviewHistory,
      review_template: '1-4-7',
      completed_at: result.completedAt,
      mastered_at: result.completedAt,
      archive_at: undefined,
      delete_at: result.deleteAt,
    };

    if (result.isGraduated) {
      updates.next_review_date = '';
    }

    const updatedItem = await this.updateMemoryItem(id, updates);

    // Persist review log for analytics/stats calendar.
    const scheduledDate = scheduledDateOverride || item.next_review_date || eventDate;
    const { error: reviewError } = await supabase
      .from('reviews')
      .insert({
        user_id: userId,
        memory_item_id: id,
        scheduled_date: scheduledDate,
        completed_date: now,
        performance,
        time_spent_seconds: timeSpentSeconds ?? 0,
      } as any);

    if (reviewError) {
      console.warn('Review log insert failed:', reviewError);
    }

    return updatedItem;
  },

  async processLifecycle(): Promise<{ archived: number; deleted: number }> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    const today = new Date().toISOString().split('T')[0];
    let deleted = 0;

    // Legacy cleanup path only: keep backwards compatibility for already-archived rows.
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

    // Active completed queue cleanup: auto-delete 20 days after completion date.
    const { data: completedToDelete } = await supabase
      .from('memory_items')
      .select('id, attachments')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .lte('delete_at', today);

    if (completedToDelete && completedToDelete.length > 0) {
      const completedIds = completedToDelete.map(i => i.id);
      const attachments = completedToDelete
        .flatMap(row => Array.isArray(row.attachments) ? row.attachments : [])
        .filter(Boolean) as Attachment[];

      const { error: deleteError } = await supabase
        .from('memory_items')
        .delete()
        .in('id', completedIds)
        .eq('user_id', userId);

      if (!deleteError) {
        deleted += completedIds.length;
        if (attachments.length > 0) {
          await storageService.removeAttachments(attachments);
        }
      } else {
        console.warn('Failed to auto-delete completed items:', deleteError);
      }
    }

    return { archived: 0, deleted };
  },

  async scheduleThirtyDayReview(id: string): Promise<MemoryItem> {
    const item = await this.getMemoryItemById(id);
    if (!item) throw new Error('Memory item not found');

    const cycleStartedAt = toIsoDate(item.cycle_started_at || item.created_at || new Date());
    const nextReviewDate = getScheduledDateForStage(cycleStartedAt, THIRTY_DAY_STAGE);

    return this.updateMemoryItem(id, {
      status: 'active',
      review_stage: THIRTY_DAY_STAGE,
      current_stage_index: THIRTY_DAY_STAGE,
      repetition: THIRTY_DAY_STAGE,
      interval: OPTIONAL_REVIEW_DAY_30,
      cycle_started_at: cycleStartedAt,
      next_review_date: nextReviewDate,
      completed_at: undefined,
      mastered_at: undefined,
      delete_at: undefined,
      review_template: '1-4-7',
    });
  },

  async completeTopic(id: string): Promise<MemoryItem> {
    const now = new Date();
    const completedAt = now.toISOString();
    const deleteAt = addDays(toIsoDate(now), DELETE_AFTER_COMPLETION_DAYS);

    return this.updateMemoryItem(id, {
      status: 'completed',
      review_stage: DECISION_STAGE,
      current_stage_index: DECISION_STAGE,
      repetition: DECISION_STAGE,
      interval: 0,
      next_review_date: '',
      completed_at: completedAt,
      mastered_at: completedAt,
      delete_at: deleteAt,
      review_template: '1-4-7',
    });
  },

  async deleteMemoryItem(id: string): Promise<void> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    const item = await this.getMemoryItemById(id);

    const { error } = await supabase
      .from('memory_items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting memory item:', error);
      throw error;
    }

    if (item?.attachments?.length) {
      await storageService.removeAttachments(item.attachments);
    }
  },

  async archiveMemoryItem(id: string): Promise<MemoryItem> {
    return this.updateMemoryItem(id, { status: 'archived' });
  },

  async restoreMemoryItem(id: string): Promise<MemoryItem> {
    return this.updateMemoryItem(id, { status: 'active' });
  },

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
