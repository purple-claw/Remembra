import { getSupabase, requireAuth } from '@/lib/supabase';
import type { StreakEntry } from '@/types';

const transformStreakEntry = (data: any): StreakEntry => ({
  id: data.id,
  user_id: data.user_id,
  date: data.date,
  reviews_completed: data.reviews_completed,
  streak_broken: data.streak_broken,
});

export const streakService = {
  // Get all streak entries for the user
  async getStreakEntries(): Promise<StreakEntry[]> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const { data, error } = await supabase
      .from('streak_entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error fetching streak entries:', error);
      throw error;
    }
    
    return (data || []).map(transformStreakEntry);
  },

  // Get streak entry for a specific date
  async getStreakEntryByDate(date: string): Promise<StreakEntry | null> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const { data, error } = await supabase
      .from('streak_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching streak entry:', error);
      throw error;
    }
    
    return data ? transformStreakEntry(data) : null;
  },

  // Record a streak entry for today
  async recordStreak(reviewsCompleted: number): Promise<StreakEntry> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    const today = new Date().toISOString().split('T')[0];
    
    // Check if entry already exists
    const existing = await this.getStreakEntryByDate(today);
    
    if (existing) {
      // Update existing entry
      const { data, error } = await supabase
        .from('streak_entries')
        .update({ reviews_completed: reviewsCompleted })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating streak entry:', error);
        throw error;
      }
      
      return transformStreakEntry(data);
    }
    
    // Create new entry
    const { data, error } = await supabase
      .from('streak_entries')
      .insert({
        user_id: userId,
        date: today,
        reviews_completed: reviewsCompleted,
        streak_broken: false,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating streak entry:', error);
      throw error;
    }
    
    // Update profile streak
    await this.updateProfileStreak();
    
    return transformStreakEntry(data);
  },

  // Record a single review completion (increment today's count)
  async recordReviewCompletion(): Promise<void> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    const today = new Date().toISOString().split('T')[0];
    
    // Check if entry already exists
    const existing = await this.getStreakEntryByDate(today);
    
    if (existing) {
      // Increment existing entry
      await supabase
        .from('streak_entries')
        .update({ reviews_completed: existing.reviews_completed + 1 })
        .eq('id', existing.id);
    } else {
      // Create new entry with 1 review
      await supabase
        .from('streak_entries')
        .insert({
          user_id: userId,
          date: today,
          reviews_completed: 1,
          streak_broken: false,
        });
      
      // Update profile streak
      await this.updateProfileStreak();
    }
  },

  // Update profile streak count
  async updateProfileStreak(): Promise<void> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    // Get recent streak entries
    const { data: entries, error } = await supabase
      .from('streak_entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(100);
    
    if (error) {
      console.error('Error fetching streak entries:', error);
      throw error;
    }
    
    const entriesData = (entries || []) as any[];
    
    // Calculate current streak
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < entriesData.length; i++) {
      const entryDate = new Date(entriesData[i].date);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      
      // Check if this entry is for the expected date in the streak
      if (entryDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
        if (!entriesData[i].streak_broken && entriesData[i].reviews_completed > 0) {
          streak++;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    
    // Update profile
    await supabase
      .from('profiles')
      .update({ streak_count: streak })
      .eq('id', userId);
  },

  // Check and handle broken streaks
  async checkStreakStatus(): Promise<{ streakBroken: boolean; currentStreak: number }> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Check if yesterday has an entry with reviews
    const { data: yesterdayEntry } = await supabase
      .from('streak_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', yesterdayStr)
      .maybeSingle();
    
    const entryData = yesterdayEntry as any;
    const streakBroken = !entryData || entryData.reviews_completed === 0;
    
    // Get current streak count from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('streak_count')
      .eq('id', userId)
      .single();
    
    const profileData = profile as any;
    
    return {
      streakBroken,
      currentStreak: profileData?.streak_count || 0,
    };
  },

  // Get streak statistics
  async getStreakStats(): Promise<{
    currentStreak: number;
    longestStreak: number;
    totalDaysActive: number;
    averageReviewsPerDay: number;
  }> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    // Get all streak entries
    const { data: entries, error } = await supabase
      .from('streak_entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });
    
    if (error) {
      console.error('Error fetching streak entries:', error);
      throw error;
    }
    
    const entriesData = (entries || []) as any[];
    
    // Get current streak from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('streak_count')
      .eq('id', userId)
      .single();
    
    const profileData = profile as any;
    
    // Calculate longest streak
    let longestStreak = 0;
    let currentRun = 0;
    
    for (const entry of entriesData) {
      if (!entry.streak_broken && entry.reviews_completed > 0) {
        currentRun++;
        longestStreak = Math.max(longestStreak, currentRun);
      } else {
        currentRun = 0;
      }
    }
    
    // Calculate total active days
    const totalDaysActive = entriesData.filter(e => e.reviews_completed > 0).length;
    
    // Calculate average reviews per day
    const totalReviews = entriesData.reduce((acc, e) => acc + (e.reviews_completed || 0), 0);
    const averageReviewsPerDay = totalDaysActive > 0
      ? Math.round(totalReviews / totalDaysActive)
      : 0;
    
    return {
      currentStreak: profileData?.streak_count || 0,
      longestStreak,
      totalDaysActive,
      averageReviewsPerDay,
    };
  },
};
