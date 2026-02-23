import { getSupabase, requireAuth } from '@/lib/supabase';
import type { Achievement } from '@/types';

// Default achievements to create for new users
const DEFAULT_ACHIEVEMENTS = [
  { name: '7 Day Streak', description: 'Review items for 7 consecutive days', icon: 'flame', max_progress: 7 },
  { name: '30 Day Streak', description: 'Review items for 30 consecutive days', icon: 'crown', max_progress: 30 },
  { name: '100 Reviews', description: 'Complete 100 review sessions', icon: 'target', max_progress: 100 },
  { name: 'Code Master', description: 'Master 5 programming topics', icon: 'code-2', max_progress: 5 },
  { name: 'Speed Reader', description: 'Complete a review in under 30 seconds', icon: 'zap', max_progress: 1 },
  { name: 'AI Explorer', description: 'Use AI features 10 times', icon: 'sparkles', max_progress: 10 },
  { name: 'Polyglot', description: 'Learn items in 3 different languages', icon: 'globe', max_progress: 3 },
  { name: 'Perfectionist', description: 'Get "Easy" rating 50 times in a row', icon: 'award', max_progress: 50 },
];

// Helper to transform database record to Achievement
const transformAchievement = (data: any): Achievement => ({
  id: data.id,
  name: data.name,
  description: data.description,
  icon: data.icon,
  unlocked_at: data.unlocked_at,
  progress: data.progress,
  max_progress: data.max_progress,
});

export const achievementService = {
  // Get all achievements for current user
  async getAchievements(): Promise<Achievement[]> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching achievements:', error);
      throw error;
    }
    
    return (data || []).map(transformAchievement);
  },

  // Get unlocked achievements
  async getUnlockedAchievements(): Promise<Achievement[]> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', userId)
      .not('unlocked_at', 'is', null)
      .order('unlocked_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching unlocked achievements:', error);
      throw error;
    }
    
    return (data || []).map(transformAchievement);
  },

  // Update achievement progress
  async updateProgress(id: string, progress: number): Promise<Achievement> {
    const supabase = getSupabase();
    
    // First get current achievement
    const { data: current, error: fetchError } = await supabase
      .from('achievements')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching achievement:', fetchError);
      throw fetchError;
    }
    
    const currentData = current as any;
    const updates: any = { progress };
    
    // Check if achievement should be unlocked
    if (progress >= currentData.max_progress && !currentData.unlocked_at) {
      updates.unlocked_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('achievements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating achievement:', error);
      throw error;
    }
    
    return transformAchievement(data);
  },

  // Increment achievement progress by amount
  async incrementProgress(name: string, amount: number = 1): Promise<Achievement | null> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    // Find the achievement by name
    const { data: achievement, error: fetchError } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('name', name)
      .single();
    
    if (fetchError) {
      console.error('Error fetching achievement:', fetchError);
      return null;
    }
    
    const achievementData = achievement as any;
    const newProgress = Math.min(achievementData.progress + amount, achievementData.max_progress);
    return this.updateProgress(achievementData.id, newProgress);
  },

  // Create default achievements for new user
  async createDefaultAchievements(): Promise<Achievement[]> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    const achievementsData = DEFAULT_ACHIEVEMENTS.map(a => ({
      user_id: userId,
      name: a.name,
      description: a.description,
      icon: a.icon,
      max_progress: a.max_progress,
      progress: 0,
    }));
    
    const { data, error } = await supabase
      .from('achievements')
      .insert(achievementsData as any)
      .select();
    
    if (error) {
      console.error('Error creating default achievements:', error);
      throw error;
    }
    
    return (data || []).map(transformAchievement);
  },

  // Check and update streak-related achievements
  async checkStreakAchievements(streakCount: number): Promise<void> {
    // Set progress directly to streak count (not increment)
    try {
      const achievements = await this.getAchievements();
      const streak7 = achievements.find(a => a.name === '7 Day Streak');
      if (streak7) {
        await this.updateProgress(streak7.id, Math.min(streakCount, streak7.max_progress));
      }
      const streak30 = achievements.find(a => a.name === '30 Day Streak');
      if (streak30) {
        await this.updateProgress(streak30.id, Math.min(streakCount, streak30.max_progress));
      }
    } catch (e) {
      console.warn('Failed to update streak achievements:', e);
    }
  },

  // Check and update review count achievements
  async checkReviewAchievements(totalReviews: number): Promise<void> {
    // Set progress directly to totalReviews (not increment — was causing inflation)
    try {
      const achievements = await this.getAchievements();
      const target = achievements.find(a => a.name === '100 Reviews');
      if (target) {
        await this.updateProgress(target.id, Math.min(totalReviews, target.max_progress));
      }
    } catch (e) {
      console.warn('Failed to update review achievements:', e);
    }
  },
};
