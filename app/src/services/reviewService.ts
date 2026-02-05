import { getSupabase, requireAuth } from '@/lib/supabase';
import type { Review, Performance } from '@/types';

// Helper to transform database record to Review
const transformReview = (data: any): Review => ({
  id: data.id,
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
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching reviews:', error);
      throw error;
    }
    
    return (data || []).map(transformReview);
  },

  // Get reviews scheduled for a specific date
  async getReviewsByDate(date: string): Promise<Review[]> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userId)
      .eq('scheduled_date', date)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching reviews by date:', error);
      throw error;
    }
    
    return (data || []).map(transformReview);
  },

  // Get pending (incomplete) reviews
  async getPendingReviews(): Promise<Review[]> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userId)
      .lte('scheduled_date', today)
      .is('completed_date', null)
      .order('scheduled_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching pending reviews:', error);
      throw error;
    }
    
    return (data || []).map(transformReview);
  },

  // Create a new review
  async createReview(review: Omit<Review, 'id'>): Promise<Review> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const insertData = {
      user_id: userId,
      memory_item_id: review.memory_item_id,
      scheduled_date: review.scheduled_date,
      completed_date: review.completed_date,
      performance: review.performance,
      time_spent_seconds: review.time_spent_seconds,
      notes: review.notes,
    };
    
    const { data, error } = await supabase
      .from('reviews')
      .insert(insertData as any)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating review:', error);
      throw error;
    }
    
    return transformReview(data);
  },

  // Complete a review
  async completeReview(
    id: string, 
    performance: Performance, 
    timeSpentSeconds: number,
    notes?: string
  ): Promise<Review> {
    const supabase = getSupabase();
    
    const updateData = {
      completed_date: new Date().toISOString(),
      performance,
      time_spent_seconds: timeSpentSeconds,
      notes,
    };
    
    const { data, error } = await supabase
      .from('reviews')
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error completing review:', error);
      throw error;
    }
    
    return transformReview(data);
  },

  // Get review statistics for date range
  async getReviewStats(startDate: string, endDate: string) {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const { data, error } = await supabase
      .from('reviews')
      .select('scheduled_date, completed_date, performance')
      .eq('user_id', userId)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate);
    
    if (error) {
      console.error('Error fetching review stats:', error);
      throw error;
    }
    
    // Aggregate by date
    const stats: Record<string, { scheduled: number; completed: number }> = {};
    
    for (const review of data || []) {
      const reviewData = review as any;
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
    const supabase = getSupabase();
    
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting review:', error);
      throw error;
    }
  },
};
