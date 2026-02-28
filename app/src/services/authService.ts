import { auth, db } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  updateEmail as firebaseUpdateEmail,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, query, where, limit as fsLimit, addDoc } from 'firebase/firestore';
import { avatarService } from './avatarService';

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export const authService = {
  // Get current user
  async getUser(): Promise<User | null> {
    return auth.currentUser;
  },

  // Sign up with email
  async signUp(email: string, password: string, _username: string): Promise<{ user: User | null; error: Error | null }> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      return { user: result.user, error: null };
    } catch (error: any) {
      return { user: null, error: error as Error };
    }
  },

  // Ensure user profile and default data exists (call after confirmed auth)
  async ensureUserSetup(userId: string, username: string, email?: string): Promise<void> {
    try {
      const defaultAvatarUrl = avatarService.generateProfileAvatarUrl({
        username,
        email,
        userId,
      });

      // Check if profile exists
      const profileRef = doc(db, 'profiles', userId);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        await setDoc(profileRef, {
          id: userId,
          username: username || 'User',
          avatar_url: defaultAvatarUrl,
          timezone: 'UTC',
          notification_preferences: {
            daily_reminder: true,
            reminder_time: '09:00',
            streak_reminder: true,
            achievement_notifications: true,
            ai_insights: true,
          },
          streak_count: 0,
          total_reviews: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        const data = profileSnap.data();
        if (!data.avatar_url) {
          await setDoc(profileRef, { avatar_url: defaultAvatarUrl, updated_at: new Date().toISOString() }, { merge: true });
        }
      }

      // Check if categories exist
      const catQuery = query(collection(db, 'categories'), where('user_id', '==', userId), fsLimit(1));
      const catSnap = await getDocs(catQuery);

      if (catSnap.empty) {
        const defaultCategories = [
          { user_id: userId, name: 'General', color: '#6366F1', icon: 'folder', order_index: 0, is_default: true, created_at: new Date().toISOString() },
          { user_id: userId, name: 'Work', color: '#10B981', icon: 'briefcase', order_index: 1, is_default: false, created_at: new Date().toISOString() },
          { user_id: userId, name: 'Personal', color: '#F59E0B', icon: 'user', order_index: 2, is_default: false, created_at: new Date().toISOString() },
        ];

        for (const cat of defaultCategories) {
          await addDoc(collection(db, 'categories'), cat);
        }
      }

      // Check if achievements exist
      const achQuery = query(collection(db, 'achievements'), where('user_id', '==', userId), fsLimit(1));
      const achSnap = await getDocs(achQuery);

      if (achSnap.empty) {
        const defaultAchievements = [
          { user_id: userId, name: 'First Steps', description: 'Complete your first review', icon: 'trophy', progress: 0, max_progress: 1, unlocked_at: null, created_at: new Date().toISOString() },
          { user_id: userId, name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: 'flame', progress: 0, max_progress: 7, unlocked_at: null, created_at: new Date().toISOString() },
          { user_id: userId, name: 'Knowledge Builder', description: 'Create 10 memory items', icon: 'brain', progress: 0, max_progress: 10, unlocked_at: null, created_at: new Date().toISOString() },
          { user_id: userId, name: 'Master Scholar', description: 'Master 5 items', icon: 'star', progress: 0, max_progress: 5, unlocked_at: null, created_at: new Date().toISOString() },
        ];

        for (const ach of defaultAchievements) {
          await addDoc(collection(db, 'achievements'), ach);
        }
      }
    } catch (err) {
      console.error('Error in ensureUserSetup:', err);
    }
  },

  // Sign in with email
  async signIn(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { user: result.user, error: null };
    } catch (error: any) {
      return { user: null, error: error as Error };
    }
  },

  // Sign in with OAuth provider (Google)
  async signInWithProvider(provider: 'google' | 'github' | 'discord'): Promise<{ error: Error | null }> {
    try {
      if (provider === 'google') {
        const googleProvider = new GoogleAuthProvider();
        await signInWithPopup(auth, googleProvider);
        return { error: null };
      }
      return { error: new Error(`Provider ${provider} not supported`) };
    } catch (error: any) {
      return { error: error as Error };
    }
  },

  // Sign out
  async signOut(): Promise<{ error: Error | null }> {
    try {
      await firebaseSignOut(auth);
      return { error: null };
    } catch (error: any) {
      return { error: error as Error };
    }
  },

  // Reset password
  async resetPassword(email: string): Promise<{ error: Error | null }> {
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (error: any) {
      return { error: error as Error };
    }
  },

  // Update password
  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    try {
      if (!auth.currentUser) throw new Error('Not authenticated');
      await firebaseUpdatePassword(auth.currentUser, newPassword);
      return { error: null };
    } catch (error: any) {
      return { error: error as Error };
    }
  },

  // Update email
  async updateEmail(newEmail: string): Promise<{ error: Error | null }> {
    try {
      if (!auth.currentUser) throw new Error('Not authenticated');
      await firebaseUpdateEmail(auth.currentUser, newEmail);
      return { error: null };
    } catch (error: any) {
      return { error: error as Error };
    }
  },

  // Subscribe to auth state changes
  onAuthStateChange(callback: (event: string, user: User | null) => void) {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        callback('SIGNED_IN', user);
      } else {
        callback('SIGNED_OUT', null);
      }
    });
    return { data: { subscription: { unsubscribe } } };
  },

  // Verify OTP - stub for Firebase
  async verifyOtp(_email: string, _token: string): Promise<{ error: Error | null }> {
    return { error: new Error('OTP verification not supported') };
  },

  // Resend confirmation - not needed with Firebase
  async resendConfirmation(_email: string): Promise<{ error: Error | null }> {
    return { error: null };
  },

  // Magic link - stub
  async signInWithMagicLink(_email: string): Promise<{ error: Error | null }> {
    return { error: new Error('Magic link not supported') };
  },
};
