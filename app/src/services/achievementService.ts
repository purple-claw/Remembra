/* eslint-disable @typescript-eslint/no-explicit-any */
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db, requireAuth } from '@/lib/firebase';
import { AppError, ErrorCode, createAppError, failure, success, type Result } from '@/lib/errors';
import { logger } from '@/lib/logger';
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
  async getAchievements(): Promise<Result<Achievement[]>> {
    try {
      const userId = await requireAuth();
      const snapshot = await getDocs(userAchievementsCollection(userId));
      const achievements = snapshot.docs
        .map((achievementDoc) => transformAchievement(achievementDoc.id, achievementDoc.data()))
        .sort((a, b) => a.name.localeCompare(b.name));

      return success(achievements);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to load achievements',
      });
      logger.error('achievementService.getAchievements failed', appError as Error);
      return failure(appError);
    }
  },

  async getUnlockedAchievements(): Promise<Result<Achievement[]>> {
    const achievementsResult = await this.getAchievements();
    if (!achievementsResult.success) {
      return achievementsResult;
    }

    return success(
      achievementsResult.data
        .filter((achievement) => !!achievement.unlocked_at)
        .sort((a, b) => String(b.unlocked_at || '').localeCompare(String(a.unlocked_at || ''))),
    );
  },

  async updateProgress(id: string, progress: number): Promise<Result<Achievement>> {
    try {
      const userId = await requireAuth();
      const achievementRef = doc(db, 'users', userId, 'achievements', id);
      const current = await getDoc(achievementRef);

      if (!current.exists()) {
        return failure(new AppError({
          code: ErrorCode.NOT_FOUND,
          message: 'Achievement not found',
          statusCode: 404,
        }));
      }

      const currentData = current.data() as any;
      const updates: Record<string, any> = { progress };

      if (progress >= currentData.max_progress && !currentData.unlocked_at) {
        updates.unlocked_at = new Date().toISOString();
      }

      await setDoc(achievementRef, updates, { merge: true });
      const updated = await getDoc(achievementRef);

      if (!updated.exists()) {
        return failure(new AppError({
          code: ErrorCode.NOT_FOUND,
          message: 'Achievement not found after update',
          statusCode: 404,
        }));
      }

      return success(transformAchievement(updated.id, updated.data()));
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to update achievement progress',
        context: { id, progress },
      });
      logger.error('achievementService.updateProgress failed', appError as Error, { id, progress });
      return failure(appError);
    }
  },

  async incrementProgress(name: string, amount: number = 1): Promise<Result<Achievement | null>> {
    try {
      const userId = await requireAuth();
      const achievementQuery = query(userAchievementsCollection(userId), where('name', '==', name));
      const snapshot = await getDocs(achievementQuery);

      if (snapshot.empty) {
        return success(null);
      }

      const achievementDoc = snapshot.docs[0];
      const data = achievementDoc.data() as any;
      const newProgress = Math.min((data.progress || 0) + amount, data.max_progress || 0);

      return this.updateProgress(achievementDoc.id, newProgress);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to increment achievement progress',
        context: { name, amount },
      });
      logger.error('achievementService.incrementProgress failed', appError as Error, { name, amount });
      return failure(appError);
    }
  },

  async createDefaultAchievements(): Promise<Result<Achievement[]>> {
    try {
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

      return success(created);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to create default achievements',
      });
      logger.error('achievementService.createDefaultAchievements failed', appError as Error);
      return failure(appError);
    }
  },

  async ensureDefaultAchievements(existing: Achievement[] = []): Promise<Result<Achievement[]>> {
    try {
      const userId = await requireAuth();
      const existingNames = new Set(existing.map((achievement) => achievement.name));
      const missing = DEFAULT_ACHIEVEMENTS.filter((achievement) => !existingNames.has(achievement.name));

      if (missing.length === 0) {
        return success(existing);
      }

      const now = new Date().toISOString();
      const collectionRef = userAchievementsCollection(userId);

      await Promise.all(missing.map(async (achievement) => {
        const achievementRef = doc(collectionRef);
        const payload = {
          user_id: userId,
          ...achievement,
          unlocked_at: null,
          progress: 0,
          created_at: now,
        };
        await setDoc(achievementRef, payload);
      }));

      const refreshed = await this.getAchievements();
      if (!refreshed.success) return refreshed;
      return success(refreshed.data);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to ensure default achievements',
      });
      logger.error('achievementService.ensureDefaultAchievements failed', appError as Error);
      return failure(appError);
    }
  },

  async checkStreakAchievements(streakCount: number): Promise<Result<void>> {
    try {
      const achievementsResult = await this.getAchievements();
      if (!achievementsResult.success) {
        return achievementsResult;
      }
      const achievements = achievementsResult.data;

      const streak7 = achievements.find((achievement) => achievement.name === '7 Day Streak');
      if (streak7) {
        const result = await this.updateProgress(streak7.id, Math.min(streakCount, streak7.max_progress));
        if (!result.success) return result;
      }

      const streak30 = achievements.find((achievement) => achievement.name === '30 Day Streak');
      if (streak30) {
        const result = await this.updateProgress(streak30.id, Math.min(streakCount, streak30.max_progress));
        if (!result.success) return result;
      }
      return success(undefined);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to update streak achievements',
      });
      logger.warn('achievementService.checkStreakAchievements failed', { error: appError.message });
      return failure(appError);
    }
  },

  async checkReviewAchievements(totalReviews: number): Promise<Result<void>> {
    try {
      const achievementsResult = await this.getAchievements();
      if (!achievementsResult.success) {
        return achievementsResult;
      }
      const achievements = achievementsResult.data;
      const target = achievements.find((achievement) => achievement.name === '100 Reviews');
      if (target) {
        const result = await this.updateProgress(target.id, Math.min(totalReviews, target.max_progress));
        if (!result.success) return result;
      }
      return success(undefined);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to update review achievements',
      });
      logger.warn('achievementService.checkReviewAchievements failed', { error: appError.message });
      return failure(appError);
    }
  },
};
