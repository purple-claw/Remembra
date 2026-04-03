/* eslint-disable @typescript-eslint/no-explicit-any */
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db, requireAuth } from '@/lib/firebase';
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
  MAX_ACTIVE_STAGE,
  OPTIONAL_REVIEW_DAY_30,
  THIRTY_DAY_STAGE,
  getScheduledDateForStage,
  toIsoDate,
} from '@/domain/review147';
import { storageService } from './storageService';

const userMemoryItemsCollection = (userId: string) => collection(db, 'users', userId, 'memory_items');
const userReviewsCollection = (userId: string) => collection(db, 'users', userId, 'reviews');

const nullableFields = new Set([
  'completed_at',
  'mastered_at',
  'archive_at',
  'delete_at',
  'last_reviewed_at',
  'ai_summary',
  'ai_flowchart',
  'notes',
]);

const toIsoString = (value: any, fallback: string): string => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return new Date(value).toISOString();
};

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

const normalizeReviewHistory = (history: any): ReviewHistory[] => {
  if (!Array.isArray(history)) return [];
  return history.map((entry) => ({
    date: entry.date,
    performance: entry.performance,
    time_spent_seconds: entry.time_spent_seconds || 0,
    stage_index: entry.stage_index,
    interval: entry.interval,
    easiness_factor: entry.easiness_factor,
  }));
};

const transformItem = (id: string, item: any): MemoryItem => {
  const createdAt = toIsoString(item.created_at, new Date().toISOString());
  const updatedAt = toIsoString(item.updated_at, createdAt);
  const stage = normalizeStage(item);
  const cycleStartedAt = toIsoDate(item.cycle_started_at || createdAt || new Date());
  const status = normalizeStatus(item.status);

  return {
    id,
    user_id: item.user_id,
    category_id: item.category_id,
    title: item.title,
    content: item.content,
    content_type: (item.content_type || 'text') as ContentType,
    attachments: (item.attachments || []) as Attachment[],
    difficulty: (item.difficulty || 'medium') as Difficulty,
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
    last_reviewed_at: item.last_reviewed_at || undefined,
    review_history: normalizeReviewHistory(item.review_history),
    review_template: item.review_template || '1-4-7',
    current_stage_index: item.current_stage_index ?? stage,
    review_stage: stage,
    completed_at: item.completed_at || undefined,
    mastered_at: item.mastered_at || item.completed_at || undefined,
    archive_at: item.archive_at || undefined,
    delete_at: item.delete_at || undefined,
    ai_summary: item.ai_summary || undefined,
    ai_flowchart: item.ai_flowchart || undefined,
    ai_bullet_points: Array.isArray(item.ai_bullet_points) ? item.ai_bullet_points : [],
    notes: item.notes || undefined,
    is_bookmarked: item.is_bookmarked ?? false,
    created_at: createdAt,
    updated_at: updatedAt,
  };
};

const stripUndefinedForUpdate = (data: Record<string, any>): Record<string, any> => {
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      if (nullableFields.has(key)) {
        cleaned[key] = null;
      }
      continue;
    }
    cleaned[key] = value;
  }

  return cleaned;
};

const sortByCreatedAtDesc = (a: MemoryItem, b: MemoryItem) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

const sortByDueThenCreated = (a: MemoryItem, b: MemoryItem) => {
  const dueA = a.next_review_date ? new Date(`${a.next_review_date}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
  const dueB = b.next_review_date ? new Date(`${b.next_review_date}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
  if (dueA !== dueB) return dueA - dueB;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
};

export const memoryItemService = {
  async getMemoryItems(): Promise<MemoryItem[]> {
    const userId = await requireAuth();
    const snapshot = await getDocs(userMemoryItemsCollection(userId));

    return snapshot.docs
      .map((itemDoc) => transformItem(itemDoc.id, itemDoc.data()))
      .sort(sortByCreatedAtDesc);
  },

  async getMemoryItemById(id: string): Promise<MemoryItem | null> {
    const userId = await requireAuth();
    const itemRef = doc(db, 'users', userId, 'memory_items', id);
    const itemSnap = await getDoc(itemRef);

    if (!itemSnap.exists()) {
      return null;
    }

    return transformItem(itemSnap.id, itemSnap.data());
  },

  async getItemsDueToday(): Promise<MemoryItem[]> {
    const today = new Date().toISOString().split('T')[0];
    const items = await this.getMemoryItems();
    return items
      .filter((item) => item.status === 'active' && !!item.next_review_date && item.next_review_date <= today)
      .sort(sortByDueThenCreated);
  },

  async getItemsByCategory(categoryId: string): Promise<MemoryItem[]> {
    const items = await this.getMemoryItems();
    return items
      .filter((item) => item.category_id === categoryId)
      .sort(sortByCreatedAtDesc);
  },

  async getItemsByStatus(status: ReviewStatus): Promise<MemoryItem[]> {
    const items = await this.getMemoryItems();
    return items
      .filter((item) => item.status === status)
      .sort(sortByCreatedAtDesc);
  },

  async createMemoryItem(item: Omit<MemoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<MemoryItem> {
    const userId = await requireAuth();

    const title = (item.title || '').trim();
    const content = (item.content || '').trim();
    if (!title) throw new Error('Title is required');
    if (!content) throw new Error('Content is required');
    if (title.length > 500) throw new Error('Title must be under 500 characters');

    const now = new Date().toISOString();
    const cycleStartedAt = toIsoDate(item.cycle_started_at || now);
    const reviewStage = 0;
    const nextReviewDate = getScheduledDateForStage(cycleStartedAt, reviewStage);

    const collectionRef = userMemoryItemsCollection(userId);
    const itemRef = doc(collectionRef);

    const insertData = {
      user_id: userId,
      category_id: item.category_id,
      title,
      content,
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

    await setDoc(itemRef, insertData);
    return transformItem(itemRef.id, insertData);
  },

  async updateMemoryItem(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem> {
    const userId = await requireAuth();
    const itemRef = doc(db, 'users', userId, 'memory_items', id);
    const itemSnap = await getDoc(itemRef);

    if (!itemSnap.exists()) {
      throw new Error('Memory item not found');
    }

    const updateData = stripUndefinedForUpdate({
      ...updates,
      updated_at: new Date().toISOString(),
    });

    delete updateData.id;
    delete updateData.user_id;
    delete updateData.created_at;

    if (updateData.next_review_date === '') {
      updateData.next_review_date = '';
    }

    await setDoc(itemRef, updateData, { merge: true });
    const updatedSnap = await getDoc(itemRef);

    if (!updatedSnap.exists()) {
      throw new Error('Memory item not found after update');
    }

    return transformItem(updatedSnap.id, updatedSnap.data());
  },

  async completeReview(
    id: string,
    performance: Performance,
    timeSpentSeconds?: number,
    scheduledDateOverride?: string,
  ): Promise<MemoryItem | null> {
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

    const reviewRef = doc(userReviewsCollection(userId));
    const scheduledDate = scheduledDateOverride || item.next_review_date || eventDate;

    await setDoc(reviewRef, {
      user_id: userId,
      memory_item_id: id,
      scheduled_date: scheduledDate,
      completed_date: now,
      performance,
      time_spent_seconds: timeSpentSeconds ?? 0,
      notes: null,
      created_at: now,
    });

    return updatedItem;
  },

  async processLifecycle(): Promise<{ archived: number; deleted: number }> {
    // Intentionally no-op: keep user items indefinitely unless manually deleted.
    return { archived: 0, deleted: 0 };
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
    const completedAt = new Date().toISOString();

    return this.updateMemoryItem(id, {
      status: 'completed',
      review_stage: DECISION_STAGE,
      current_stage_index: DECISION_STAGE,
      repetition: DECISION_STAGE,
      interval: 0,
      next_review_date: '',
      completed_at: completedAt,
      mastered_at: completedAt,
      delete_at: undefined,
      review_template: '1-4-7',
    });
  },

  async deleteMemoryItem(id: string): Promise<void> {
    const userId = await requireAuth();
    const item = await this.getMemoryItemById(id);

    await deleteDoc(doc(db, 'users', userId, 'memory_items', id));

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

  async searchMemoryItems(queryText: string): Promise<MemoryItem[]> {
    const normalized = queryText.trim().toLowerCase();
    if (!normalized) return [];

    const items = await this.getMemoryItems();
    return items
      .filter((item) => {
        const searchable = `${item.title}\n${item.content}`.toLowerCase();
        return searchable.includes(normalized);
      })
      .slice(0, 100);
  },
};
