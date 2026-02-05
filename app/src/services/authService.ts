import { getSupabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { categoryService } from './categoryService';
import { achievementService } from './achievementService';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export const authService = {
  // Get current session
  async getSession(): Promise<Session | null> {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Get current user
  async getUser(): Promise<User | null> {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Sign up with email
  async signUp(email: string, password: string, username: string): Promise<{ user: User | null; error: Error | null }> {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (error) {
      return { user: null, error };
    }

    // Create profile for new user (handled by database trigger, but we can also do it here)
    if (data.user) {
      try {
        // Create default categories
        await categoryService.createDefaultCategories();
        // Create default achievements
        await achievementService.createDefaultAchievements();
      } catch (err) {
        console.error('Error setting up user data:', err);
      }
    }

    return { user: data.user, error: null };
  },

  // Sign in with email
  async signIn(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error };
    }

    return { user: data.user, error: null };
  },

  // Sign in with magic link
  async signInWithMagicLink(email: string): Promise<{ error: Error | null }> {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { error };
  },

  // Sign in with OAuth provider
  async signInWithProvider(provider: 'google' | 'github' | 'discord'): Promise<{ error: Error | null }> {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { error };
  },

  // Sign out
  async signOut(): Promise<{ error: Error | null }> {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Reset password
  async resetPassword(email: string): Promise<{ error: Error | null }> {
    const supabase = getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    return { error };
  },

  // Update password
  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    const supabase = getSupabase();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return { error };
  },

  // Update email
  async updateEmail(newEmail: string): Promise<{ error: Error | null }> {
    const supabase = getSupabase();
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    return { error };
  },

  // Subscribe to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    const supabase = getSupabase();
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },

  // Verify OTP
  async verifyOtp(email: string, token: string): Promise<{ error: Error | null }> {
    const supabase = getSupabase();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    return { error };
  },

  // Resend confirmation email
  async resendConfirmation(email: string): Promise<{ error: Error | null }> {
    const supabase = getSupabase();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    return { error };
  },
};
