import { create } from 'zustand';
import type { MemoryItem, Category, Profile, Achievement, DaySchedule, Performance, ReviewStatus, NotificationPreferences } from '@/types';
import type { User, Session } from '@supabase/supabase-js';
import { 
  authService,
  profileService,
  categoryService,
  memoryItemService,
  achievementService,
  statsService,
  streakService,
  isSupabaseConfigured,
} from '@/services';
import { supabase } from '@/lib/supabase';

// For fallback when not authenticated
import { 
  mockMemoryItems, 
  mockCategories, 
  mockProfile, 
  mockAchievements, 
  mockCalendarData
} from '@/data/mockData';

export type Screen = 'dashboard' | 'calendar' | 'review' | 'library' | 'create' | 'ai-tools' | 'stats';

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
  completeReview: (performance: Performance) => Promise<void>;
  
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

export const useStore = create<AppState>((set, get) => ({
  // Initial Auth State
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  
  // Navigation
  currentScreen: 'dashboard',
  setScreen: (screen) => set({ currentScreen: screen }),
  
  // Initial Data (will be replaced with real data after auth)
  profile: mockProfile,
  categories: mockCategories,
  memoryItems: mockMemoryItems,
  achievements: mockAchievements,
  calendarData: mockCalendarData,
  
  // Review State
  currentReviewIndex: 0,
  reviewQueue: [],
  
  // Initialize app and auth state
  initialize: async () => {
    try {
      // If Supabase is not configured, just use mock data
      if (!isSupabaseConfigured || !supabase) {
        console.log('Running in demo mode with mock data');
        set({ isLoading: false });
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
      });
      
      // Load user data if authenticated
      if (user) {
        await get().loadUserData();
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
          await get().loadUserData();
        } else if (event === 'SIGNED_OUT') {
          // Reset to mock data when signed out
          set({
            profile: mockProfile,
            categories: mockCategories,
            memoryItems: mockMemoryItems,
            achievements: mockAchievements,
            calendarData: mockCalendarData,
          });
        }
      });
    } catch (error) {
      console.error('Error initializing app:', error);
      set({ isLoading: false });
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
      currentScreen: 'dashboard',
    });
  },
  
  // Load all user data from Supabase
  loadUserData: async () => {
    try {
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
        categories: categories.length > 0 ? categories : mockCategories,
        memoryItems: memoryItems.length > 0 ? memoryItems : mockMemoryItems,
        achievements: achievements.length > 0 ? achievements : mockAchievements,
        calendarData,
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      // Keep mock data on error
    }
  },
  
  // Refresh all data
  refreshData: async () => {
    if (get().isAuthenticated) {
      await get().loadUserData();
    }
  },
  
  // Review Session
  startReviewSession: (items) => {
    const itemsToReview = items || get().getItemsDueToday();
    set({ 
      reviewQueue: itemsToReview, 
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
  
  completeReview: async (performance) => {
    const { currentReviewIndex, reviewQueue, isAuthenticated, profile } = get();
    const currentItem = reviewQueue[currentReviewIndex];
    
    if (!currentItem) return;
    
    try {
      if (isAuthenticated) {
        // Update item in Supabase
        const updatedItem = await memoryItemService.completeReview(currentItem.id, performance);
        
        // Update local state
        set(state => ({
          memoryItems: state.memoryItems.map(item =>
            item.id === currentItem.id ? updatedItem : item
          ),
        }));
        
        // Record streak and update profile
        await streakService.recordReviewCompletion();
        await profileService.incrementTotalReviews();
        
        // Refresh profile
        const updatedProfile = await profileService.getProfile();
        if (updatedProfile) {
          set({ profile: updatedProfile });
        }
      } else {
        // Local-only update for unauthenticated users (demo mode)
        const intervals = [1, 4, 7, 30, 90];
        let newStage = currentItem.review_stage;
        
        if (performance === 'again') {
          newStage = 0;
        } else if (performance === 'easy') {
          newStage = Math.min(currentItem.review_stage + 2, 4);
        } else {
          newStage = Math.min(currentItem.review_stage + 1, 4);
        }
        
        const daysToAdd = intervals[newStage];
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + daysToAdd);
        
        let newStatus: ReviewStatus = currentItem.status;
        if (newStage >= 3) newStatus = 'mastered';
        else if (newStage > 0) newStatus = 'reviewing';
        else newStatus = 'learning';
        
        const updatedItem: MemoryItem = {
          ...currentItem,
          review_history: [
            ...currentItem.review_history,
            {
              date: new Date().toISOString().split('T')[0],
              performance,
              time_spent_seconds: Math.floor(Math.random() * 120) + 60,
            },
          ],
          review_stage: newStage,
          next_review_date: nextDate.toISOString().split('T')[0],
          status: newStatus,
          updated_at: new Date().toISOString(),
        };
        
        set(state => ({
          memoryItems: state.memoryItems.map(item =>
            item.id === currentItem.id ? updatedItem : item
          ),
          profile: profile ? {
            ...profile,
            total_reviews: profile.total_reviews + 1,
          } : null,
        }));
      }
    } catch (error) {
      console.error('Error completing review:', error);
    }
    
    get().nextReviewItem();
  },
  
  // Memory Item CRUD
  addMemoryItem: async (item) => {
    const { isAuthenticated } = get();
    
    if (isAuthenticated) {
      const newItem = await memoryItemService.createMemoryItem(item);
      set(state => ({ memoryItems: [newItem, ...state.memoryItems] }));
      return newItem;
    } else {
      // Demo mode - local only
      const newItem: MemoryItem = {
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        user_id: '1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      set(state => ({ memoryItems: [newItem, ...state.memoryItems] }));
      return newItem;
    }
  },
  
  updateMemoryItem: async (id, updates) => {
    const { isAuthenticated } = get();
    
    if (isAuthenticated) {
      const updatedItem = await memoryItemService.updateMemoryItem(id, updates);
      set(state => ({
        memoryItems: state.memoryItems.map(item =>
          item.id === id ? updatedItem : item
        ),
      }));
    } else {
      set(state => ({
        memoryItems: state.memoryItems.map(item =>
          item.id === id ? { ...item, ...updates, updated_at: new Date().toISOString() } : item
        ),
      }));
    }
  },
  
  deleteMemoryItem: async (id) => {
    const { isAuthenticated } = get();
    
    if (isAuthenticated) {
      await memoryItemService.deleteMemoryItem(id);
    }
    
    set(state => ({
      memoryItems: state.memoryItems.filter(item => item.id !== id),
    }));
  },
  
  // Category CRUD
  addCategory: async (category) => {
    const { isAuthenticated } = get();
    
    if (isAuthenticated) {
      const newCategory = await categoryService.createCategory(category);
      set(state => ({ categories: [...state.categories, newCategory] }));
      return newCategory;
    } else {
      const newCategory: Category = {
        ...category,
        id: Math.random().toString(36).substr(2, 9),
        user_id: '1',
        created_at: new Date().toISOString(),
      };
      set(state => ({ categories: [...state.categories, newCategory] }));
      return newCategory;
    }
  },
  
  updateCategory: async (id, updates) => {
    const { isAuthenticated } = get();
    
    if (isAuthenticated) {
      const updatedCategory = await categoryService.updateCategory(id, updates);
      set(state => ({
        categories: state.categories.map(cat =>
          cat.id === id ? updatedCategory : cat
        ),
      }));
    } else {
      set(state => ({
        categories: state.categories.map(cat =>
          cat.id === id ? { ...cat, ...updates } : cat
        ),
      }));
    }
  },
  
  deleteCategory: async (id) => {
    const { isAuthenticated } = get();
    
    if (isAuthenticated) {
      await categoryService.deleteCategory(id);
    }
    
    set(state => ({
      categories: state.categories.filter(cat => cat.id !== id),
    }));
  },
  
  // Profile Updates
  updateProfile: async (updates) => {
    const { isAuthenticated, profile } = get();
    
    if (isAuthenticated) {
      const updatedProfile = await profileService.updateProfile(updates);
      set({ profile: updatedProfile });
    } else if (profile) {
      set({ profile: { ...profile, ...updates } });
    }
  },
  
  updateNotificationPreferences: async (prefs) => {
    const { isAuthenticated, profile } = get();
    
    if (isAuthenticated) {
      const updatedProfile = await profileService.updateNotificationPreferences(prefs);
      set({ profile: updatedProfile });
    } else if (profile) {
      set({ profile: { ...profile, notification_preferences: prefs } });
    }
  },
  
  // Helper functions
  getItemsDueToday: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().memoryItems.filter(item => 
      item.next_review_date <= today && item.status !== 'archived'
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
}));
