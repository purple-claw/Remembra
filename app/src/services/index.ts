// Export all services
export { authService } from './authService';
export { profileService } from './profileService';
export { categoryService } from './categoryService';
export { memoryItemService } from './memoryItemService';
export { reviewService } from './reviewService';
export { achievementService } from './achievementService';
export { statsService } from './statsService';
export { streakService } from './streakService';
export { aiService } from './aiService';
export { notificationService } from './notificationService';
export { storageService, MEMORY_IMAGE_BUCKET } from './storageService';
export { avatarService } from './avatarService';

// Re-export Supabase client and utilities
export { supabase, getSupabase, getCurrentUserId, requireAuth, isSupabaseConfigured } from '@/lib/supabase';
