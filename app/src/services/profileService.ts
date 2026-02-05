import { getSupabase, requireAuth } from '@/lib/supabase';
import type { Profile, NotificationPreferences } from '@/types';

// Helper to transform database record to Profile
const transformProfile = (data: any): Profile => ({
  id: data.id,
  username: data.username,
  avatar_url: data.avatar_url,
  timezone: data.timezone,
  notification_preferences: (data.notification_preferences || {}) as NotificationPreferences,
  streak_count: data.streak_count,
  total_reviews: data.total_reviews,
  created_at: data.created_at,
});

export const profileService = {
  // Get current user's profile
  async getProfile(): Promise<Profile | null> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
    
    return data ? transformProfile(data) : null;
  },

  // Update profile
  async updateProfile(updates: Partial<Profile>): Promise<Profile> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.created_at;
    
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
    
    return transformProfile(data);
  },

  // Update notification preferences
  async updateNotificationPreferences(preferences: NotificationPreferences): Promise<Profile> {
    return this.updateProfile({ notification_preferences: preferences });
  },

  // Increment total reviews
  async incrementTotalReviews(): Promise<void> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    // Use direct update instead of RPC to avoid type issues
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_reviews')
      .eq('id', userId)
      .single();
    
    if (profile) {
      await supabase
        .from('profiles')
        .update({ 
          total_reviews: (profile.total_reviews || 0) + 1,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', userId);
    }
  },

  // Update streak count
  async updateStreak(streakCount: number): Promise<void> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    await supabase
      .from('profiles')
      .update({
        streak_count: streakCount,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', userId);
  },
};
