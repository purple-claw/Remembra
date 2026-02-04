import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import type { Database } from '@/types'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vcgmyivrlppfiizaeydg.supabase.co'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_imgvkwiev0Lr8q--BHQdvQ_nSxj14gT'

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found in environment. Using defaults.')
}

// SSR-safe storage wrapper for Expo web
export const ExpoSecureStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return null
    }
    return AsyncStorage.getItem(key)
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return
    }
    return AsyncStorage.setItem(key, value)
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return
    }
    return AsyncStorage.removeItem(key)
  },
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export interface DbCategory {
    id: string;
    user_id: string;
    name: string;
    color: string;
    icon: string;
    order_index: number;
    is_default: boolean;
    created_at: string;
}

export interface DbMemoryItem {
    id: string;
    user_id: string;
    category_id: string;
    title: string;
    content: string;
    content_blocks: any[]; // JSON
    content_type: string;
    difficulty: string;
    status: string;
    next_review_date: string;
    review_stage: number;
    review_history: any[]; // JSON
    personal_notes: string;
    ai_summary: string | null;
    tags: string[];
    created_at: string;
    updated_at: string;
}

export interface DbStreak {
    id: string;
    user_id: string;
    date: string;
    reviews_completed: number;
    streak_broken: boolean;
}
