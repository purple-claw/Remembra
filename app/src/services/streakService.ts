/* eslint-disable @typescript-eslint/no-explicit-any */
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db, requireAuth } from '@/lib/firebase';
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

const updateProfileStreakValue = async (userId: string, streak: number): Promise<void> => {
  const profileRef = doc(db, 'profiles', userId);
  await setDoc(profileRef, {
    streak_count: streak,
    updated_at: new Date().toISOString(),
  }, { merge: true });
};

export const streakService = {
  async getStreakEntries(): Promise<StreakEntry[]> {
    const userId = await requireAuth();
    const snapshot = await getDocs(userStreakEntriesCollection(userId));

    return snapshot.docs
      .map((entryDoc) => transformStreakEntry(entryDoc.id, entryDoc.data()))
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  async getStreakEntryByDate(date: string): Promise<StreakEntry | null> {
    const userId = await requireAuth();
    const entryDoc = await getEntryDocForDate(userId, date);

    if (!entryDoc) {
      return null;
    }

    return transformStreakEntry(entryDoc.id, entryDoc.data());
  },

  async recordStreak(reviewsCompleted: number): Promise<StreakEntry> {
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
        throw new Error('Unable to update streak entry');
      }

      return transformStreakEntry(updated.id, updated.data());
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
    await this.updateProfileStreak();

    return transformStreakEntry(entryRef.id, insertData);
  },

  async recordReviewCompletion(): Promise<void> {
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
      return;
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

    await this.updateProfileStreak();
  },

  async updateProfileStreak(): Promise<void> {
    const userId = await requireAuth();
    const entries = await this.getStreakEntries();

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

    await updateProfileStreakValue(userId, streak);
  },

  async checkStreakStatus(): Promise<{ streakBroken: boolean; currentStreak: number }> {
    const userId = await requireAuth();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const yesterdayEntry = await this.getStreakEntryByDate(yesterdayStr);
    const streakBroken = !yesterdayEntry || yesterdayEntry.reviews_completed === 0;

    const profileSnap = await getDoc(doc(db, 'profiles', userId));
    const profileData = profileSnap.exists() ? (profileSnap.data() as any) : null;

    return {
      streakBroken,
      currentStreak: profileData?.streak_count || 0,
    };
  },

  async getStreakStats(): Promise<{
    currentStreak: number;
    longestStreak: number;
    totalDaysActive: number;
    averageReviewsPerDay: number;
  }> {
    const userId = await requireAuth();
    const entries = await this.getStreakEntries();
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

    return {
      currentStreak: profileData?.streak_count || 0,
      longestStreak,
      totalDaysActive,
      averageReviewsPerDay: totalDaysActive > 0 ? Math.round(totalReviews / totalDaysActive) : 0,
    };
  },
};
