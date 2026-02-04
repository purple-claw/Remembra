// Supabase-synced store for Remembra
// This provides real-time sync with Supabase while maintaining offline capability

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Category, DailyStreak, MemoryItem, ReviewPerformance, UserProfile } from '../types/types';
import * as db from './database';
import { ExpoSecureStorage, supabase } from './supabase';

interface SyncState {
    isLoading: boolean;
    isSyncing: boolean;
    error: string | null;
    lastSyncedAt: Date | null;
}

interface AppState extends SyncState {
    // Data
    user: UserProfile | null;
    categories: Category[];
    memoryItems: MemoryItem[];
    streaks: DailyStreak[];
    isAuthenticated: boolean;

    // Auth actions
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;

    // Sync actions
    syncWithSupabase: () => Promise<void>;
    clearError: () => void;

    // Data actions (with Supabase sync)
    setUser: (user: UserProfile) => void;
    addCategory: (category: Partial<Category>) => Promise<Category | null>;
    updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;

    addMemoryItem: (item: Partial<MemoryItem>) => Promise<MemoryItem | null>;
    updateMemoryItem: (id: string, updates: Partial<MemoryItem>) => Promise<void>;
    deleteMemoryItem: (id: string) => Promise<void>;

    processReview: (itemId: string, performance: ReviewPerformance, timeSpent?: number) => Promise<void>;

    // Computed
    getTodayReviews: () => MemoryItem[];
    getItemsByCategory: (categoryId: string) => MemoryItem[];
    getCurrentStreak: () => number;
}

export const useSupabaseStore = create<AppState>()(
    persist(
        (set, get) => ({
            // Initial state
            user: null,
            categories: [],
            memoryItems: [],
            streaks: [],
            isAuthenticated: false,
            isLoading: false,
            isSyncing: false,
            error: null,
            lastSyncedAt: null,

            // Auth
            signIn: async (email, password) => {
                set({ isLoading: true, error: null });
                const { data, error } = await db.signInWithEmail(email, password);

                if (error) {
                    set({ isLoading: false, error: error.message });
                    return { error: error.message };
                }

                set({ isAuthenticated: true });
                await get().syncWithSupabase();
                set({ isLoading: false });
                return { error: null };
            },

            signUp: async (email, password, username) => {
                set({ isLoading: true, error: null });
                const { data, error } = await db.signUpWithEmail(email, password, username);

                if (error) {
                    set({ isLoading: false, error: error.message });
                    return { error: error.message };
                }

                set({ isLoading: false });
                return { error: null };
            },

            signOut: async () => {
                await db.signOut();
                set({
                    user: null,
                    categories: [],
                    memoryItems: [],
                    streaks: [],
                    isAuthenticated: false,
                    lastSyncedAt: null,
                });
            },

            // Sync
            syncWithSupabase: async () => {
                const currentUser = await db.getCurrentUser();
                if (!currentUser) {
                    set({ isAuthenticated: false });
                    return;
                }

                set({ isSyncing: true, error: null });

                try {
                    // Fetch all data in parallel
                    const [profile, categories, memoryItems, streaksData] = await Promise.all([
                        db.getProfile(currentUser.id),
                        db.getCategories(currentUser.id),
                        db.getMemoryItems(currentUser.id),
                        db.getStreaks(currentUser.id, 30),
                    ]);

                    const streaks: DailyStreak[] = streaksData.data?.map(s => ({
                        date: s.date,
                        reviewsCompleted: s.reviews_completed,
                        streakBroken: s.streak_broken,
                    })) || [];

                    set({
                        user: profile,
                        categories,
                        memoryItems,
                        streaks,
                        isAuthenticated: true,
                        isSyncing: false,
                        lastSyncedAt: new Date(),
                    });
                } catch (err) {
                    console.error('Sync error:', err);
                    set({ isSyncing: false, error: 'Failed to sync data' });
                }
            },

            clearError: () => set({ error: null }),

            setUser: (user) => set({ user }),

            // Categories
            addCategory: async (category) => {
                const { user } = get();
                if (!user) return null;

                const { data, error } = await db.createCategory(user.id, category);
                if (error || !data) {
                    set({ error: 'Failed to create category' });
                    return null;
                }

                set((state) => ({ categories: [...state.categories, data] }));
                return data;
            },

            updateCategory: async (id, updates) => {
                const { data, error } = await db.updateCategory(id, updates);
                if (error) {
                    set({ error: 'Failed to update category' });
                    return;
                }

                set((state) => ({
                    categories: state.categories.map((c) =>
                        c.id === id ? { ...c, ...updates } : c
                    ),
                }));
            },

            deleteCategory: async (id) => {
                const { error } = await db.deleteCategory(id);
                if (error) {
                    set({ error: 'Failed to delete category' });
                    return;
                }

                set((state) => ({
                    categories: state.categories.filter((c) => c.id !== id),
                }));
            },

            // Memory Items
            addMemoryItem: async (item) => {
                const { user } = get();
                if (!user) return null;

                const { data, error } = await db.createMemoryItem(user.id, item);
                if (error || !data) {
                    set({ error: 'Failed to create memory item' });
                    return null;
                }

                set((state) => ({ memoryItems: [...state.memoryItems, data] }));
                return data;
            },

            updateMemoryItem: async (id, updates) => {
                const { error } = await db.updateMemoryItem(id, updates);
                if (error) {
                    set({ error: 'Failed to update memory item' });
                    return;
                }

                set((state) => ({
                    memoryItems: state.memoryItems.map((m) =>
                        m.id === id ? { ...m, ...updates, updatedAt: new Date() } : m
                    ),
                }));
            },

            deleteMemoryItem: async (id) => {
                const { error } = await db.deleteMemoryItem(id);
                if (error) {
                    set({ error: 'Failed to delete memory item' });
                    return;
                }

                set((state) => ({
                    memoryItems: state.memoryItems.filter((m) => m.id !== id),
                }));
            },

            // Review processing with 1-4-7-30-90 algorithm
            processReview: async (itemId, performance, timeSpent = 0) => {
                const { user } = get();
                if (!user) return;

                const result = await db.processReview(itemId, user.id, performance, timeSpent);
                if (!result) {
                    set({ error: 'Failed to process review' });
                    return;
                }

                // Update local state
                set((state) => ({
                    memoryItems: state.memoryItems.map((m) =>
                        m.id === itemId
                            ? {
                                ...m,
                                nextReviewDate: result.nextReviewDate,
                                reviewStage: result.newStage,
                                status: result.newStatus as any,
                                reviewHistory: [
                                    ...m.reviewHistory,
                                    { date: new Date(), performance, timeSpentSeconds: timeSpent },
                                ],
                                updatedAt: new Date(),
                            }
                            : m
                    ),
                }));

                // Refresh streak data
                await get().syncWithSupabase();
            },

            // Computed values
            getTodayReviews: () => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return get().memoryItems.filter((item) => {
                    const reviewDate = new Date(item.nextReviewDate);
                    reviewDate.setHours(0, 0, 0, 0);
                    return reviewDate <= today && item.status !== 'archived' && item.status !== 'mastered';
                });
            },

            getItemsByCategory: (categoryId) =>
                get().memoryItems.filter((m) => m.categoryId === categoryId),

            getCurrentStreak: () => {
                const streaks = get().streaks.sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );
                let count = 0;
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                for (let i = 0; i < streaks.length; i++) {
                    const streakDate = new Date(streaks[i].date);
                    streakDate.setHours(0, 0, 0, 0);
                    const diffDays = Math.floor(
                        (today.getTime() - streakDate.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    if (diffDays === i && streaks[i].reviewsCompleted > 0) {
                        count++;
                    } else {
                        break;
                    }
                }
                return count;
            },
        }),
        {
            name: 'remembra-supabase-storage',
            storage: createJSONStorage(() => ExpoSecureStorage),
            partialize: (state) => ({
                // Only persist essential data for offline support
                user: state.user,
                categories: state.categories,
                memoryItems: state.memoryItems,
                streaks: state.streaks,
                isAuthenticated: state.isAuthenticated,
                lastSyncedAt: state.lastSyncedAt,
            }),
        }
    )
);

// Auth state listener - sync on auth changes
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
        useSupabaseStore.getState().syncWithSupabase();
    } else if (event === 'SIGNED_OUT') {
        useSupabaseStore.getState().signOut();
    }
});
