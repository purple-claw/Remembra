import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  updateProfile as firebaseUpdateProfile,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, setDoc } from 'firebase/firestore';
import { auth, db, waitForAuthInitialization } from '@/lib/firebase';
import { avatarService } from './avatarService';
import type { AppSession, AppUser, AuthChangeEvent } from '@/types/auth';

export interface AuthState {
  user: AppUser | null;
  session: AppSession | null;
  loading: boolean;
}

const GOOGLE_PROVIDER = new GoogleAuthProvider();
GOOGLE_PROVIDER.setCustomParameters({ prompt: 'select_account' });

const EMAIL_LINK_STORAGE_KEY = 'remembra-email-link-address';

const defaultNotificationPreferences = {
  daily_reminder: true,
  reminder_time: '09:00',
  streak_reminder: true,
  achievement_notifications: true,
  ai_insights: true,
};

const defaultCategories = [
  { name: 'General', color: '#6366F1', icon: 'folder', order_index: 0, is_default: true },
  { name: 'Work', color: '#10B981', icon: 'briefcase', order_index: 1, is_default: false },
  { name: 'Personal', color: '#F59E0B', icon: 'user', order_index: 2, is_default: false },
];

const defaultAchievements = [
  { name: 'First Steps', description: 'Complete your first review', icon: 'trophy', progress: 0, max_progress: 1 },
  { name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: 'flame', progress: 0, max_progress: 7 },
  { name: 'Knowledge Builder', description: 'Create 10 memory items', icon: 'brain', progress: 0, max_progress: 10 },
  { name: 'Master Scholar', description: 'Master 5 items', icon: 'star', progress: 0, max_progress: 5 },
];

const toAppUser = (user: FirebaseUser): AppUser => {
  const username = user.displayName || user.email?.split('@')[0] || 'User';
  return {
    id: user.uid,
    email: user.email,
    user_metadata: {
      username,
      avatar_url: user.photoURL || undefined,
    },
    email_confirmed_at: user.emailVerified ? (user.metadata.lastSignInTime || new Date().toISOString()) : null,
  };
};

const toSession = (user: FirebaseUser | null): AppSession | null => {
  if (!user) return null;
  return { user: toAppUser(user) };
};

const getRedirectUrl = (params?: string): string => {
  const base = window.location.origin + window.location.pathname;
  return params ? `${base}${params}` : base;
};

export const authService = {
  async getSession(): Promise<AppSession | null> {
    await waitForAuthInitialization();
    return toSession(auth.currentUser);
  },

  async getUser(): Promise<AppUser | null> {
    await waitForAuthInitialization();
    return auth.currentUser ? toAppUser(auth.currentUser) : null;
  },

  async signUp(email: string, password: string, username: string): Promise<{ user: AppUser | null; error: Error | null }> {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      const avatarUrl = avatarService.generateProfileAvatarUrl({
        username,
        email,
        userId: user.uid,
      });

      await firebaseUpdateProfile(user, {
        displayName: username || email.split('@')[0] || 'User',
        photoURL: avatarUrl,
      });

      try {
        await sendEmailVerification(user, { url: getRedirectUrl('?auth_action=signup') });
      } catch (error) {
        console.warn('Email verification could not be sent:', error);
      }

      await firebaseSignOut(auth);
      return { user: toAppUser(user), error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  },

  async ensureUserSetup(userId: string, username: string, email?: string | null): Promise<void> {
    try {
      const now = new Date().toISOString();
      const profileRef = doc(db, 'profiles', userId);
      const profileSnap = await getDoc(profileRef);

      const defaultAvatarUrl = avatarService.generateProfileAvatarUrl({
        username,
        email: email || undefined,
        userId,
      });

      if (!profileSnap.exists()) {
        await setDoc(profileRef, {
          id: userId,
          username: username || 'User',
          avatar_url: defaultAvatarUrl,
          timezone: 'UTC',
          notification_preferences: defaultNotificationPreferences,
          streak_count: 0,
          total_reviews: 0,
          created_at: now,
          updated_at: now,
        });
      } else {
        const profileData = profileSnap.data();
        if (!profileData.avatar_url) {
          await setDoc(profileRef, { avatar_url: defaultAvatarUrl, updated_at: now }, { merge: true });
        }
        if (!profileData.notification_preferences) {
          await setDoc(profileRef, { notification_preferences: defaultNotificationPreferences, updated_at: now }, { merge: true });
        }
      }

      const categoriesRef = collection(db, 'users', userId, 'categories');
      const categorySeed = await getDocs(query(categoriesRef, limit(1)));
      if (categorySeed.empty) {
        await Promise.all(defaultCategories.map(async (category) => {
          const categoryRef = doc(categoriesRef);
          await setDoc(categoryRef, {
            ...category,
            user_id: userId,
            created_at: now,
          });
        }));
      }

      const achievementsRef = collection(db, 'users', userId, 'achievements');
      const achievementSeed = await getDocs(query(achievementsRef, limit(1)));
      if (achievementSeed.empty) {
        await Promise.all(defaultAchievements.map(async (achievement) => {
          const achievementRef = doc(achievementsRef);
          await setDoc(achievementRef, {
            ...achievement,
            user_id: userId,
            unlocked_at: null,
            created_at: now,
          });
        }));
      }
    } catch (error) {
      console.error('Error in ensureUserSetup:', error);
    }
  },

  async signIn(email: string, password: string): Promise<{ user: AppUser | null; error: Error | null }> {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return { user: toAppUser(credential.user), error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  },

  async signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
    try {
      await sendSignInLinkToEmail(auth, email, {
        url: getRedirectUrl('?auth_action=magic'),
        handleCodeInApp: true,
      });
      localStorage.setItem(EMAIL_LINK_STORAGE_KEY, email);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  async signInWithProvider(provider: 'google' | 'github' | 'discord'): Promise<{ error: Error | null }> {
    if (provider !== 'google') {
      return { error: new Error(`${provider} provider is not configured in Firebase`) };
    }

    try {
      await signInWithPopup(auth, GOOGLE_PROVIDER);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  async signOut(): Promise<{ error: Error | null }> {
    try {
      await firebaseSignOut(auth);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  async resetPassword(email: string): Promise<{ error: Error | null }> {
    try {
      await sendPasswordResetEmail(auth, email, {
        url: getRedirectUrl('?auth_action=recovery'),
      });
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    try {
      if (!auth.currentUser) {
        throw new Error('Authentication required');
      }
      await firebaseUpdatePassword(auth.currentUser, newPassword);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  async updateEmail(newEmail: string): Promise<{ error: Error | null }> {
    try {
      if (!auth.currentUser) {
        throw new Error('Authentication required');
      }
      await firebaseUpdateEmail(auth.currentUser, newEmail);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: AppSession | null) => void) {
    let previousUid = auth.currentUser?.uid ?? null;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const currentUid = user?.uid ?? null;
      let event: AuthChangeEvent;

      if (currentUid && !previousUid) {
        event = 'SIGNED_IN';
      } else if (!currentUid && previousUid) {
        event = 'SIGNED_OUT';
      } else if (currentUid && previousUid && currentUid === previousUid) {
        event = 'TOKEN_REFRESHED';
      } else {
        event = 'USER_UPDATED';
      }

      previousUid = currentUid;
      callback(event, toSession(user));
    });

    return {
      data: {
        subscription: {
          unsubscribe,
        },
      },
    };
  },

  async verifyOtp(email: string, token: string): Promise<{ error: Error | null }> {
    try {
      if (!isSignInWithEmailLink(auth, token)) {
        return { error: new Error('Invalid magic link') };
      }
      await signInWithEmailLink(auth, email, token);
      localStorage.removeItem(EMAIL_LINK_STORAGE_KEY);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  async resendConfirmation(email: string): Promise<{ error: Error | null }> {
    try {
      if (!auth.currentUser || auth.currentUser.email !== email) {
        return { error: new Error('Sign in before requesting confirmation email') };
      }

      if (auth.currentUser.emailVerified) {
        return { error: null };
      }

      await sendEmailVerification(auth.currentUser, {
        url: getRedirectUrl('?auth_action=signup'),
      });
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  },
};
