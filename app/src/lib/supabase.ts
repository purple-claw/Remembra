// Compatibility shim after Firebase migration.
// Legacy imports should move to '@/lib/firebase'.

import {
  auth,
  db,
  storage,
  getCurrentUserId,
  isFirebaseConfigured,
  requireAuth,
} from '@/lib/firebase';

export const isSupabaseConfigured = isFirebaseConfigured;

export const getSupabase = (): never => {
  throw new Error('Supabase client has been removed. Use Firebase services instead.');
};

export const supabase = null;

export {
  auth,
  db,
  storage,
  getCurrentUserId,
  requireAuth,
};
