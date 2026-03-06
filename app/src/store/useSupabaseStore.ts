import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MemoryItem, Category, Profile, Achievement, DaySchedule, Performance, ReviewStatus, NotificationPreferences, DailyReview } from '@/types';
import type { AppUser, AppSession } from '@/types/auth';
import { DECISION_STAGE } from '@/domain/review147';
import { 
  authService,
  profileService,
  categoryService,
  memoryItemService,
  achievementService,
  statsService,
  streakService,
  notificationService,
  avatarService,
  isFirebaseConfigured,
} from '@/services';

// Track if already initialized to prevent double data loads
let _initialized = false;
let _authSubscription: { unsubscribe: () => void } | null = null;

const getSortDateOrMax = (dateIso?: string) => (dateIso ? new Date(`${dateIso}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER);

const sortByCreatedAtAsc = (a: MemoryItem, b: MemoryItem) =>
  new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

const sortByDueThenCreated = (a: MemoryItem, b: MemoryItem) => {
  const dueDiff = getSortDateOrMax(a.next_review_date) - getSortDateOrMax(b.next_review_date);
  if (dueDiff !== 0) return dueDiff;
  return sortByCreatedAtAsc(a, b);
};

const isAwaitingSevenDayDecision = (item: MemoryItem) =>
  item.status === 'active' && item.review_stage === DECISION_STAGE && !item.next_review_date;

export type Screen = 'dashboard' | 'calendar' | 'review' | 'library' | 'create' | 'ai-tools' | 'stats' | 'profile' | 'persist' | 'test' | 'auth';

const MAX_NAV_HISTORY = 40;
const NON_HISTORY_SCREENS: Screen[] = ['auth'];

interface AuthState {
  user: AppUser | null;
  session: AppSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AppState extends AuthState {
  // Navigation
  currentScreen: Screen;
  navigationHistory: Screen[];
  setScreen: (screen: Screen, options?: { replace?: boolean }) => void;
  goBack: (fallback?: Screen) => boolean;
  canGoBack: () => boolean;
  resetNavigation: (screen?: Screen) => void;
  
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
  navigationHistory: [],
  setScreen: (screen, options) => set((state) => {
    if (state.currentScreen === screen) {
      return state;
    }

    const shouldTrackHistory = !options?.replace
      && !NON_HISTORY_SCREENS.includes(state.currentScreen)
      && !NON_HISTORY_SCREENS.includes(screen);

    const navigationHistory = shouldTrackHistory
      ? [...state.navigationHistory, state.currentScreen].slice(-MAX_NAV_HISTORY)
      : state.navigationHistory;

    return {
      currentScreen: screen,
      navigationHistory,
    };
  }),
  goBack: (fallback = 'dashboard') => {
    const state = get();
    const history = [...state.navigationHistory];

    while (history.length > 0) {
      const previousScreen = history.pop() as Screen;
      if (previousScreen === state.currentScreen) continue;
      if (!state.isAuthenticated && previousScreen !== 'auth') continue;

      set({
        currentScreen: previousScreen,
        navigationHistory: history,
      });
      return true;
    }

    if (state.isAuthenticated && state.currentScreen !== fallback) {
      set({
        currentScreen: fallback,
        navigationHistory: [],
      });
      return true;
    }

    if (!state.isAuthenticated && state.currentScreen !== 'auth') {
      set({
        currentScreen: 'auth',
        navigationHistory: [],
      });
      return true;
    }

    return false;
  },
  canGoBack: () => {
    const state = get();
    if (state.navigationHistory.length > 0) return true;
    if (state.isAuthenticated && state.currentScreen !== 'dashboard') return true;
    if (!state.isAuthenticated && state.currentScreen !== 'auth') return true;
    return false;
  },
  resetNavigation: (screen) => set((state) => ({
    navigationHistory: [],
    currentScreen: screen ?? state.currentScreen,
  })),
  
  // Initial Data - empty until authenticated and loaded from Firebase
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
    // Guard against double initialization
    if (_initialized) return;
    _initialized = true;
    
    try {
      // If Firebase is not configured, show auth screen
      if (!isFirebaseConfigured) {
        console.log('Firebase not configured. Please set environment variables.');
        set({ isLoading: false, currentScreen: 'auth', navigationHistory: [] });
        return;
      }
      
      // Get current session
      const session = await authService.getSession();
      const user = session?.user ?? null;
      
      if (user) {
        // Set authenticated but keep loading until data is fetched
        set({ 
          user, 
          session, 
          isAuthenticated: true,
          currentScreen: 'dashboard',
          navigationHistory: [],
        });
        
        // Load user data before dismissing loading screen
        try {
          await get().loadUserData();
        } catch (e) {
          console.warn('Failed to load user data during init:', e);
        }
        
        // Initialize notifications in background (non-blocking)
        notificationService.createChannel().then(() => {
          return notificationService.initialize();
        }).then(() => {
          const state = get();
          const reminderTime = state.profile?.notification_preferences?.reminder_time || '09:00';
          return notificationService.scheduleDailySummary(state.memoryItems, reminderTime);
        }).catch(e => {
          console.warn('[Store] Background notification setup failed:', e);
        });
        
        set({ isLoading: false });
      } else {
        set({ 
          user: null, 
          session: null, 
          isAuthenticated: false,
          isLoading: false,
          currentScreen: 'auth',
          navigationHistory: [],
        });
      }
      
      // Unsubscribe previous listener if any
      if (_authSubscription) {
        _authSubscription.unsubscribe();
      }
      
      // Subscribe to auth changes
      const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
        const user = session?.user ?? null;
        set({ 
          user, 
          session, 
          isAuthenticated: !!user,
        });
        
        if (event === 'SIGNED_IN' && user) {
          set({ currentScreen: 'dashboard', navigationHistory: [] });
          try {
            await get().loadUserData();
          } catch (e) {
            console.warn('[Store] loadUserData after sign-in failed:', e);
          }
          // Non-blocking notification setup
          notificationService.initialize().then(() => {
            const state = get();
            const reminderTime = state.profile?.notification_preferences?.reminder_time || '09:00';
            return notificationService.scheduleDailySummary(state.memoryItems, reminderTime);
          }).catch(e => {
            console.warn('[Store] Notification setup after sign-in failed:', e);
          });
        } else if (event === 'SIGNED_OUT') {
          set({
            currentScreen: 'auth',
            navigationHistory: [],
            profile: null,
            categories: [],
            memoryItems: [],
            achievements: [],
            calendarData: [],
            dailyReviews: [],
          });
        }
      });
      
      _authSubscription = subscription;
    } catch (error) {
      console.error('Error initializing app:', error);
      set({ isLoading: false, currentScreen: 'auth', navigationHistory: [] });
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
    // Always clear local state even if Firebase call fails
    try {
      await authService.signOut();
    } catch (error) {
      console.warn('[Store] Firebase signOut error (clearing local state anyway):', error);
    }
    notificationService.cancelAll().catch(console.warn);
    set({
      user: null,
      session: null,
      isAuthenticated: false,
      currentScreen: 'auth',
      navigationHistory: [],
      profile: null,
      categories: [],
      memoryItems: [],
      achievements: [],
      calendarData: [],
      dailyReviews: [],
    });
  },
  
  // Load all user data from Firebase
  loadUserData: async () => {
    try {
      const { user } = get();
      
      // Ensure user setup (profile, default categories, achievements) exists
      if (user) {
        const username = user.user_metadata?.username || user.email?.split('@')[0] || 'User';
        await authService.ensureUserSetup(user.id, username, user.email);
        try {
          await memoryItemService.processLifecycle();
        } catch (e) {
          console.warn('Lifecycle processing during load failed:', e);
        }
      }
      
      // Use allSettled so partial failures don't block everything
      const results = await Promise.allSettled([
        profileService.getProfile(),
        categoryService.getCategories(),
        memoryItemService.getMemoryItems(),
        achievementService.getAchievements(),
      ]);
      
      const profile = results[0].status === 'fulfilled' ? results[0].value : null;
      const categories = results[1].status === 'fulfilled' ? results[1].value : [];
      const memoryItems = results[2].status === 'fulfilled' ? results[2].value : [];
      const achievements = results[3].status === 'fulfilled' ? results[3].value : [];
      
      // Log any failures
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`loadUserData: promise ${i} failed:`, r.reason);
        }
      });
      
      // Build fallback profile from auth user if DB profile is null
      const fallbackProfile: Profile | null = user ? {
        id: user.id,
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || avatarService.generateProfileAvatarUrl({
          username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
          email: user.email || undefined,
          userId: user.id,
        }),
        timezone: 'UTC',
        notification_preferences: {
          daily_reminder: true,
          reminder_time: '09:00',
          streak_reminder: true,
          achievement_notifications: true,
          ai_insights: true,
        },
        streak_count: 0,
        total_reviews: 0,
        created_at: new Date().toISOString(),
      } : null;
      
      // Get calendar data for current period
      let calendarData: DaySchedule[] = [];
      try {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 14);
        
        calendarData = await statsService.getCalendarData(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );
      } catch (e) {
        console.warn('Failed to load calendar data:', e);
      }
      
      set({
        profile: profile || fallbackProfile,
        categories,
        memoryItems,
        achievements,
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
    // Review due topics in deterministic order: due date first, then creation time.
    const sorted = [...itemsToReview].sort(sortByDueThenCreated);
    set((state) => {
      const shouldTrackHistory = state.currentScreen !== 'review' && !NON_HISTORY_SCREENS.includes(state.currentScreen);
      const navigationHistory = shouldTrackHistory
        ? [...state.navigationHistory, state.currentScreen].slice(-MAX_NAV_HISTORY)
        : state.navigationHistory;

      return {
        reviewQueue: sorted,
        currentReviewIndex: 0,
        currentScreen: 'review',
        navigationHistory,
      };
    });
  },
  
  nextReviewItem: () => {
    const { currentReviewIndex, reviewQueue } = get();
    if (currentReviewIndex < reviewQueue.length - 1) {
      set({ currentReviewIndex: currentReviewIndex + 1 });
    } else {
      set({ 
        currentScreen: 'dashboard',
        navigationHistory: [],
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
      // Update item in Firebase using strict 1-4-7 engine
      let updatedItem = await memoryItemService.completeReview(currentItem.id, performance, timeSpentSeconds);
      
      // Update local state
      if (updatedItem) {
        const initialUpdatedItem = updatedItem;
        set(state => ({
          memoryItems: state.memoryItems.map(item =>
            item.id === currentItem.id ? initialUpdatedItem : item
          ),
        }));
      } else {
        // Item was auto-deleted
        set(state => ({
          memoryItems: state.memoryItems.filter(item => item.id !== currentItem.id),
        }));
      }

      // After finishing Day 7, user chooses Day 30 reinforcement or completion.
      if (updatedItem && isAwaitingSevenDayDecision(updatedItem)) {
        const schedule30 = window.confirm(
          `"${updatedItem.title}" completed Day 7.\n\nOK = Add Day 30 review\nCancel = Complete topic`,
        );

        updatedItem = schedule30
          ? await memoryItemService.scheduleThirtyDayReview(updatedItem.id)
          : await memoryItemService.completeTopic(updatedItem.id);

        const resolvedItem = updatedItem;
        set(state => ({
          memoryItems: state.memoryItems.map(item =>
            item.id === resolvedItem.id ? resolvedItem : item
          ),
        }));
      }
      
      // Record streak and update profile
      try {
        await streakService.recordReviewCompletion();
        await profileService.incrementTotalReviews();
        
        const updatedProfile = await profileService.getProfile();
        if (updatedProfile) {
          set({ profile: updatedProfile });
        }
      } catch (e) {
        console.warn('Failed to update streak/profile:', e);
      }
      
      // Run legacy lifecycle cleanup
      try {
        await memoryItemService.processLifecycle();
      } catch (e) {
        console.warn('Lifecycle processing failed:', e);
      }
      
      // Keep notifications in sync with current item state
      if (updatedItem?.status === 'active') {
        notificationService.scheduleNextReview(updatedItem).catch(console.warn);
      } else if (updatedItem) {
        notificationService.cancelItemNotifications(updatedItem.id).catch(console.warn);
      }

      const reminderTime = get().profile?.notification_preferences?.reminder_time || '09:00';
      notificationService.scheduleDailySummary(get().memoryItems, reminderTime).catch(console.warn);
      
      // Advance to next item only on success
      get().nextReviewItem();
    } catch (error) {
      console.error('Error completing review:', error);
      // Still advance so user isn't stuck, but log the error
      get().nextReviewItem();
    }
  },
  
  // Memory Item CRUD
  addMemoryItem: async (item) => {
    const newItem = await memoryItemService.createMemoryItem(item);
    set(state => ({ memoryItems: [newItem, ...state.memoryItems] }));
    // Schedule review notifications for this item
    notificationService.scheduleReviewNotifications(newItem).catch(console.warn);
    const reminderTime = get().profile?.notification_preferences?.reminder_time || '09:00';
    notificationService.scheduleDailySummary(get().memoryItems, reminderTime).catch(console.warn);
    return newItem;
  },
  
  updateMemoryItem: async (id, updates) => {
    const updatedItem = await memoryItemService.updateMemoryItem(id, updates);
    set(state => ({
      memoryItems: state.memoryItems.map(item =>
        item.id === id ? updatedItem : item
      ),
    }));
    if (updatedItem.status === 'active') {
      notificationService.scheduleNextReview(updatedItem).catch(console.warn);
    } else {
      notificationService.cancelItemNotifications(updatedItem.id).catch(console.warn);
    }
    const reminderTime = get().profile?.notification_preferences?.reminder_time || '09:00';
    notificationService.scheduleDailySummary(get().memoryItems, reminderTime).catch(console.warn);
  },
  
  deleteMemoryItem: async (id) => {
    await memoryItemService.deleteMemoryItem(id);
    set(state => ({
      memoryItems: state.memoryItems.filter(item => item.id !== id),
    }));
    notificationService.cancelItemNotifications(id).catch(console.warn);
    const reminderTime = get().profile?.notification_preferences?.reminder_time || '09:00';
    notificationService.scheduleDailySummary(get().memoryItems, reminderTime).catch(console.warn);
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
    notificationService.scheduleDailySummary(get().memoryItems, prefs.reminder_time).catch(console.warn);
  },
  
  // Helper functions
  getItemsDueToday: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().memoryItems
      .filter(item => item.next_review_date && item.next_review_date <= today && item.status === 'active')
      .sort(sortByDueThenCreated);
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
  
  // Mark a review as complete from calendar (uses strict 1-4-7) — persists to Firebase
  markReviewComplete: async (itemId, date, performance) => {
    try {
      let updatedItem = await memoryItemService.completeReview(itemId, performance, 0, date);
      if (!updatedItem) return;
      
      const initialUpdatedItem = updatedItem;
      set(state => ({
        memoryItems: state.memoryItems.map(i =>
          i.id === itemId ? initialUpdatedItem : i
        ),
        dailyReviews: state.dailyReviews.map(r =>
          r.memory_item_id === itemId && r.scheduled_date === date
            ? { ...r, status: 'completed' as const, completed_at: new Date().toISOString(), performance }
            : r
        ),
      }));

      try {
        await streakService.recordReviewCompletion();
        await profileService.incrementTotalReviews();
        const updatedProfile = await profileService.getProfile();
        if (updatedProfile) {
          set({ profile: updatedProfile });
        }
      } catch (e) {
        console.warn('Failed to update streak/profile from calendar review:', e);
      }

      if (isAwaitingSevenDayDecision(updatedItem)) {
        const schedule30 = window.confirm(
          `"${updatedItem.title}" completed Day 7.\n\nOK = Add Day 30 review\nCancel = Complete topic`,
        );

        updatedItem = schedule30
          ? await memoryItemService.scheduleThirtyDayReview(updatedItem.id)
          : await memoryItemService.completeTopic(updatedItem.id);

        const resolvedItem = updatedItem;
        set(state => ({
          memoryItems: state.memoryItems.map(item =>
            item.id === resolvedItem.id ? resolvedItem : item
          ),
        }));
      }

      if (updatedItem.status === 'completed') {
        await notificationService.cancelItemNotifications(updatedItem.id);
      } else {
        notificationService.scheduleNextReview(updatedItem).catch(console.warn);
      }

      const reminderTime = get().profile?.notification_preferences?.reminder_time || '09:00';
      notificationService.scheduleDailySummary(get().memoryItems, reminderTime).catch(console.warn);
    } catch (error) {
      console.error('Error persisting review to Firebase:', error);
    }
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
  partialize: () => ({
    // Don't persist screen state — always start from auth/dashboard based on session
  }),
}));
