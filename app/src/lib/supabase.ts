import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Create the Supabase client - we use 'any' for the database type to avoid strict typing issues
// The actual table types are handled by the service layer transform functions
let supabaseInstance: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
} else {
  console.warn('Supabase not configured. Running in demo mode with mock data.');
}

export const supabase = supabaseInstance;

// Helper to get supabase client with null check
export const getSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  return supabase;
};

// Helper to get current user ID
export const getCurrentUserId = async (): Promise<string | null> => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

// Helper to require authentication
export const requireAuth = async (): Promise<string> => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
};
