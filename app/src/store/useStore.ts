import { create } from 'zustand';
import type { MemoryItem, Category, Profile, Achievement, DaySchedule, Performance, ReviewStatus } from '@/types';
import { 
  mockMemoryItems, 
  mockCategories, 
  mockProfile, 
  mockAchievements, 
  mockCalendarData
} from '@/data/mockData';

export type Screen = 'dashboard' | 'calendar' | 'review' | 'library' | 'create' | 'ai-tools' | 'stats';

interface AppState {
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
  profile: Profile;
  categories: Category[];
  memoryItems: MemoryItem[];
  achievements: Achievement[];
  calendarData: DaySchedule[];
  currentReviewIndex: number;
  reviewQueue: MemoryItem[];
  startReviewSession: (items?: MemoryItem[]) => void;
  nextReviewItem: () => void;
  completeReview: (performance: Performance) => void;
  addMemoryItem: (item: Omit<MemoryItem, 'id' | 'created_at' | 'updated_at'>) => void;
  updateMemoryItem: (id: string, updates: Partial<MemoryItem>) => void;
  deleteMemoryItem: (id: string) => void;
  addCategory: (category: Omit<Category, 'id' | 'created_at'>) => void;
  getItemsDueToday: () => MemoryItem[];
  getItemsByCategory: (categoryId: string) => MemoryItem[];
  getItemsByStatus: (status: ReviewStatus) => MemoryItem[];
  getCategoryById: (id: string) => Category | undefined;
}

export const useStore = create<AppState>((set, get) => ({
  currentScreen: 'dashboard',
  setScreen: (screen) => set({ currentScreen: screen }),
  profile: mockProfile,
  categories: mockCategories,
  memoryItems: mockMemoryItems,
  achievements: mockAchievements,
  calendarData: mockCalendarData,
  currentReviewIndex: 0,
  reviewQueue: [],
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
  completeReview: (performance) => {
    const { currentReviewIndex, reviewQueue, memoryItems, profile } = get();
    const currentItem = reviewQueue[currentReviewIndex];
    
    if (!currentItem) return;
    
    const updatedItems = memoryItems.map(item => {
      if (item.id === currentItem.id) {
        const newReviewHistory = [...item.review_history, {
          date: new Date().toISOString().split('T')[0],
          performance,
          time_spent_seconds: Math.floor(Math.random() * 120) + 60,
        }];
        
        const intervals = [1, 4, 7, 30, 90];
        let newStage = item.review_stage;
        
        if (performance === 'again') {
          newStage = 0;
        } else if (performance === 'easy') {
          newStage = Math.min(item.review_stage + 2, 4);
        } else {
          newStage = Math.min(item.review_stage + 1, 4);
        }
        
        const daysToAdd = intervals[newStage];
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + daysToAdd);
        
        let newStatus: ReviewStatus = item.status;
        if (newStage >= 3) newStatus = 'mastered';
        else if (newStage > 0) newStatus = 'reviewing';
        else newStatus = 'learning';
        
        return {
          ...item,
          review_history: newReviewHistory,
          review_stage: newStage,
          next_review_date: nextDate.toISOString().split('T')[0],
          status: newStatus,
          updated_at: new Date().toISOString(),
        };
      }
      return item;
    });
    
    const updatedProfile = {
      ...profile,
      total_reviews: profile.total_reviews + 1,
    };
    
    set({ 
      memoryItems: updatedItems,
      profile: updatedProfile,
    });
    
    get().nextReviewItem();
  },
  addMemoryItem: (item) => {
    const newItem: MemoryItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set(state => ({ memoryItems: [...state.memoryItems, newItem] }));
  },
  updateMemoryItem: (id, updates) => {
    set(state => ({
      memoryItems: state.memoryItems.map(item =>
        item.id === id ? { ...item, ...updates, updated_at: new Date().toISOString() } : item
      ),
    }));
  },
  deleteMemoryItem: (id) => {
    set(state => ({
      memoryItems: state.memoryItems.filter(item => item.id !== id),
    }));
  },
  addCategory: (category) => {
    const newCategory: Category = {
      ...category,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
    };
    set(state => ({ categories: [...state.categories, newCategory] }));
  },
  getItemsDueToday: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().memoryItems.filter(item => item.next_review_date === today);
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
