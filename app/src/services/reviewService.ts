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
  async getReviews(): Promise<Review[]> {
    const userId = await requireAuth();
    const snapshot = await getDocs(userReviewsCollection(userId));

    return snapshot.docs
      .map((reviewDoc) => ({ id: reviewDoc.id, ...reviewDoc.data() }))
      .sort(sortByScheduledThenCreated)
      .map((review) => transformReview(review.id, review));
  },

  async getReviewsByDate(date: string): Promise<Review[]> {
    const reviews = await this.getReviews();
    return reviews.filter((review) => review.scheduled_date === date);
  },

  async getReviewsInRange(startDate: string, endDate: string): Promise<Review[]> {
    const reviews = await this.getReviews();
    return reviews.filter((review) => review.scheduled_date >= startDate && review.scheduled_date <= endDate);
  },

  async getPendingReviews(): Promise<Review[]> {
    const today = new Date().toISOString().split('T')[0];
    const reviews = await this.getReviews();

    return reviews.filter((review) => review.scheduled_date <= today && !review.completed_date);
  },

  async createReview(review: Omit<Review, 'id'>): Promise<Review> {
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
    return transformReview(reviewRef.id, insertData);
  },

  async completeReview(
    id: string,
    performance: Performance,
    timeSpentSeconds: number,
    notes?: string,
  ): Promise<Review> {
    const userId = await requireAuth();
    const reviewRef = doc(db, 'users', userId, 'reviews', id);
    const current = await getDoc(reviewRef);

    if (!current.exists()) {
      throw new Error('Review not found');
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
      throw new Error('Review not found after update');
    }

    return transformReview(updated.id, updated.data());
  },

  async getReviewStats(startDate: string, endDate: string) {
    const reviews = await this.getReviewsInRange(startDate, endDate);
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

    return stats;
  },

  async deleteReview(id: string): Promise<void> {
    const userId = await requireAuth();
    const reviewRef = doc(db, 'users', userId, 'reviews', id);
    await deleteDoc(reviewRef);
  },
};
