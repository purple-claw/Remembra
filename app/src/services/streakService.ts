/* eslint-disable @typescript-eslint/no-explicit-any */
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db, requireAuth } from '@/lib/firebase';
import { AppError, ErrorCode, createAppError, failure, success, type Result } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { StreakEntry } from '@/types';

const userStreakEntriesCollection = (userId: string) => collection(db, 'users', userId, 'streak_entries');

const transformStreakEntry = (id: string, data: any): StreakEntry => ({
  id,
  user_id: data.user_id,
  date: data.date,
  reviews_completed: data.reviews_completed || 0,
  streak_broken: data.streak_broken || false,
});

const getEntryDocForDate = async (userId: string, date: string) => {
  const entryQuery = query(userStreakEntriesCollection(userId), where('date', '==', date));
  const snapshot = await getDocs(entryQuery);
  if (snapshot.empty) return null;
  return snapshot.docs[0];
};

const updateProfileStreakValue = async (userId: string, streak: number): Promise<Result<void>> => {
  const profileRef = doc(db, 'profiles', userId);
  try {
    await setDoc(profileRef, {
      streak_count: streak,
      updated_at: new Date().toISOString(),
    }, { merge: true });
    return success(undefined);
  } catch (error) {
    return failure(createAppError(error, {
      code: ErrorCode.DATABASE_ERROR,
      message: 'Failed to update profile streak value',
    }));
  }
};

export const streakService = {
  async getStreakEntries(): Promise<Result<StreakEntry[]>> {
    try {
      const userId = await requireAuth();
      const snapshot = await getDocs(userStreakEntriesCollection(userId));

      return success(snapshot.docs
        .map((entryDoc) => transformStreakEntry(entryDoc.id, entryDoc.data()))
        .sort((a, b) => b.date.localeCompare(a.date)));
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to load streak entries',
      });
      logger.error('streakService.getStreakEntries failed', appError as Error);
      return failure(appError);
    }
  },

  async getStreakEntryByDate(date: string): Promise<Result<StreakEntry | null>> {
    try {
      const userId = await requireAuth();
      const entryDoc = await getEntryDocForDate(userId, date);

      if (!entryDoc) {
        return success(null);
      }

      return success(transformStreakEntry(entryDoc.id, entryDoc.data()));
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to load streak entry',
      });
      logger.error('streakService.getStreakEntryByDate failed', appError as Error, { date });
      return failure(appError);
    }
  },

  async recordStreak(reviewsCompleted: number): Promise<Result<StreakEntry>> {
    try {
      const userId = await requireAuth();
      const today = new Date().toISOString().split('T')[0];
      const existingDoc = await getEntryDocForDate(userId, today);
      const now = new Date().toISOString();

      if (existingDoc) {
        await setDoc(existingDoc.ref, {
          reviews_completed: reviewsCompleted,
          updated_at: now,
        }, { merge: true });

        const updated = await getDoc(existingDoc.ref);
        if (!updated.exists()) {
          return failure(new AppError({
            code: ErrorCode.NOT_FOUND,
            message: 'Unable to update streak entry',
            statusCode: 404,
          }));
        }

        return success(transformStreakEntry(updated.id, updated.data()));
      }

      const entryRef = doc(userStreakEntriesCollection(userId));
      const insertData = {
        user_id: userId,
        date: today,
        reviews_completed: reviewsCompleted,
        streak_broken: false,
        created_at: now,
        updated_at: now,
      };

      await setDoc(entryRef, insertData);
      const profileUpdateResult = await this.updateProfileStreak();
      if (!profileUpdateResult.success) {
        return profileUpdateResult;
      }

      return success(transformStreakEntry(entryRef.id, insertData));
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to record streak',
      });
      logger.error('streakService.recordStreak failed', appError as Error);
      return failure(appError);
    }
  },

  async recordReviewCompletion(): Promise<Result<void>> {
    try {
      const userId = await requireAuth();
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const existingDoc = await getEntryDocForDate(userId, today);

      if (existingDoc) {
        const data = existingDoc.data() as any;
        const nextCount = (data.reviews_completed || 0) + 1;
        await setDoc(existingDoc.ref, {
          reviews_completed: nextCount,
          updated_at: now,
        }, { merge: true });
        return success(undefined);
      }

      const entryRef = doc(userStreakEntriesCollection(userId));
      await setDoc(entryRef, {
        user_id: userId,
        date: today,
        reviews_completed: 1,
        streak_broken: false,
        created_at: now,
        updated_at: now,
      });

      return this.updateProfileStreak();
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to record review completion streak',
      });
      logger.error('streakService.recordReviewCompletion failed', appError as Error);
      return failure(appError);
    }
  },

  async updateProfileStreak(): Promise<Result<void>> {
    const userId = await requireAuth();
    const entriesResult = await this.getStreakEntries();
    if (!entriesResult.success) {
      return entriesResult;
    }
    const entries = entriesResult.data;

    let streak = 0;
    const today = new Date();

    for (let i = 0; i < entries.length; i++) {
      const entryDate = new Date(entries[i].date);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      if (entryDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
        if (!entries[i].streak_broken && entries[i].reviews_completed > 0) {
          streak += 1;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return updateProfileStreakValue(userId, streak);
  },

  async checkStreakStatus(): Promise<Result<{ streakBroken: boolean; currentStreak: number }>> {
    try {
      const userId = await requireAuth();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const yesterdayEntryResult = await this.getStreakEntryByDate(yesterdayStr);
      if (!yesterdayEntryResult.success) {
        return yesterdayEntryResult;
      }

      const yesterdayEntry = yesterdayEntryResult.data;
      const streakBroken = !yesterdayEntry || yesterdayEntry.reviews_completed === 0;

      const profileSnap = await getDoc(doc(db, 'profiles', userId));
      const profileData = profileSnap.exists() ? (profileSnap.data() as any) : null;

      return success({
        streakBroken,
        currentStreak: profileData?.streak_count || 0,
      });
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to check streak status',
      });
      logger.error('streakService.checkStreakStatus failed', appError as Error);
      return failure(appError);
    }
  },

  async getStreakStats(): Promise<Result<{
    currentStreak: number;
    longestStreak: number;
    totalDaysActive: number;
    averageReviewsPerDay: number;
  }>> {
    try {
      const userId = await requireAuth();
      const entriesResult = await this.getStreakEntries();
      if (!entriesResult.success) {
        return entriesResult;
      }

      const entries = entriesResult.data;
      const profileSnap = await getDoc(doc(db, 'profiles', userId));
      const profileData = profileSnap.exists() ? (profileSnap.data() as any) : null;

      let longestStreak = 0;
      let currentRun = 0;

      [...entries].reverse().forEach((entry) => {
        if (!entry.streak_broken && entry.reviews_completed > 0) {
          currentRun += 1;
          longestStreak = Math.max(longestStreak, currentRun);
        } else {
          currentRun = 0;
        }
      });

      const totalDaysActive = entries.filter((entry) => entry.reviews_completed > 0).length;
      const totalReviews = entries.reduce((sum, entry) => sum + (entry.reviews_completed || 0), 0);

      return success({
        currentStreak: profileData?.streak_count || 0,
        longestStreak,
        totalDaysActive,
        averageReviewsPerDay: totalDaysActive > 0 ? Math.round(totalReviews / totalDaysActive) : 0,
      });
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to get streak stats',
      });
      logger.error('streakService.getStreakStats failed', appError as Error);
      return failure(appError);
    }
  },
};
