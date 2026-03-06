/* eslint-disable @typescript-eslint/no-explicit-any */
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db, requireAuth } from '@/lib/firebase';
import type { Achievement } from '@/types';

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

const userAchievementsCollection = (userId: string) => collection(db, 'users', userId, 'achievements');

const transformAchievement = (id: string, data: any): Achievement => ({
  id,
  name: data.name,
  description: data.description,
  icon: data.icon,
  unlocked_at: data.unlocked_at || undefined,
  progress: data.progress || 0,
  max_progress: data.max_progress,
});

export const achievementService = {
  async getAchievements(): Promise<Achievement[]> {
    const userId = await requireAuth();
    const snapshot = await getDocs(userAchievementsCollection(userId));

    return snapshot.docs
      .map((achievementDoc) => transformAchievement(achievementDoc.id, achievementDoc.data()))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async getUnlockedAchievements(): Promise<Achievement[]> {
    const achievements = await this.getAchievements();
    return achievements
      .filter((achievement) => !!achievement.unlocked_at)
      .sort((a, b) => String(b.unlocked_at || '').localeCompare(String(a.unlocked_at || '')));
  },

  async updateProgress(id: string, progress: number): Promise<Achievement> {
    const userId = await requireAuth();
    const achievementRef = doc(db, 'users', userId, 'achievements', id);
    const current = await getDoc(achievementRef);

    if (!current.exists()) {
      throw new Error('Achievement not found');
    }

    const currentData = current.data() as any;
    const updates: Record<string, any> = { progress };

    if (progress >= currentData.max_progress && !currentData.unlocked_at) {
      updates.unlocked_at = new Date().toISOString();
    }

    await setDoc(achievementRef, updates, { merge: true });
    const updated = await getDoc(achievementRef);

    if (!updated.exists()) {
      throw new Error('Achievement not found after update');
    }

    return transformAchievement(updated.id, updated.data());
  },

  async incrementProgress(name: string, amount: number = 1): Promise<Achievement | null> {
    const userId = await requireAuth();
    const achievementQuery = query(userAchievementsCollection(userId), where('name', '==', name));
    const snapshot = await getDocs(achievementQuery);

    if (snapshot.empty) {
      return null;
    }

    const achievementDoc = snapshot.docs[0];
    const data = achievementDoc.data() as any;
    const newProgress = Math.min((data.progress || 0) + amount, data.max_progress || 0);

    return this.updateProgress(achievementDoc.id, newProgress);
  },

  async createDefaultAchievements(): Promise<Achievement[]> {
    const userId = await requireAuth();
    const now = new Date().toISOString();
    const collectionRef = userAchievementsCollection(userId);

    const created: Achievement[] = [];
    for (const achievement of DEFAULT_ACHIEVEMENTS) {
      const achievementRef = doc(collectionRef);
      const payload = {
        user_id: userId,
        ...achievement,
        unlocked_at: null,
        progress: 0,
        created_at: now,
      };

      await setDoc(achievementRef, payload);
      created.push(transformAchievement(achievementRef.id, payload));
    }

    return created;
  },

  async checkStreakAchievements(streakCount: number): Promise<void> {
    try {
      const achievements = await this.getAchievements();

      const streak7 = achievements.find((achievement) => achievement.name === '7 Day Streak');
      if (streak7) {
        await this.updateProgress(streak7.id, Math.min(streakCount, streak7.max_progress));
      }

      const streak30 = achievements.find((achievement) => achievement.name === '30 Day Streak');
      if (streak30) {
        await this.updateProgress(streak30.id, Math.min(streakCount, streak30.max_progress));
      }
    } catch (error) {
      console.warn('Failed to update streak achievements:', error);
    }
  },

  async checkReviewAchievements(totalReviews: number): Promise<void> {
    try {
      const achievements = await this.getAchievements();
      const target = achievements.find((achievement) => achievement.name === '100 Reviews');
      if (target) {
        await this.updateProgress(target.id, Math.min(totalReviews, target.max_progress));
      }
    } catch (error) {
      console.warn('Failed to update review achievements:', error);
    }
  },
};
