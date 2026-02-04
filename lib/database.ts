import { Category, ContentBlock, MemoryItem, UserProfile } from '../types/types';
import { DbCategory, DbMemoryItem, supabase } from './supabase';

// Convert DB format to app format
function dbToCategory(db: DbCategory): Category {
    return {
        id: db.id,
        name: db.name,
        color: db.color,
        icon: db.icon,
        orderIndex: db.order_index,
        isDefault: db.is_default,
        createdAt: new Date(db.created_at),
    };
}

function dbToMemoryItem(db: DbMemoryItem): MemoryItem {
    return {
        id: db.id,
        categoryId: db.category_id,
        title: db.title,
        content: db.content,
        contentBlocks: db.content_blocks as ContentBlock[],
        contentType: db.content_type as any,
        difficulty: db.difficulty as any,
        status: db.status as any,
        nextReviewDate: new Date(db.next_review_date),
        reviewStage: db.review_stage,
        reviewHistory: db.review_history,
        personalNotes: db.personal_notes,
        aiSummary: db.ai_summary || undefined,
        tags: db.tags,
        createdAt: new Date(db.created_at),
        updatedAt: new Date(db.updated_at),
    };
}

// Auth functions
export async function signUpWithEmail(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { username },
        },
    });
    return { data, error };
}

export async function signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    return { data, error };
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// Profile functions
export async function getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error || !data) return null;

    return {
        id: data.id,
        username: data.username,
        streakCount: data.streak_count,
        totalReviews: data.total_reviews,
        timezone: data.timezone,
        createdAt: new Date(data.created_at),
    };
}

export async function updateProfile(userId: string, updates: Partial<UserProfile>) {
    const { error } = await supabase
        .from('profiles')
        .update({
            username: updates.username,
            streak_count: updates.streakCount,
            total_reviews: updates.totalReviews,
            timezone: updates.timezone,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

    return { error };
}

// Category functions
export async function getCategories(userId: string): Promise<Category[]> {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('order_index');

    if (error || !data) return [];
    return data.map(dbToCategory);
}

export async function createCategory(userId: string, category: Partial<Category>) {
    const { data, error } = await supabase
        .from('categories')
        .insert({
            user_id: userId,
            name: category.name,
            color: category.color,
            icon: category.icon,
            order_index: category.orderIndex,
            is_default: category.isDefault || false,
        })
        .select()
        .single();

    return { data: data ? dbToCategory(data) : null, error };
}

export async function deleteCategory(categoryId: string) {
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

    return { error };
}

// Memory Item functions
export async function getMemoryItems(userId: string): Promise<MemoryItem[]> {
    const { data, error } = await supabase
        .from('memory_items')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error || !data) return [];
    return data.map(dbToMemoryItem);
}

export async function getMemoryItem(itemId: string): Promise<MemoryItem | null> {
    const { data, error } = await supabase
        .from('memory_items')
        .select('*')
        .eq('id', itemId)
        .single();

    if (error || !data) return null;
    return dbToMemoryItem(data);
}

export async function createMemoryItem(userId: string, item: Partial<MemoryItem>) {
    const { data, error } = await supabase
        .from('memory_items')
        .insert({
            user_id: userId,
            category_id: item.categoryId,
            title: item.title,
            content: item.content || '',
            content_blocks: item.contentBlocks || [],
            content_type: item.contentType || 'text',
            difficulty: item.difficulty || 'medium',
            status: item.status || 'learning',
            next_review_date: item.nextReviewDate?.toISOString() || new Date().toISOString(),
            review_stage: item.reviewStage || 0,
            review_history: item.reviewHistory || [],
            personal_notes: item.personalNotes || '',
            ai_summary: item.aiSummary,
            tags: item.tags || [],
        })
        .select()
        .single();

    return { data: data ? dbToMemoryItem(data) : null, error };
}

export async function updateMemoryItem(itemId: string, updates: Partial<MemoryItem>) {
    const updateData: any = { updated_at: new Date().toISOString() };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.contentBlocks !== undefined) updateData.content_blocks = updates.contentBlocks;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.nextReviewDate !== undefined) updateData.next_review_date = updates.nextReviewDate.toISOString();
    if (updates.reviewStage !== undefined) updateData.review_stage = updates.reviewStage;
    if (updates.reviewHistory !== undefined) updateData.review_history = updates.reviewHistory;
    if (updates.personalNotes !== undefined) updateData.personal_notes = updates.personalNotes;
    if (updates.aiSummary !== undefined) updateData.ai_summary = updates.aiSummary;
    if (updates.tags !== undefined) updateData.tags = updates.tags;

    const { error } = await supabase
        .from('memory_items')
        .update(updateData)
        .eq('id', itemId);

    return { error };
}

export async function deleteMemoryItem(itemId: string) {
    const { error } = await supabase
        .from('memory_items')
        .delete()
        .eq('id', itemId);

    return { error };
}

// Streak functions
export async function recordReview(userId: string, reviewsCompleted: number) {
    const today = new Date().toISOString().split('T')[0];

    // Upsert streak for today
    const { error } = await supabase
        .from('daily_streaks')
        .upsert({
            user_id: userId,
            date: today,
            reviews_completed: reviewsCompleted,
            streak_broken: false,
        }, {
            onConflict: 'user_id,date',
        });

    // Update total reviews in profile
    await supabase.rpc('increment_reviews', { user_id: userId, count: reviewsCompleted });

    return { error };
}

export async function getStreaks(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
        .from('daily_streaks')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

    return { data, error };
}

// Get items due for review today
export async function getTodayReviews(userId: string): Promise<MemoryItem[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('memory_items')
        .select('*')
        .eq('user_id', userId)
        .lte('next_review_date', today + 'T23:59:59Z')
        .neq('status', 'archived')
        .order('next_review_date');

    if (error || !data) return [];
    return data.map(dbToMemoryItem);
}

// Update an existing category
export async function updateCategory(categoryId: string, updates: Partial<Category>) {
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.orderIndex !== undefined) updateData.order_index = updates.orderIndex;

    const { data, error } = await supabase
        .from('categories')
        .update(updateData)
        .eq('id', categoryId)
        .select()
        .single();

    return { data: data ? dbToCategory(data) : null, error };
}

// Process a review using the RPC function (proper 1-4-7-30-90 algorithm)
export async function processReview(
    itemId: string,
    userId: string,
    performance: 'again' | 'hard' | 'medium' | 'easy',
    timeSpent: number = 0
): Promise<{ nextReviewDate: Date; newStage: number; newStatus: string } | null> {
    const { data, error } = await supabase.rpc('process_review', {
        p_item_id: itemId,
        p_user_id: userId,
        p_performance: performance,
        p_time_spent: timeSpent,
    });

    if (error || !data || data.length === 0) {
        console.error('Error processing review:', error);
        return null;
    }

    return {
        nextReviewDate: new Date(data[0].next_review_date),
        newStage: data[0].new_stage,
        newStatus: data[0].new_status,
    };
}

// Get upcoming reviews for the next N days
export async function getUpcomingReviews(userId: string, days: number = 7): Promise<MemoryItem[]> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const { data, error } = await supabase
        .from('memory_items')
        .select('*')
        .eq('user_id', userId)
        .lte('next_review_date', endDate.toISOString())
        .neq('status', 'archived')
        .order('next_review_date');

    if (error || !data) return [];
    return data.map(dbToMemoryItem);
}

// Search memory items using the RPC function
export async function searchMemoryItems(
    userId: string,
    query: string,
    categoryId?: string,
    status?: string
): Promise<MemoryItem[]> {
    const { data, error } = await supabase.rpc('search_items', {
        p_user_id: userId,
        p_query: query,
        p_category_id: categoryId || null,
        p_status: status || null,
    });

    if (error || !data) return [];
    return data.map(dbToMemoryItem);
}

// Get due items using RPC function
export async function getDueItems(
    userId: string,
    categoryId?: string,
    limit: number = 50
): Promise<MemoryItem[]> {
    const { data, error } = await supabase.rpc('get_due_items', {
        p_user_id: userId,
        p_category_id: categoryId || null,
        p_limit: limit,
    });

    if (error || !data) return [];
    return data.map(dbToMemoryItem);
}

// Update user streak using RPC
export async function updateUserStreak(userId: string): Promise<number> {
    const { data, error } = await supabase.rpc('update_streak', {
        p_user_id: userId,
    });

    if (error) {
        console.error('Error updating streak:', error);
        return 0;
    }

    return data || 0;
}

// Get review statistics for a date range
export async function getReviewStats(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: streaks } = await supabase
        .from('daily_streaks')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

    const { data: items } = await supabase
        .from('memory_items')
        .select('status')
        .eq('user_id', userId);

    const stats = {
        totalReviewsThisMonth: streaks?.reduce((acc, s) => acc + s.reviews_completed, 0) || 0,
        daysActive: streaks?.length || 0,
        itemsByStatus: {
            learning: items?.filter(i => i.status === 'learning').length || 0,
            reviewing: items?.filter(i => i.status === 'reviewing').length || 0,
            mastered: items?.filter(i => i.status === 'mastered').length || 0,
            archived: items?.filter(i => i.status === 'archived').length || 0,
        },
    };

    return stats;
}

