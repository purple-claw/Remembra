/* eslint-disable @typescript-eslint/no-explicit-any */
import { doc, getDoc, increment, setDoc } from 'firebase/firestore';
import { db, requireAuth } from '@/lib/firebase';
import { AppError, ErrorCode, createAppError, failure, success, type Result } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { Profile, NotificationPreferences } from '@/types';

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  daily_reminder: true,
  reminder_time: '09:00',
  streak_reminder: true,
  achievement_notifications: true,
};

const transformProfile = (data: any): Profile => ({
  id: data.id,
  username: data.username,
  avatar_url: data.avatar_url,
  timezone: data.timezone || 'UTC',
  notification_preferences: (data.notification_preferences || DEFAULT_NOTIFICATION_PREFERENCES) as NotificationPreferences,
  streak_count: data.streak_count || 0,
  total_reviews: data.total_reviews || 0,
  created_at: data.created_at || new Date().toISOString(),
});

const stripUndefined = <T extends Record<string, any>>(value: T): T => {
  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
  return Object.fromEntries(entries) as T;
};

export const profileService = {
  async getProfile(): Promise<Result<Profile | null>> {
    try {
      const userId = await requireAuth();
      const profileRef = doc(db, 'profiles', userId);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        return success(null);
      }

      return success(transformProfile(profileSnap.data()));
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to load profile',
      });
      logger.error('profileService.getProfile failed', appError as Error);
      return failure(appError);
    }
  },

  async updateProfile(updates: Partial<Profile>): Promise<Result<Profile>> {
    try {
      const userId = await requireAuth();
      const profileRef = doc(db, 'profiles', userId);
      const currentSnap = await getDoc(profileRef);

      if (!currentSnap.exists()) {
        return failure(new AppError({
          code: ErrorCode.NOT_FOUND,
          message: 'Profile not found',
          statusCode: 404,
        }));
      }

      const now = new Date().toISOString();
      const updateData = stripUndefined({
        ...updates,
        updated_at: now,
      });

      delete (updateData as any).id;
      delete (updateData as any).created_at;

      await setDoc(profileRef, updateData, { merge: true });
      const updated = await getDoc(profileRef);

      if (!updated.exists()) {
        return failure(new AppError({
          code: ErrorCode.NOT_FOUND,
          message: 'Profile not found after update',
          statusCode: 404,
        }));
      }

      return success(transformProfile(updated.data()));
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to update profile',
      });
      logger.error('profileService.updateProfile failed', appError as Error);
      return failure(appError);
    }
  },

  async updateNotificationPreferences(preferences: NotificationPreferences): Promise<Result<Profile>> {
    return this.updateProfile({ notification_preferences: preferences });
  },

  async incrementTotalReviews(): Promise<Result<void>> {
    try {
      const userId = await requireAuth();
      const profileRef = doc(db, 'profiles', userId);
      await setDoc(profileRef, {
        total_reviews: increment(1),
        updated_at: new Date().toISOString(),
      }, { merge: true });
      return success(undefined);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to increment total reviews',
      });
      logger.error('profileService.incrementTotalReviews failed', appError as Error);
      return failure(appError);
    }
  },

  async updateStreak(streakCount: number): Promise<Result<void>> {
    try {
      const userId = await requireAuth();
      const profileRef = doc(db, 'profiles', userId);

      await setDoc(profileRef, {
        streak_count: streakCount,
        updated_at: new Date().toISOString(),
      }, { merge: true });
      return success(undefined);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to update streak',
      });
      logger.error('profileService.updateStreak failed', appError as Error);
      return failure(appError);
    }
  },
};
