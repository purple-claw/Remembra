import { getSupabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

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
        // Disable email confirmation for faster development (can be re-enabled in Supabase dashboard)
        emailRedirectTo: `${window.location.origin}`,
      },
    });

    if (error) {
      return { user: null, error };
    }

    // Note: Profile is created by database trigger (handle_new_user).
    // Default categories and achievements are created when the user first loads data.
    // This avoids issues with email confirmation requiring auth before setup.

    return { user: data.user, error: null };
  },

  // Ensure user profile and default data exists (call after confirmed auth)
  async ensureUserSetup(userId: string, username: string): Promise<void> {
    const supabase = getSupabase();
    
    try {
      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      // If no profile (trigger didn't run), create it manually
      if (profileError?.code === 'PGRST116' || !profile) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            username: username || 'User',
            streak_count: 0,
            total_reviews: 0,
          });
        
        if (insertError && insertError.code !== '23505') { // Ignore duplicate key error
          console.error('Error creating profile:', insertError);
        }
      }
      
      // Check if categories exist
      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      
      // Create default categories if none exist
      if (!categories || categories.length === 0) {
        const defaultCategories = [
          { user_id: userId, name: 'General', color: '#6366F1', icon: 'folder', order_index: 0, is_default: true },
          { user_id: userId, name: 'Work', color: '#10B981', icon: 'briefcase', order_index: 1, is_default: false },
          { user_id: userId, name: 'Personal', color: '#F59E0B', icon: 'user', order_index: 2, is_default: false },
        ];
        
        await supabase.from('categories').insert(defaultCategories);
      }
      
      // Check if achievements exist
      const { data: achievements } = await supabase
        .from('achievements')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      
      // Create default achievements if none exist
      if (!achievements || achievements.length === 0) {
        const defaultAchievements = [
          { user_id: userId, name: 'First Steps', description: 'Complete your first review', icon: 'trophy', progress: 0, max_progress: 1 },
          { user_id: userId, name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: 'flame', progress: 0, max_progress: 7 },
          { user_id: userId, name: 'Knowledge Builder', description: 'Create 10 memory items', icon: 'brain', progress: 0, max_progress: 10 },
          { user_id: userId, name: 'Master Scholar', description: 'Master 5 items', icon: 'star', progress: 0, max_progress: 5 },
        ];
        
        await supabase.from('achievements').insert(defaultAchievements);
      }
    } catch (err) {
      console.error('Error in ensureUserSetup:', err);
    }
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
