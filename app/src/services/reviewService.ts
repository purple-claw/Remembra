/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { db, requireAuth } from '@/lib/firebase';
import { AppError, ErrorCode, createAppError, failure, success, type Result } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { Review, Performance } from '@/types';

const userReviewsCollection = (userId: string) => collection(db, 'users', userId, 'reviews');

const transformReview = (id: string, data: any): Review => ({
  id,
  memory_item_id: data.memory_item_id,
  scheduled_date: data.scheduled_date,
  completed_date: data.completed_date || undefined,
  performance: data.performance as Performance | undefined,
  time_spent_seconds: data.time_spent_seconds,
  notes: data.notes || undefined,
});

const sortByScheduledThenCreated = (a: any, b: any) => {
  const byDate = String(a.scheduled_date || '').localeCompare(String(b.scheduled_date || ''));
  if (byDate !== 0) return byDate;
  return String(a.created_at || '').localeCompare(String(b.created_at || ''));
};

export const reviewService = {
  async getReviews(): Promise<Result<Review[]>> {
    try {
      const userId = await requireAuth();
      const snapshot = await getDocs(userReviewsCollection(userId));
      const reviews = snapshot.docs
        .map((reviewDoc) => ({ id: reviewDoc.id, ...reviewDoc.data() }))
        .sort(sortByScheduledThenCreated)
        .map((review) => transformReview(review.id, review));

      return success(reviews);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to load reviews',
      });
      logger.error('reviewService.getReviews failed', appError as Error);
      return failure(appError);
    }
  },

  async getReviewsByDate(date: string): Promise<Result<Review[]>> {
    const reviewsResult = await this.getReviews();
    if (!reviewsResult.success) {
      return reviewsResult;
    }
    return success(reviewsResult.data.filter((review) => review.scheduled_date === date));
  },

  async getReviewsInRange(startDate: string, endDate: string): Promise<Result<Review[]>> {
    const reviewsResult = await this.getReviews();
    if (!reviewsResult.success) {
      return reviewsResult;
    }
    return success(reviewsResult.data.filter((review) => review.scheduled_date >= startDate && review.scheduled_date <= endDate));
  },

  async getPendingReviews(): Promise<Result<Review[]>> {
    const today = new Date().toISOString().split('T')[0];
    const reviewsResult = await this.getReviews();
    if (!reviewsResult.success) {
      return reviewsResult;
    }

    return success(reviewsResult.data.filter((review) => review.scheduled_date <= today && !review.completed_date));
  },

  async createReview(review: Omit<Review, 'id'>): Promise<Result<Review>> {
    try {
      const userId = await requireAuth();
      const now = new Date().toISOString();
      const reviewRef = doc(userReviewsCollection(userId));

      const insertData = {
        user_id: userId,
        memory_item_id: review.memory_item_id,
        scheduled_date: review.scheduled_date,
        completed_date: review.completed_date || null,
        performance: review.performance || null,
        time_spent_seconds: review.time_spent_seconds || null,
        notes: review.notes || null,
        created_at: now,
      };

      await setDoc(reviewRef, insertData);
      return success(transformReview(reviewRef.id, insertData));
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to create review',
      });
      logger.error('reviewService.createReview failed', appError as Error);
      return failure(appError);
    }
  },

  async completeReview(
    id: string,
    performance: Performance,
    timeSpentSeconds: number,
    notes?: string,
  ): Promise<Result<Review>> {
    try {
      const userId = await requireAuth();
      const reviewRef = doc(db, 'users', userId, 'reviews', id);
      const current = await getDoc(reviewRef);

      if (!current.exists()) {
        return failure(new AppError({
          code: ErrorCode.NOT_FOUND,
          message: 'Review not found',
          statusCode: 404,
        }));
      }

      const updateData = {
        completed_date: new Date().toISOString(),
        performance,
        time_spent_seconds: timeSpentSeconds,
        notes: notes || null,
      };

      await setDoc(reviewRef, updateData, { merge: true });

      const updated = await getDoc(reviewRef);
      if (!updated.exists()) {
        return failure(new AppError({
          code: ErrorCode.NOT_FOUND,
          message: 'Review not found after update',
          statusCode: 404,
        }));
      }

      return success(transformReview(updated.id, updated.data()));
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to complete review',
        context: { id },
      });
      logger.error('reviewService.completeReview failed', appError as Error, { id });
      return failure(appError);
    }
  },

  async getReviewStats(startDate: string, endDate: string): Promise<Result<Record<string, { scheduled: number; completed: number }>>> {
    const reviewsResult = await this.getReviewsInRange(startDate, endDate);
    if (!reviewsResult.success) {
      return reviewsResult;
    }
    const reviews = reviewsResult.data;
    const stats: Record<string, { scheduled: number; completed: number }> = {};

    for (const review of reviews) {
      if (!stats[review.scheduled_date]) {
        stats[review.scheduled_date] = { scheduled: 0, completed: 0 };
      }
      stats[review.scheduled_date].scheduled++;
      if (review.completed_date) {
        stats[review.scheduled_date].completed++;
      }
    }

    return success(stats);
  },

  async deleteReview(id: string): Promise<Result<void>> {
    try {
      const userId = await requireAuth();
      const reviewRef = doc(db, 'users', userId, 'reviews', id);
      await deleteDoc(reviewRef);
      return success(undefined);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to delete review',
        context: { id },
      });
      logger.error('reviewService.deleteReview failed', appError as Error, { id });
      return failure(appError);
    }
  },
};
