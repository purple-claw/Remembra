import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MemoryItem, Category, Profile, Achievement, DaySchedule, Performance, ReviewStatus, NotificationPreferences, DailyReview } from '@/types';
import { processReviewCompletion, calculatePriority } from '@/types';
import type { User, Session } from '@supabase/supabase-js';
import { 
  authService,
  profileService,
  categoryService,
  memoryItemService,
  achievementService,
  statsService,
  streakService,
  notificationService,
  isSupabaseConfigured,
} from '@/services';
import { supabase } from '@/lib/supabase';

// For fallback profile
import { 
  mockProfile
} from '@/data/mockData';

export type Screen = 'dashboard' | 'calendar' | 'review' | 'library' | 'create' | 'ai-tools' | 'stats' | 'profile' | 'test' | 'auth';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AppState extends AuthState {
  // Navigation
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
  
  // Data
  profile: Profile | null;
  categories: Category[];
  memoryItems: MemoryItem[];
  achievements: Achievement[];
  calendarData: DaySchedule[];
  dailyReviews: DailyReview[];
  
  // Review Session
  currentReviewIndex: number;
  reviewQueue: MemoryItem[];
  
  // Auth Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  
  // Data Loading
  loadUserData: () => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Review Actions
  startReviewSession: (items?: MemoryItem[]) => void;
  nextReviewItem: () => void;
  completeReview: (performance: Performance, timeSpentSeconds?: number) => Promise<void>;
  markReviewComplete: (itemId: string, date: string, performance: Performance) => Promise<void>;
  startReviewForDate: (itemId: string, date: string) => void;
  getReviewsForDate: (date: string) => DailyReview[];
  
  // Memory Item Actions
  addMemoryItem: (item: Omit<MemoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<MemoryItem>;
  updateMemoryItem: (id: string, updates: Partial<MemoryItem>) => Promise<void>;
  deleteMemoryItem: (id: string) => Promise<void>;
  
  // Category Actions
  addCategory: (category: Omit<Category, 'id' | 'user_id' | 'created_at'>) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  // Profile Actions
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  updateNotificationPreferences: (prefs: NotificationPreferences) => Promise<void>;
  
  // Helpers
  getItemsDueToday: () => MemoryItem[];
  getItemsByCategory: (categoryId: string) => MemoryItem[];
  getItemsByStatus: (status: ReviewStatus) => MemoryItem[];
  getCategoryById: (id: string) => Category | undefined;
}

export const useStore = create<AppState>()(persist((set, get) => ({
  // Initial Auth State
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  
  // Navigation
  currentScreen: 'auth',
  setScreen: (screen) => set({ currentScreen: screen }),
  
  // Initial Data - empty until authenticated and loaded from Supabase
  profile: null,
  categories: [],
  memoryItems: [],
  achievements: [],
  calendarData: [],
  dailyReviews: [],
  
  // Review State
  currentReviewIndex: 0,
  reviewQueue: [],
  
  // Initialize app and auth state
  initialize: async () => {
    try {
      // If Supabase is not configured, show auth screen
      if (!isSupabaseConfigured || !supabase) {
        console.log('Supabase not configured. Please set environment variables.');
        set({ isLoading: false, currentScreen: 'auth' });
        return;
      }
      
      // Get current session
      const session = await authService.getSession();
      const user = session?.user ?? null;
      
      set({ 
        user, 
        session, 
        isAuthenticated: !!user,
        isLoading: false,
        currentScreen: user ? 'dashboard' : 'auth',
      });
      
      // Load user data if authenticated
      if (user) {
        await get().loadUserData();
        // Initialize notifications
        await notificationService.createChannel();
        await notificationService.initialize();
      }
      
      // Subscribe to auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        const user = session?.user ?? null;
        set({ 
          user, 
          session, 
          isAuthenticated: !!user,
        });
        
        if (event === 'SIGNED_IN' && user) {
          set({ currentScreen: 'dashboard' });
          await get().loadUserData();
        } else if (event === 'SIGNED_OUT') {
          set({
            currentScreen: 'auth',
            profile: null,
            categories: [],
            memoryItems: [],
            achievements: [],
            calendarData: [],
            dailyReviews: [],
          });
        } else if (event === 'PASSWORD_RECOVERY') {
          // User clicked password reset link - show update password screen
          set({ currentScreen: 'auth' });
        }
      });
    } catch (error) {
      console.error('Error initializing app:', error);
      set({ isLoading: false, currentScreen: 'auth' });
    }
  },
  
  // Sign in
  signIn: async (email, password) => {
    const { error } = await authService.signIn(email, password);
    return { error };
  },
  
  // Sign up
  signUp: async (email, password, username) => {
    const { error } = await authService.signUp(email, password, username);
    return { error };
  },
  
  // Sign out
  signOut: async () => {
    await authService.signOut();
    set({
      user: null,
      session: null,
      isAuthenticated: false,
      currentScreen: 'auth',
      profile: null,
      categories: [],
      memoryItems: [],
      achievements: [],
      calendarData: [],
      dailyReviews: [],
    });
  },
  
  // Load all user data from Supabase
  loadUserData: async () => {
    try {
      const { user } = get();
      
      // Ensure user setup (profile, default categories, achievements) exists
      if (user) {
        const username = user.user_metadata?.username || user.email?.split('@')[0] || 'User';
        await authService.ensureUserSetup(user.id, username);
      }
      
      const [profile, categories, memoryItems, achievements] = await Promise.all([
        profileService.getProfile(),
        categoryService.getCategories(),
        memoryItemService.getMemoryItems(),
        achievementService.getAchievements(),
      ]);
      
      // Get calendar data for current period
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 14);
      
      const calendarData = await statsService.getCalendarData(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      set({
        profile: profile || mockProfile,
        categories: categories,
        memoryItems: memoryItems,
        achievements: achievements,
        calendarData,
      });
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  },
  
  // Refresh all data
  refreshData: async () => {
    if (get().isAuthenticated) {
      await get().loadUserData();
    }
  },
  
  // Review Session (smart priority sorting)
  startReviewSession: (items) => {
    const itemsToReview = items || get().getItemsDueToday();
    // Sort by priority: most urgent first
    const sorted = [...itemsToReview].sort((a, b) => calculatePriority(b) - calculatePriority(a));
    set({ 
      reviewQueue: sorted, 
      currentReviewIndex: 0,
      currentScreen: 'review' 
    });
  },
  
  nextReviewItem: () => {
    const { currentReviewIndex, reviewQueue } = get();
    if (currentReviewIndex < reviewQueue.length - 1) {
      set({ currentReviewIndex: currentReviewIndex + 1 });
    } else {
      set({ 
        currentScreen: 'dashboard',
        currentReviewIndex: 0,
        reviewQueue: []
      });
    }
  },
  
  completeReview: async (performance, timeSpentSeconds) => {
    const { currentReviewIndex, reviewQueue } = get();
    const currentItem = reviewQueue[currentReviewIndex];
    
    if (!currentItem) return;
    
    try {
      // Update item in Supabase using the 1-4-7 engine
      const updatedItem = await memoryItemService.completeReview(currentItem.id, performance, timeSpentSeconds);
      
      // Update local state
      if (updatedItem) {
        set(state => ({
          memoryItems: state.memoryItems.map(item =>
            item.id === currentItem.id ? updatedItem : item
          ),
        }));
      } else {
        // Item was auto-deleted
        set(state => ({
          memoryItems: state.memoryItems.filter(item => item.id !== currentItem.id),
        }));
      }
      
      // Record streak and update profile
      await streakService.recordReviewCompletion();
      await profileService.incrementTotalReviews();
      
      // Refresh profile
      const updatedProfile = await profileService.getProfile();
      if (updatedProfile) {
        set({ profile: updatedProfile });
      }
      
      // Run lifecycle processing (archive/delete old items)
      try {
        await memoryItemService.processLifecycle();
      } catch (e) {
        console.warn('Lifecycle processing failed:', e);
      }
      
      // Schedule next review notification
      const refreshedItem = get().memoryItems.find(i => i.id === currentItem.id);
      if (refreshedItem) {
        notificationService.scheduleNextReview(refreshedItem).catch(console.warn);
      }
    } catch (error) {
      console.error('Error completing review:', error);
    }
    
    get().nextReviewItem();
  },
  
  // Memory Item CRUD
  addMemoryItem: async (item) => {
    const newItem = await memoryItemService.createMemoryItem(item);
    set(state => ({ memoryItems: [newItem, ...state.memoryItems] }));
    // Schedule review notifications for this item
    notificationService.scheduleReviewNotifications(newItem).catch(console.warn);
    return newItem;
  },
  
  updateMemoryItem: async (id, updates) => {
    const updatedItem = await memoryItemService.updateMemoryItem(id, updates);
    set(state => ({
      memoryItems: state.memoryItems.map(item =>
        item.id === id ? updatedItem : item
      ),
    }));
  },
  
  deleteMemoryItem: async (id) => {
    await memoryItemService.deleteMemoryItem(id);
    set(state => ({
      memoryItems: state.memoryItems.filter(item => item.id !== id),
    }));
  },
  
  // Category CRUD
  addCategory: async (category) => {
    const newCategory = await categoryService.createCategory(category);
    set(state => ({ categories: [...state.categories, newCategory] }));
    return newCategory;
  },
  
  updateCategory: async (id, updates) => {
    const updatedCategory = await categoryService.updateCategory(id, updates);
    set(state => ({
      categories: state.categories.map(cat =>
        cat.id === id ? updatedCategory : cat
      ),
    }));
  },
  
  deleteCategory: async (id) => {
    await categoryService.deleteCategory(id);
    set(state => ({
      categories: state.categories.filter(cat => cat.id !== id),
    }));
  },
  
  // Profile Updates
  updateProfile: async (updates) => {
    const updatedProfile = await profileService.updateProfile(updates);
    set({ profile: updatedProfile });
  },
  
  updateNotificationPreferences: async (prefs) => {
    const updatedProfile = await profileService.updateNotificationPreferences(prefs);
    set({ profile: updatedProfile });
  },
  
  // Helper functions
  getItemsDueToday: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().memoryItems.filter(item => 
      item.next_review_date <= today && item.status === 'active'
    );
  },
  
  getItemsByCategory: (categoryId) => {
    return get().memoryItems.filter(item => item.category_id === categoryId);
  },
  
  getItemsByStatus: (status) => {
    return get().memoryItems.filter(item => item.status === status);
  },
  
  getCategoryById: (id) => {
    return get().categories.find(c => c.id === id);
  },
  
  // Mark a review as complete from calendar (uses SM-2)
  markReviewComplete: async (itemId, date, performance) => {
    const item = get().memoryItems.find(i => i.id === itemId);
    if (!item) return;
    
    const result = processReviewCompletion(item, performance);
    
    const updatedItem: MemoryItem = {
      ...item,
      review_history: [
        ...item.review_history,
        {
          date: date,
          performance,
          time_spent_seconds: 0,
          interval: result.interval,
          easiness_factor: result.easinessFactor,
        },
      ],
      easiness_factor: result.easinessFactor,
      interval: result.interval,
      repetition: result.repetition,
      lapse_count: result.newLapseCount,
      current_stage_index: result.repetition,
      review_stage: result.repetition,
      next_review_date: result.nextReviewDate,
      status: result.nextStatus,
      last_reviewed_at: new Date().toISOString(),
      completed_at: result.completedAt,
      archive_at: result.archiveAt,
      delete_at: result.deleteAt,
      updated_at: new Date().toISOString(),
    };
    
    set(state => ({
      memoryItems: state.memoryItems.map(i =>
        i.id === itemId ? updatedItem : i
      ),
      dailyReviews: state.dailyReviews.map(r =>
        r.memory_item_id === itemId && r.scheduled_date === date
          ? { ...r, status: 'completed', completed_at: new Date().toISOString(), performance }
          : r
      ),
    }));
  },
  
  // Start a review for a specific date
  startReviewForDate: (itemId, date) => {
    set(state => ({
      dailyReviews: [
        ...state.dailyReviews.filter(r => !(r.memory_item_id === itemId && r.scheduled_date === date)),
        {
          id: `review-${itemId}-${date}`,
          memory_item_id: itemId,
          scheduled_date: date,
          status: 'in-progress' as const,
        },
      ],
    }));
  },
  
  // Get all reviews for a specific date
  getReviewsForDate: (date) => {
    const items = get().memoryItems.filter(item => item.next_review_date === date);
    return items.map(item => {
      const existing = get().dailyReviews.find(r => r.memory_item_id === item.id && r.scheduled_date === date);
      if (existing) return existing;
      
      const today = new Date().toISOString().split('T')[0];
      let status: 'pending' | 'overdue' | 'in-progress' | 'completed' = 'pending';
      if (date < today) status = 'overdue';
      
      return {
        id: `review-${item.id}-${date}`,
        memory_item_id: item.id,
        scheduled_date: date,
        status,
      };
    });
  },
}), {
  name: 'remembra-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    // Persist auth-related navigation state only
    currentScreen: state.isAuthenticated ? state.currentScreen : 'auth',
  }),
}));
