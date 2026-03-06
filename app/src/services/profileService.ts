/* eslint-disable @typescript-eslint/no-explicit-any */
import { doc, getDoc, increment, setDoc } from 'firebase/firestore';
import { db, requireAuth } from '@/lib/firebase';
import type { Profile, NotificationPreferences } from '@/types';

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  daily_reminder: true,
  reminder_time: '09:00',
  streak_reminder: true,
  achievement_notifications: true,
  ai_insights: true,
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
  async getProfile(): Promise<Profile | null> {
    const userId = await requireAuth();
    const profileRef = doc(db, 'profiles', userId);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      return null;
    }

    return transformProfile(profileSnap.data());
  },

  async updateProfile(updates: Partial<Profile>): Promise<Profile> {
    const userId = await requireAuth();
    const profileRef = doc(db, 'profiles', userId);
    const currentSnap = await getDoc(profileRef);

    if (!currentSnap.exists()) {
      throw new Error('Profile not found');
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
      throw new Error('Profile not found after update');
    }

    return transformProfile(updated.data());
  },

  async updateNotificationPreferences(preferences: NotificationPreferences): Promise<Profile> {
    return this.updateProfile({ notification_preferences: preferences });
  },

  async incrementTotalReviews(): Promise<void> {
    const userId = await requireAuth();
    const profileRef = doc(db, 'profiles', userId);
    await setDoc(profileRef, {
      total_reviews: increment(1),
      updated_at: new Date().toISOString(),
    }, { merge: true });
  },

  async updateStreak(streakCount: number): Promise<void> {
    const userId = await requireAuth();
    const profileRef = doc(db, 'profiles', userId);

    await setDoc(profileRef, {
      streak_count: streakCount,
      updated_at: new Date().toISOString(),
    }, { merge: true });
  },
};
