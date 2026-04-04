/* eslint-disable @typescript-eslint/no-explicit-any */
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db, requireAuth } from '@/lib/firebase';
import type {
  Attachment,
  ContentType,
  Difficulty,
  MemoryItem,
  Performance,
  RecurringFrequency,
  ReviewHistory,
  ReviewStatus,
  ScheduleType,
} from '@/types';
import { processReviewCompletion } from '@/types';
import {
  DECISION_STAGE,
  MAX_ACTIVE_STAGE,
  OPTIONAL_REVIEW_DAY_30,
  THIRTY_DAY_STAGE,
  getScheduledDateForStage,
  getNextRecurringDate,
  toIsoDate,
} from '@/domain/review147';
import { AppError, ErrorCode, type Result, createAppError, failure, success } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { storageService } from './storageService';

const userMemoryItemsCollection = (userId: string) => collection(db, 'users', userId, 'memory_items');
const userReviewsCollection = (userId: string) => collection(db, 'users', userId, 'reviews');

const nullableFields = new Set([
  'completed_at',
  'mastered_at',
  'archive_at',
  'delete_at',
  'last_reviewed_at',
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
    schedule_type: (item.schedule_type || 'spaced') as ScheduleType,
    recurring_frequency: (item.recurring_frequency || 'weekly') as RecurringFrequency,
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
    next_review_date: item.next_review_date || (status === 'active'
      ? ((item.schedule_type || 'spaced') === 'recurring'
        ? getNextRecurringDate(cycleStartedAt, (item.recurring_frequency || 'weekly') as RecurringFrequency)
        : getScheduledDateForStage(cycleStartedAt, stage))
      : ''),
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

const toMemoryError = (
  error: unknown,
  message: string,
  code: ErrorCode = ErrorCode.DATABASE_ERROR,
  context?: Record<string, unknown>,
) => createAppError(error, { code, message, context });

export const memoryItemService = {
  async getMemoryItems(): Promise<Result<MemoryItem[]>> {
    try {
      const userId = await requireAuth();
      const snapshot = await getDocs(userMemoryItemsCollection(userId));
      const items = snapshot.docs
        .map((itemDoc) => transformItem(itemDoc.id, itemDoc.data()))
        .sort(sortByCreatedAtDesc);

      return success(items);
    } catch (error) {
      const appError = toMemoryError(error, 'Failed to load memory items');
      logger.error('memoryItemService.getMemoryItems failed', appError as Error);
      return failure(appError);
    }
  },

  async getMemoryItemById(id: string): Promise<Result<MemoryItem | null>> {
    try {
      if (!id?.trim()) {
        throw new AppError({ code: ErrorCode.VALIDATION_ERROR, message: 'Memory item id is required', statusCode: 400 });
      }

      const userId = await requireAuth();
      const itemRef = doc(db, 'users', userId, 'memory_items', id);
      const itemSnap = await getDoc(itemRef);

      if (!itemSnap.exists()) {
        return success(null);
      }

      return success(transformItem(itemSnap.id, itemSnap.data()));
    } catch (error) {
      const appError = toMemoryError(error, 'Failed to load memory item', ErrorCode.DATABASE_ERROR, { id });
      logger.error('memoryItemService.getMemoryItemById failed', appError as Error, { id });
      return failure(appError);
    }
  },

  async getItemsDueToday(): Promise<Result<MemoryItem[]>> {
    const today = new Date().toISOString().split('T')[0];
    const itemsResult = await this.getMemoryItems();
    if (!itemsResult.success) {
      return itemsResult;
    }

    return success(
      itemsResult.data
        .filter((item) => item.status === 'active' && !!item.next_review_date && item.next_review_date <= today)
        .sort(sortByDueThenCreated),
    );
  },

  async getItemsByCategory(categoryId: string): Promise<Result<MemoryItem[]>> {
    const itemsResult = await this.getMemoryItems();
    if (!itemsResult.success) {
      return itemsResult;
    }

    return success(
      itemsResult.data
        .filter((item) => item.category_id === categoryId)
        .sort(sortByCreatedAtDesc),
    );
  },

  async getItemsByStatus(status: ReviewStatus): Promise<Result<MemoryItem[]>> {
    const itemsResult = await this.getMemoryItems();
    if (!itemsResult.success) {
      return itemsResult;
    }

    return success(
      itemsResult.data
        .filter((item) => item.status === status)
        .sort(sortByCreatedAtDesc),
    );
  },

  async createMemoryItem(item: Omit<MemoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Result<MemoryItem>> {
    try {
      const userId = await requireAuth();

      const title = (item.title || '').trim();
      const content = (item.content || '').trim();
      if (!title) throw new AppError({ code: ErrorCode.VALIDATION_ERROR, message: 'Title is required', statusCode: 400 });
      if (!content) throw new AppError({ code: ErrorCode.VALIDATION_ERROR, message: 'Content is required', statusCode: 400 });
      if (title.length > 500) throw new AppError({ code: ErrorCode.VALIDATION_ERROR, message: 'Title must be under 500 characters', statusCode: 400 });

      const now = new Date().toISOString();
      const cycleStartedAt = toIsoDate(item.cycle_started_at || now);
      const scheduleType: ScheduleType = item.schedule_type || 'spaced';
      const recurringFrequency: RecurringFrequency = item.recurring_frequency || 'weekly';
      const reviewStage = 0;
      const nextReviewDate = scheduleType === 'recurring'
        ? getNextRecurringDate(cycleStartedAt, recurringFrequency)
        : getScheduledDateForStage(cycleStartedAt, reviewStage);

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
        schedule_type: scheduleType,
        recurring_frequency: recurringFrequency,
        next_review_date: nextReviewDate,
        cycle_started_at: cycleStartedAt,
        review_stage: reviewStage,
        review_history: item.review_history || [],
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
      const newItem = transformItem(itemRef.id, insertData);
      logger.info('memoryItemService.createMemoryItem succeeded', { userId, id: itemRef.id });
      return success(newItem);
    } catch (error) {
      const appError = toMemoryError(error, 'Failed to create memory item');
      logger.error('memoryItemService.createMemoryItem failed', appError as Error);
      return failure(appError);
    }
  },

  async updateMemoryItem(id: string, updates: Partial<MemoryItem>): Promise<Result<MemoryItem>> {
    try {
      if (!id?.trim()) {
        throw new AppError({ code: ErrorCode.VALIDATION_ERROR, message: 'Memory item id is required', statusCode: 400 });
      }

      const userId = await requireAuth();
      const itemRef = doc(db, 'users', userId, 'memory_items', id);
      const itemSnap = await getDoc(itemRef);

      if (!itemSnap.exists()) {
        throw new AppError({ code: ErrorCode.NOT_FOUND, message: 'Memory item not found', statusCode: 404 });
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
        throw new AppError({ code: ErrorCode.NOT_FOUND, message: 'Memory item not found after update', statusCode: 404 });
      }

      const updatedItem = transformItem(updatedSnap.id, updatedSnap.data());
      return success(updatedItem);
    } catch (error) {
      const appError = toMemoryError(error, 'Failed to update memory item', ErrorCode.DATABASE_ERROR, { id });
      logger.error('memoryItemService.updateMemoryItem failed', appError as Error, { id });
      return failure(appError);
    }
  },

  async completeReview(
    id: string,
    performance: Performance,
    timeSpentSeconds?: number,
    scheduledDateOverride?: string,
  ): Promise<Result<MemoryItem | null>> {
    try {
      const userId = await requireAuth();
      const itemResult = await this.getMemoryItemById(id);
      if (!itemResult.success) {
        return itemResult;
      }
      const item = itemResult.data;
      if (!item) {
        return failure(new AppError({ code: ErrorCode.NOT_FOUND, message: 'Memory item not found', statusCode: 404 }));
      }

      const result = processReviewCompletion(item, performance);
      const now = new Date().toISOString();
      const eventDate = new Date().toISOString().split('T')[0];

      if (item.schedule_type === 'recurring') {
        const recurringFrequency: RecurringFrequency = item.recurring_frequency || 'weekly';
        const nextReviewDate = getNextRecurringDate(eventDate, recurringFrequency);

        const recurringHistory: ReviewHistory[] = [
          ...item.review_history,
          {
            date: eventDate,
            performance,
            time_spent_seconds: timeSpentSeconds ?? 0,
            stage_index: item.review_stage,
            interval: recurringFrequency === 'daily' ? 1 : recurringFrequency === 'weekly' ? 7 : 30,
            easiness_factor: item.easiness_factor,
          },
        ];

        const recurringItemResult = await this.updateMemoryItem(id, {
          status: 'active',
          schedule_type: 'recurring',
          recurring_frequency: recurringFrequency,
          next_review_date: nextReviewDate,
          last_reviewed_at: now,
          review_history: recurringHistory,
          review_template: `recurring-${recurringFrequency}`,
        });

        if (!recurringItemResult.success) {
          return recurringItemResult;
        }

        const recurringReviewRef = doc(userReviewsCollection(userId));
        const recurringScheduledDate = scheduledDateOverride || item.next_review_date || eventDate;

        await setDoc(recurringReviewRef, {
          user_id: userId,
          memory_item_id: id,
          scheduled_date: recurringScheduledDate,
          completed_date: now,
          performance,
          time_spent_seconds: timeSpentSeconds ?? 0,
          notes: null,
          created_at: now,
        });

        return success(recurringItemResult.data);
      }

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

      const updatedItemResult = await this.updateMemoryItem(id, updates);
      if (!updatedItemResult.success) {
        return updatedItemResult;
      }

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

      return success(updatedItemResult.data);
    } catch (error) {
      const appError = toMemoryError(error, 'Failed to complete review', ErrorCode.DATABASE_ERROR, {
        id,
        performance,
      });
      logger.error('memoryItemService.completeReview failed', appError as Error, { id, performance });
      return failure(appError);
    }
  },

  async processLifecycle(): Promise<Result<{ archived: number; deleted: number }>> {
    // Intentionally no-op: keep user items indefinitely unless manually deleted.
    return success({ archived: 0, deleted: 0 });
  },

  async scheduleThirtyDayReview(id: string): Promise<Result<MemoryItem>> {
    const itemResult = await this.getMemoryItemById(id);
    if (!itemResult.success) {
      return itemResult;
    }
    const item = itemResult.data;
    if (!item) {
      return failure(new AppError({ code: ErrorCode.NOT_FOUND, message: 'Memory item not found', statusCode: 404 }));
    }

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

  async completeTopic(id: string): Promise<Result<MemoryItem>> {
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

  async deleteMemoryItem(id: string): Promise<Result<void>> {
    try {
      const userId = await requireAuth();
      const itemResult = await this.getMemoryItemById(id);
      if (!itemResult.success) {
        return itemResult;
      }

      await deleteDoc(doc(db, 'users', userId, 'memory_items', id));

      if (itemResult.data?.attachments?.length) {
        const removeResult = await storageService.removeAttachments(itemResult.data.attachments);
        if (!removeResult.success) {
          logger.warn('memoryItemService.deleteMemoryItem attachment cleanup failed', {
            id,
            error: removeResult.error.message,
          });
        }
      }

      return success(undefined);
    } catch (error) {
      const appError = toMemoryError(error, 'Failed to delete memory item', ErrorCode.DATABASE_ERROR, { id });
      logger.error('memoryItemService.deleteMemoryItem failed', appError as Error, { id });
      return failure(appError);
    }
  },

  async archiveMemoryItem(id: string): Promise<Result<MemoryItem>> {
    return this.updateMemoryItem(id, { status: 'archived' });
  },

  async restoreMemoryItem(id: string): Promise<Result<MemoryItem>> {
    return this.updateMemoryItem(id, { status: 'active' });
  },

  async searchMemoryItems(queryText: string): Promise<Result<MemoryItem[]>> {
    const normalized = queryText.trim().toLowerCase();
    if (!normalized) return success([]);

    const itemsResult = await this.getMemoryItems();
    if (!itemsResult.success) {
      return itemsResult;
    }

    return success(
      itemsResult.data
        .filter((item) => {
          const searchable = `${item.title}\n${item.content}`.toLowerCase();
          return searchable.includes(normalized);
        })
        .slice(0, 100),
    );
  },
};
