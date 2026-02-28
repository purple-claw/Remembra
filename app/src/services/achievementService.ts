import { db, requireAuth } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';
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

// Helper to transform Firestore document to Achievement
const transformAchievement = (id: string, data: any): Achievement => ({
  id,
  name: data.name,
  description: data.description,
  icon: data.icon,
  unlocked_at: data.unlocked_at,
  progress: data.progress || 0,
  max_progress: data.max_progress,
});

export const achievementService = {
  // Get all achievements for current user
  async getAchievements(): Promise<Achievement[]> {
    const userId = requireAuth();

    const q = query(
      collection(db, 'achievements'),
      where('user_id', '==', userId),
      orderBy('created_at', 'asc'),
    );
    const snap = await getDocs(q);

    return snap.docs.map(d => transformAchievement(d.id, d.data()));
  },

  // Get unlocked achievements
  async getUnlockedAchievements(): Promise<Achievement[]> {
    const userId = requireAuth();

    const q = query(
      collection(db, 'achievements'),
      where('user_id', '==', userId),
    );
    const snap = await getDocs(q);

    return snap.docs
      .map(d => transformAchievement(d.id, d.data()))
      .filter(a => a.unlocked_at != null)
      .sort((a, b) => (b.unlocked_at || '').localeCompare(a.unlocked_at || ''));
  },

  // Update achievement progress
  async updateProgress(id: string, progress: number): Promise<Achievement> {
    const docRef = doc(db, 'achievements', id);
    const snap = await getDoc(docRef);

    if (!snap.exists()) throw new Error('Achievement not found');

    const currentData = snap.data();
    const updates: any = { progress };

    // Check if achievement should be unlocked
    if (progress >= currentData.max_progress && !currentData.unlocked_at) {
      updates.unlocked_at = new Date().toISOString();
    }

    await updateDoc(docRef, updates);

    const updated = await getDoc(docRef);
    return transformAchievement(updated.id, updated.data());
  },

  // Increment achievement progress by amount
  async incrementProgress(name: string, amount: number = 1): Promise<Achievement | null> {
    const userId = requireAuth();

    const q = query(
      collection(db, 'achievements'),
      where('user_id', '==', userId),
      where('name', '==', name),
    );
    const snap = await getDocs(q);

    if (snap.empty) return null;

    const achievementDoc = snap.docs[0];
    const achievementData = achievementDoc.data();
    const newProgress = Math.min(achievementData.progress + amount, achievementData.max_progress);
    return this.updateProgress(achievementDoc.id, newProgress);
  },

  // Create default achievements for new user
  async createDefaultAchievements(): Promise<Achievement[]> {
    const userId = requireAuth();

    const results: Achievement[] = [];
    for (const a of DEFAULT_ACHIEVEMENTS) {
      const insertData = {
        user_id: userId,
        name: a.name,
        description: a.description,
        icon: a.icon,
        max_progress: a.max_progress,
        progress: 0,
        unlocked_at: null,
        created_at: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, 'achievements'), insertData);
      results.push(transformAchievement(docRef.id, insertData));
    }
    return results;
  },

  // Check and update streak-related achievements
  async checkStreakAchievements(streakCount: number): Promise<void> {
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
