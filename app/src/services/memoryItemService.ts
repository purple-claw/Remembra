import { db, requireAuth } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
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
import { storageService } from '@/services/storageService';

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

// Helper to transform Firestore document to MemoryItem
const transformItem = (id: string, item: any): MemoryItem => {
  const stage = normalizeStage(item);
  const cycleStartedAt = toIsoDate(item.cycle_started_at || item.created_at || new Date());
  const status = normalizeStatus(item.status);

  return {
    id,
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
    const userId = requireAuth();

    const q = query(
      collection(db, 'memory_items'),
      where('user_id', '==', userId),
      orderBy('created_at', 'desc'),
    );
    const snap = await getDocs(q);

    return snap.docs.map(d => transformItem(d.id, d.data()));
  },

  async getMemoryItemById(id: string): Promise<MemoryItem | null> {
    const userId = requireAuth();
    const docRef = doc(db, 'memory_items', id);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return null;
    const data = snap.data();
    if (data.user_id !== userId) return null;

    return transformItem(snap.id, data);
  },

  async getItemsDueToday(): Promise<MemoryItem[]> {
    const userId = requireAuth();
    const today = new Date().toISOString().split('T')[0];

    const q = query(
      collection(db, 'memory_items'),
      where('user_id', '==', userId),
      where('status', '==', 'active'),
    );
    const snap = await getDocs(q);

    return snap.docs
      .map(d => transformItem(d.id, d.data()))
      .filter(item => item.next_review_date && item.next_review_date <= today)
      .sort((a, b) => {
        const dateDiff = (a.next_review_date || '').localeCompare(b.next_review_date || '');
        if (dateDiff !== 0) return dateDiff;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  },

  async getItemsByCategory(categoryId: string): Promise<MemoryItem[]> {
    const userId = requireAuth();

    const q = query(
      collection(db, 'memory_items'),
      where('user_id', '==', userId),
      where('category_id', '==', categoryId),
      orderBy('created_at', 'desc'),
    );
    const snap = await getDocs(q);

    return snap.docs.map(d => transformItem(d.id, d.data()));
  },

  async getItemsByStatus(status: ReviewStatus): Promise<MemoryItem[]> {
    const userId = requireAuth();

    const q = query(
      collection(db, 'memory_items'),
      where('user_id', '==', userId),
      where('status', '==', status),
      orderBy('created_at', 'desc'),
    );
    const snap = await getDocs(q);

    return snap.docs.map(d => transformItem(d.id, d.data()));
  },

  async createMemoryItem(item: Omit<MemoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<MemoryItem> {
    const userId = requireAuth();

    // Validate required fields
    const title = (item.title || '').trim();
    const content = (item.content || '').trim();
    if (!title) throw new Error('Title is required');
    if (!content) throw new Error('Content is required');
    if (title.length > 500) throw new Error('Title must be under 500 characters');

    const now = new Date().toISOString();
    const cycleStartedAt = toIsoDate(item.cycle_started_at || new Date());
    const reviewStage = 0;
    const nextReviewDate = getScheduledDateForStage(cycleStartedAt, reviewStage);

    const insertData = {
      user_id: userId,
      category_id: item.category_id,
      title: item.title,
      content: item.content,
      content_type: item.content_type,
      attachments: item.attachments || [],
      difficulty: item.difficulty,
      status: 'active',
      next_review_date: nextReviewDate,
      cycle_started_at: cycleStartedAt,
      review_stage: reviewStage,
      review_history: item.review_history || [],
      ai_summary: item.ai_summary || null,
      ai_flowchart: item.ai_flowchart || null,
      ai_bullet_points: item.ai_bullet_points || [],
      easiness_factor: item.easiness_factor ?? 2.5,
      interval: 1,
      repetition: 0,
      lapse_count: item.lapse_count ?? 0,
      review_template: '1-4-7',
      current_stage_index: 0,
      is_bookmarked: item.is_bookmarked ?? false,
      notes: item.notes || null,
      completed_at: null,
      mastered_at: null,
      archive_at: null,
      delete_at: null,
      last_reviewed_at: null,
      created_at: now,
      updated_at: now,
    };

    const docRef = await addDoc(collection(db, 'memory_items'), insertData);
    return transformItem(docRef.id, insertData);
  },

  async updateMemoryItem(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem> {
    const userId = requireAuth();
    const docRef = doc(db, 'memory_items', id);

    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    delete updateData.id;
    delete updateData.user_id;
    delete updateData.created_at;

    // Convert undefined values to null for Firestore
    for (const key of Object.keys(updateData)) {
      if (updateData[key] === undefined) {
        updateData[key] = null;
      }
    }

    // Convert empty string next_review_date to null
    if (updateData.next_review_date === '') {
      updateData.next_review_date = null;
    }

    await updateDoc(docRef, updateData);

    const snap = await getDoc(docRef);
    const data = snap.data();
    if (!data || data.user_id !== userId) throw new Error('Item not found');

    return transformItem(snap.id, data);
  },

  // Complete a review using strict 1-4-7 pass/fail progression
  async completeReview(
    id: string,
    performance: Performance,
    timeSpentSeconds?: number,
    scheduledDateOverride?: string,
  ): Promise<MemoryItem | null> {
    const userId = requireAuth();

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

    // Persist review log for analytics/stats calendar
    const scheduledDate = scheduledDateOverride || item.next_review_date || eventDate;
    try {
      await addDoc(collection(db, 'reviews'), {
        user_id: userId,
        memory_item_id: id,
        scheduled_date: scheduledDate,
        completed_date: now,
        performance,
        time_spent_seconds: timeSpentSeconds ?? 0,
        created_at: now,
      });
    } catch (reviewError) {
      console.warn('Review log insert failed:', reviewError);
    }

    return updatedItem;
  },

  async processLifecycle(): Promise<{ archived: number; deleted: number }> {
    const userId = requireAuth();
    const today = new Date().toISOString().split('T')[0];
    let deleted = 0;

    // Legacy cleanup: archived items past delete_at
    const archivedQ = query(
      collection(db, 'memory_items'),
      where('user_id', '==', userId),
      where('status', '==', 'archived'),
    );
    const archivedSnap = await getDocs(archivedQ);

    for (const d of archivedSnap.docs) {
      const data = d.data();
      if (data.delete_at && data.delete_at <= today) {
        await deleteDoc(d.ref);
        deleted++;
      }
    }

    // Completed items past delete_at
    const completedQ = query(
      collection(db, 'memory_items'),
      where('user_id', '==', userId),
      where('status', '==', 'completed'),
    );
    const completedSnap = await getDocs(completedQ);

    for (const d of completedSnap.docs) {
      const data = d.data();
      if (data.delete_at && data.delete_at <= today) {
        const attachments = (Array.isArray(data.attachments) ? data.attachments : []).filter(Boolean) as Attachment[];
        await deleteDoc(d.ref);
        deleted++;
        if (attachments.length > 0) {
          await storageService.removeAttachments(attachments);
        }
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
    const userId = requireAuth();
    const item = await this.getMemoryItemById(id);

    const docRef = doc(db, 'memory_items', id);
    const snap = await getDoc(docRef);
    if (!snap.exists() || snap.data()?.user_id !== userId) {
      throw new Error('Item not found');
    }

    await deleteDoc(docRef);

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

  async searchMemoryItems(searchQuery: string): Promise<MemoryItem[]> {
    const userId = requireAuth();

    // Firestore doesn't support ILIKE - fetch all and filter client-side
    const q = query(
      collection(db, 'memory_items'),
      where('user_id', '==', userId),
      orderBy('created_at', 'desc'),
    );
    const snap = await getDocs(q);

    const lowerQuery = searchQuery.toLowerCase();
    return snap.docs
      .map(d => transformItem(d.id, d.data()))
      .filter(item =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.content.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 100);
  },
};
