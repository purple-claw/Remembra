import { db, requireAuth } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { Profile, NotificationPreferences } from '@/types';

// Helper to transform Firestore document to Profile
const transformProfile = (id: string, data: any): Profile => ({
  id,
  username: data.username || 'User',
  avatar_url: data.avatar_url,
  timezone: data.timezone || 'UTC',
  notification_preferences: (data.notification_preferences || {}) as NotificationPreferences,
  streak_count: data.streak_count || 0,
  total_reviews: data.total_reviews || 0,
  created_at: data.created_at || new Date().toISOString(),
});

export const profileService = {
  // Get current user's profile
  async getProfile(): Promise<Profile | null> {
    const userId = requireAuth();
    const docRef = doc(db, 'profiles', userId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return null;
    return transformProfile(snap.id, snap.data());
  },

  // Update profile
  async updateProfile(updates: Partial<Profile>): Promise<Profile> {
    const userId = requireAuth();
    const docRef = doc(db, 'profiles', userId);

    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    delete updateData.id;
    delete updateData.created_at;

    await updateDoc(docRef, updateData);

    const snap = await getDoc(docRef);
    return transformProfile(snap.id, snap.data());
  },

  // Update notification preferences
  async updateNotificationPreferences(preferences: NotificationPreferences): Promise<Profile> {
    return this.updateProfile({ notification_preferences: preferences });
  },

  // Increment total reviews
  async incrementTotalReviews(): Promise<void> {
    const userId = requireAuth();
    const docRef = doc(db, 'profiles', userId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      await updateDoc(docRef, {
        total_reviews: (data.total_reviews || 0) + 1,
        updated_at: new Date().toISOString(),
      });
    }
  },

  // Update streak count
  async updateStreak(streakCount: number): Promise<void> {
    const userId = requireAuth();
    const docRef = doc(db, 'profiles', userId);

    await updateDoc(docRef, {
      streak_count: streakCount,
      updated_at: new Date().toISOString(),
    });
  },
};
