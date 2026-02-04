// Remembra Global State Store using Zustand
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { 
  AppState, 
  Profile, 
  Category, 
  ReviewQueueItem, 
  UserStats 
} from '@/types'

interface StoreState extends AppState {
  // Additional UI state
  selectedCategoryId: string | null
  activeReviewId: string | null
  
  // Additional actions
  setSelectedCategory: (categoryId: string | null) => void
  setActiveReview: (reviewId: string | null) => void
  addCategory: (category: Category) => void
  updateCategory: (id: string, updates: Partial<Category>) => void
  deleteCategory: (id: string) => void
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      categories: [],
      reviewQueue: [],
      stats: null,
      isLoading: false,
      error: null,
      selectedCategoryId: null,
      activeReviewId: null,
      
      // Auth actions
      setUser: (user) => set({ user }),
      
      // Data actions
      setCategories: (categories) => set({ categories }),
      
      setReviewQueue: (reviewQueue) => set({ reviewQueue }),
      
      setStats: (stats) => set({ stats }),
      
      // UI actions
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      setSelectedCategory: (selectedCategoryId) => set({ selectedCategoryId }),
      
      setActiveReview: (activeReviewId) => set({ activeReviewId }),
      
      // Category management
      addCategory: (category) => set((state) => ({
        categories: [...state.categories, category]
      })),
      
      updateCategory: (id, updates) => set((state) => ({
        categories: state.categories.map((cat) =>
          cat.id === id ? { ...cat, ...updates } : cat
        )
      })),
      
      deleteCategory: (id) => set((state) => ({
        categories: state.categories.filter((cat) => cat.id !== id),
        selectedCategoryId: state.selectedCategoryId === id ? null : state.selectedCategoryId
      })),
      
      // Reset state (logout)
      reset: () => set({
        user: null,
        session: null,
        categories: [],
        reviewQueue: [],
        stats: null,
        selectedCategoryId: null,
        activeReviewId: null,
        error: null,
        isLoading: false
      }),
    }),
    {
      name: 'remembra-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist certain fields
      partialize: (state) => ({
        user: state.user,
        selectedCategoryId: state.selectedCategoryId,
      }),
    }
  )
)

// Selectors for derived state
export const selectCategoriesWithCount = (state: StoreState) => 
  state.categories.sort((a, b) => b.item_count - a.item_count)

export const selectDueToday = (state: StoreState) => 
  state.reviewQueue.length

export const selectSuccessRate = (state: StoreState) => 
  state.stats?.success_rate ?? 0

export const selectStreak = (state: StoreState) => 
  state.user?.streak_count ?? 0

export const selectIsAuthenticated = (state: StoreState) => 
  !!state.user && !!state.session
