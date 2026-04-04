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
import { logger } from '@/lib/logger';
import { success, failure, type Result, AppError } from '@/lib/errors';
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
  async getSession(): Promise<Result<AppSession | null>> {
    await waitForAuthInitialization();
    return success(toSession(auth.currentUser));
  },

  async getUser(): Promise<Result<AppUser | null>> {
    await waitForAuthInitialization();
    return success(auth.currentUser ? toAppUser(auth.currentUser) : null);
  },

  async signUp(email: string, password: string, username: string): Promise<Result<AppUser>> {
    try {
      this.validateEmail(email);
      this.validateNonEmpty(password, 'Password');
      this.validateNonEmpty(username, 'Username');

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
        logger.warn('Email verification could not be sent', error as any);
      }

      await firebaseSignOut(auth);
      const appUser = toAppUser(user);
      logger.info('User signed up successfully', { userId: appUser.id, email });
      return success(appUser);
    } catch (error) {
      const appError = this.handleAuthError(error, 'signUp');
      logger.error('Sign up failed', appError as any);
      return failure(appError);
    }
  },

  async signIn(email: string, password: string): Promise<Result<AppUser>> {
    try {
      this.validateEmail(email);
      this.validateNonEmpty(password, 'Password');

      const credential = await signInWithEmailAndPassword(auth, email, password);
      const appUser = toAppUser(credential.user);
      logger.info('User signed in successfully', { userId: appUser.id, email });
      return success(appUser);
    } catch (error) {
      const appError = this.handleAuthError(error, 'signIn');
      logger.error('Sign in failed', appError as any, { email });
      return failure(appError);
    }
  },

  async signInWithMagicLink(email: string): Promise<Result<void>> {
    try {
      this.validateEmail(email);

      await sendSignInLinkToEmail(auth, email, {
        url: getRedirectUrl('?auth_action=magic'),
        handleCodeInApp: true,
      });
      localStorage.setItem(EMAIL_LINK_STORAGE_KEY, email);
      logger.info('Magic link sent', { email });
      return success(undefined);
    } catch (error) {
      const appError = this.handleAuthError(error, 'signInWithMagicLink');
      logger.error('Failed to send magic link', appError as any, { email });
      return failure(appError);
    }
  },

  async signInWithProvider(provider: 'google' | 'github' | 'discord'): Promise<Result<void>> {
    try {
      if (provider !== 'google') {
        const error = new AppError({
          code: 'BAD_REQUEST',
          message: `${provider} provider is not configured in Firebase`,
          statusCode: 400,
        });
        logger.warn(`Attempted to use unsupported provider: ${provider}`);
        return failure(error);
      }

      await signInWithPopup(auth, GOOGLE_PROVIDER);
      logger.info(`User signed in with ${provider}`);
      return success(undefined);
    } catch (error) {
      const appError = this.handleAuthError(error, 'signInWithProvider');
      logger.error('Provider sign in failed', appError as any, { provider });
      return failure(appError);
    }
  },

  async signOut(): Promise<Result<void>> {
    try {
      await firebaseSignOut(auth);
      logger.info('User signed out successfully');
      return success(undefined);
    } catch (error) {
      const appError = this.handleAuthError(error, 'signOut');
      logger.error('Sign out failed', appError as any);
      return failure(appError);
    }
  },

  async resetPassword(email: string): Promise<Result<void>> {
    try {
      this.validateEmail(email);

      await sendPasswordResetEmail(auth, email, {
        url: getRedirectUrl('?auth_action=recovery'),
      });
      logger.info('Password reset email sent', { email });
      return success(undefined);
    } catch (error) {
      const appError = this.handleAuthError(error, 'resetPassword');
      logger.error('Failed to send password reset email', appError as any, { email });
      return failure(appError);
    }
  },

  async updatePassword(newPassword: string): Promise<Result<void>> {
    try {
      this.validateNonEmpty(newPassword, 'New password');

      if (!auth.currentUser) {
        const error = new AppError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          statusCode: 401,
        });
        return failure(error);
      }

      await firebaseUpdatePassword(auth.currentUser, newPassword);
      logger.info('Password updated successfully');
      return success(undefined);
    } catch (error) {
      const appError = this.handleAuthError(error, 'updatePassword');
      logger.error('Failed to update password', appError as any);
      return failure(appError);
    }
  },

  async updateEmail(newEmail: string): Promise<Result<void>> {
    try {
      this.validateEmail(newEmail);

      if (!auth.currentUser) {
        const error = new AppError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          statusCode: 401,
        });
        return failure(error);
      }

      await firebaseUpdateEmail(auth.currentUser, newEmail);
      logger.info('Email updated successfully', { newEmail });
      return success(undefined);
    } catch (error) {
      const appError = this.handleAuthError(error, 'updateEmail');
      logger.error('Failed to update email', appError as any, { newEmail });
      return failure(appError);
    }
  },

  async verifyOtp(email: string, token: string): Promise<Result<void>> {
    try {
      this.validateEmail(email);
      this.validateNonEmpty(token, 'Token');

      if (!isSignInWithEmailLink(auth, token)) {
        const error = new AppError({
          code: 'VALIDATION_ERROR',
          message: 'Invalid magic link',
          statusCode: 400,
        });
        return failure(error);
      }

      await signInWithEmailLink(auth, email, token);
      localStorage.removeItem(EMAIL_LINK_STORAGE_KEY);
      logger.info('Email verified successfully', { email });
      return success(undefined);
    } catch (error) {
      const appError = this.handleAuthError(error, 'verifyOtp');
      logger.error('Failed to verify OTP', appError as any, { email });
      return failure(appError);
    }
  },

  async resendConfirmation(email: string): Promise<Result<void>> {
    try {
      this.validateEmail(email);

      if (!auth.currentUser || auth.currentUser.email !== email) {
        const error = new AppError({
          code: 'UNAUTHORIZED',
          message: 'Sign in before requesting confirmation email',
          statusCode: 401,
        });
        return failure(error);
      }

      if (auth.currentUser.emailVerified) {
        logger.info('Email already verified', { email });
        return success(undefined);
      }

      await sendEmailVerification(auth.currentUser, {
        url: getRedirectUrl('?auth_action=signup'),
      });
      logger.info('Confirmation email resent', { email });
      return success(undefined);
    } catch (error) {
      const appError = this.handleAuthError(error, 'resendConfirmation');
      logger.error('Failed to resend confirmation email', appError as any, { email });
      return failure(appError);
    }
  },

  // Private validation helpers
  validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid email address format',
        statusCode: 400,
      });
    }
  },

  validateNonEmpty(value: string, fieldName: string): void {
    if (!value || value.trim().length === 0) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: `${fieldName} cannot be empty`,
        statusCode: 400,
      });
    }
  },

  // Private error handler
  handleAuthError(error: unknown, operation: string): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Firebase authentication errors
      if (error.message?.includes('Firebase')) {
        return new AppError({
          code: 'AUTH_FAILED',
          message: this.getAuthErrorMessage(error.message),
          statusCode: 401,
          retryable: false,
          context: { firebaseError: error.message, operation },
        });
      }

      // Network errors
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        return new AppError({
          code: 'NETWORK_ERROR',
          message: 'Network connection failed. Please check your internet connection.',
          statusCode: 0,
          retryable: true,
          context: { operation },
        });
      }
    }

    return new AppError({
      code: 'AUTH_FAILED',
      message: error instanceof Error ? error.message : 'Authentication operation failed',
      statusCode: 500,
      retryable: false,
      context: { operation },
    });
  },

  // Helper to convert Firebase auth errors to user-friendly messages
  getAuthErrorMessage(firebaseError: string): string {
    if (firebaseError.includes('EMAIL_NOT_FOUND') || firebaseError.includes('user-not-found')) {
      return 'No account found with this email address.';
    }
    if (firebaseError.includes('INVALID_PASSWORD') || firebaseError.includes('wrong-password')) {
      return 'Incorrect password.';
    }
    if (firebaseError.includes('EMAIL_EXISTS') || firebaseError.includes('email-already-in-use')) {
      return 'An account with this email already exists.';
    }
    if (firebaseError.includes('WEAK_PASSWORD') || firebaseError.includes('weak-password')) {
      return 'Password is too weak. Use at least 6 characters.';
    }
    if (firebaseError.includes('TOO_MANY_ATTEMPTS') || firebaseError.includes('too-many-requests')) {
      return 'Too many failed attempts. Please try again later.';
    }
    return 'Authentication operation failed. Please try again.';
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

  async ensureUserSetup(userId: string, username: string, email?: string | null): Promise<Result<void>> {
    try {
      this.validateNonEmpty(userId, 'User ID');
      this.validateNonEmpty(username, 'Username');

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
        logger.info('Created user profile', { userId });
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
        logger.info('Created default categories', { userId, count: defaultCategories.length });
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
        logger.info('Created default achievements', { userId, count: defaultAchievements.length });
      }

      logger.info('User setup completed successfully', { userId });
      return success(undefined);
    } catch (error) {
      const appError = this.handleAuthError(error, 'ensureUserSetup');
      logger.error('User setup failed', appError as any, { userId });
      return failure(appError);
    }
  },
};
