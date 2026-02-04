import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = 'https://vcgmyivrlppfiizaeydg.supabase.co';
const supabaseAnonKey = 'sb_publishable_imgvkwiev0Lr8q--BHQdvQ_nSxj14gT';

// SSR-safe storage wrapper for Expo web
export const ExpoSecureStorage = {
    getItem: async (key: string) => {
        // Check if we're in a browser environment
        if (Platform.OS === 'web' && typeof window === 'undefined') {
            return null; // SSR - return null safely
        }
        return AsyncStorage.getItem(key);
    },
    setItem: async (key: string, value: string) => {
        if (Platform.OS === 'web' && typeof window === 'undefined') {
            return; // SSR - no-op
        }
        return AsyncStorage.setItem(key, value);
    },
    removeItem: async (key: string) => {
        if (Platform.OS === 'web' && typeof window === 'undefined') {
            return; // SSR - no-op
        }
        return AsyncStorage.removeItem(key);
    },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoSecureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// Database types
export interface DbProfile {
    id: string;
    username: string;
    streak_count: number;
    total_reviews: number;
    timezone: string;
    created_at: string;
    updated_at: string;
}

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
