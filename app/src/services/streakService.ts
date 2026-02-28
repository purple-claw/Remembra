import { db, requireAuth } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import type { StreakEntry } from '@/types';

const transformStreakEntry = (id: string, data: any): StreakEntry => ({
  id,
  user_id: data.user_id,
  date: data.date,
  reviews_completed: data.reviews_completed || 0,
  streak_broken: data.streak_broken ?? false,
});

export const streakService = {
  // Get all streak entries for the user
  async getStreakEntries(): Promise<StreakEntry[]> {
    const userId = requireAuth();

    const q = query(
      collection(db, 'streak_entries'),
      where('user_id', '==', userId),
      orderBy('date', 'desc'),
    );
    const snap = await getDocs(q);

    return snap.docs.map(d => transformStreakEntry(d.id, d.data()));
  },

  // Get streak entry for a specific date
  async getStreakEntryByDate(date: string): Promise<StreakEntry | null> {
    const userId = requireAuth();

    const q = query(
      collection(db, 'streak_entries'),
      where('user_id', '==', userId),
      where('date', '==', date),
    );
    const snap = await getDocs(q);

    if (snap.empty) return null;
    const d = snap.docs[0];
    return transformStreakEntry(d.id, d.data());
  },

  // Record a streak entry for today
  async recordStreak(reviewsCompleted: number): Promise<StreakEntry> {
    const userId = requireAuth();
    const today = new Date().toISOString().split('T')[0];

    // Check if entry already exists
    const existing = await this.getStreakEntryByDate(today);

    if (existing) {
      // Update existing entry
      const docRef = doc(db, 'streak_entries', existing.id);
      await updateDoc(docRef, { reviews_completed: reviewsCompleted });

      const snap = await getDoc(docRef);
      return transformStreakEntry(snap.id, snap.data());
    }

    // Create new entry
    const insertData = {
      user_id: userId,
      date: today,
      reviews_completed: reviewsCompleted,
      streak_broken: false,
      created_at: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'streak_entries'), insertData);

    // Update profile streak
    await this.updateProfileStreak();

    return transformStreakEntry(docRef.id, insertData);
  },

  // Record a single review completion (increment today's count)
  async recordReviewCompletion(): Promise<void> {
    const userId = requireAuth();
    const today = new Date().toISOString().split('T')[0];

    // Check if entry already exists
    const existing = await this.getStreakEntryByDate(today);

    if (existing) {
      // Increment existing entry
      const docRef = doc(db, 'streak_entries', existing.id);
      await updateDoc(docRef, { reviews_completed: existing.reviews_completed + 1 });
    } else {
      // Create new entry with 1 review
      await addDoc(collection(db, 'streak_entries'), {
        user_id: userId,
        date: today,
        reviews_completed: 1,
        streak_broken: false,
        created_at: new Date().toISOString(),
      });

      // Update profile streak
      await this.updateProfileStreak();
    }
  },

  // Update profile streak count
  async updateProfileStreak(): Promise<void> {
    const userId = requireAuth();

    // Get recent streak entries (sorted desc by date)
    const q = query(
      collection(db, 'streak_entries'),
      where('user_id', '==', userId),
      orderBy('date', 'desc'),
    );
    const snap = await getDocs(q);
    const entriesData = snap.docs.map(d => d.data());

    // Calculate current streak
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < entriesData.length; i++) {
      const entryDate = new Date(entriesData[i].date);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

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
    const profileRef = doc(db, 'profiles', userId);
    await updateDoc(profileRef, { streak_count: streak });
  },

  // Check and handle broken streaks
  async checkStreakStatus(): Promise<{ streakBroken: boolean; currentStreak: number }> {
    const userId = requireAuth();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Check if yesterday has an entry with reviews
    const yesterdayEntry = await this.getStreakEntryByDate(yesterdayStr);
    const streakBroken = !yesterdayEntry || yesterdayEntry.reviews_completed === 0;

    // Get current streak count from profile
    const profileRef = doc(db, 'profiles', userId);
    const profileSnap = await getDoc(profileRef);
    const profileData = profileSnap.data();

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
    const userId = requireAuth();

    // Get all streak entries
    const q = query(
      collection(db, 'streak_entries'),
      where('user_id', '==', userId),
      orderBy('date', 'asc'),
    );
    const snap = await getDocs(q);
    const entriesData = snap.docs.map(d => d.data());

    // Get current streak from profile
    const profileRef = doc(db, 'profiles', userId);
    const profileSnap = await getDoc(profileRef);
    const profileData = profileSnap.data();

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
