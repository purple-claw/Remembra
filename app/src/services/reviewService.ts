import { db, requireAuth } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import type { Review, Performance } from '@/types';

// Helper to transform Firestore document to Review
const transformReview = (id: string, data: any): Review => ({
  id,
  memory_item_id: data.memory_item_id,
  scheduled_date: data.scheduled_date,
  completed_date: data.completed_date,
  performance: data.performance as Performance | undefined,
  time_spent_seconds: data.time_spent_seconds,
  notes: data.notes,
});

export const reviewService = {
  // Get all reviews for current user
  async getReviews(): Promise<Review[]> {
    const userId = requireAuth();

    const q = query(
      collection(db, 'reviews'),
      where('user_id', '==', userId),
      orderBy('scheduled_date', 'asc'),
    );
    const snap = await getDocs(q);

    return snap.docs.map(d => transformReview(d.id, d.data()));
  },

  // Get reviews scheduled for a specific date
  async getReviewsByDate(date: string): Promise<Review[]> {
    const userId = requireAuth();

    const q = query(
      collection(db, 'reviews'),
      where('user_id', '==', userId),
      where('scheduled_date', '==', date),
    );
    const snap = await getDocs(q);

    return snap.docs.map(d => transformReview(d.id, d.data()));
  },

  // Get reviews in an inclusive date range
  async getReviewsInRange(startDate: string, endDate: string): Promise<Review[]> {
    const userId = requireAuth();

    const q = query(
      collection(db, 'reviews'),
      where('user_id', '==', userId),
      where('scheduled_date', '>=', startDate),
      where('scheduled_date', '<=', endDate),
      orderBy('scheduled_date', 'asc'),
    );
    const snap = await getDocs(q);

    return snap.docs.map(d => transformReview(d.id, d.data()));
  },

  // Get pending (incomplete) reviews
  async getPendingReviews(): Promise<Review[]> {
    const userId = requireAuth();
    const today = new Date().toISOString().split('T')[0];

    const q = query(
      collection(db, 'reviews'),
      where('user_id', '==', userId),
      where('scheduled_date', '<=', today),
      where('completed_date', '==', null),
      orderBy('scheduled_date', 'asc'),
    );
    const snap = await getDocs(q);

    return snap.docs.map(d => transformReview(d.id, d.data()));
  },

  // Create a new review
  async createReview(review: Omit<Review, 'id'>): Promise<Review> {
    const userId = requireAuth();

    const insertData = {
      user_id: userId,
      memory_item_id: review.memory_item_id,
      scheduled_date: review.scheduled_date,
      completed_date: review.completed_date || null,
      performance: review.performance || null,
      time_spent_seconds: review.time_spent_seconds || null,
      notes: review.notes || null,
      created_at: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'reviews'), insertData);
    return transformReview(docRef.id, insertData);
  },

  // Complete a review
  async completeReview(
    id: string,
    performance: Performance,
    timeSpentSeconds: number,
    notes?: string,
  ): Promise<Review> {
    requireAuth();
    const docRef = doc(db, 'reviews', id);

    const updateData = {
      completed_date: new Date().toISOString(),
      performance,
      time_spent_seconds: timeSpentSeconds,
      notes: notes || null,
    };

    await updateDoc(docRef, updateData);

    const snap = await getDoc(docRef);
    return transformReview(snap.id, snap.data());
  },

  // Get review statistics for date range
  async getReviewStats(startDate: string, endDate: string) {
    const userId = requireAuth();

    const q = query(
      collection(db, 'reviews'),
      where('user_id', '==', userId),
      where('scheduled_date', '>=', startDate),
      where('scheduled_date', '<=', endDate),
    );
    const snap = await getDocs(q);

    // Aggregate by date
    const stats: Record<string, { scheduled: number; completed: number }> = {};

    for (const d of snap.docs) {
      const reviewData = d.data();
      if (!stats[reviewData.scheduled_date]) {
        stats[reviewData.scheduled_date] = { scheduled: 0, completed: 0 };
      }
      stats[reviewData.scheduled_date].scheduled++;
      if (reviewData.completed_date) {
        stats[reviewData.scheduled_date].completed++;
      }
    }

    return stats;
  },

  // Delete a review
  async deleteReview(id: string): Promise<void> {
    await deleteDoc(doc(db, 'reviews', id));
  },
};
