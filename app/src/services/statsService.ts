import { getSupabase, requireAuth } from '@/lib/supabase';
import type { StatsData, DaySchedule } from '@/types';

export const statsService = {
  // Get comprehensive stats data
  async getStatsData(): Promise<StatsData> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    // Get all memory items to calculate stats
    const { data: items, error: itemsError } = await supabase
      .from('memory_items')
      .select('*')
      .eq('user_id', userId);
    
    if (itemsError) {
      console.error('Error fetching memory items for stats:', itemsError);
      throw itemsError;
    }
    
    // Get profile for streak data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('streak_count, total_reviews')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile for stats:', profileError);
      throw profileError;
    }
    
    // Get categories for breakdown
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);
    
    if (catError) {
      console.error('Error fetching categories for stats:', catError);
      throw catError;
    }
    
    // Get streak entries for longest streak calculation
    const { data: streakEntries, error: streakError } = await supabase
      .from('streak_entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });
    
    if (streakError) {
      console.error('Error fetching streak entries:', streakError);
    }
    
    // Cast data to any for flexible access
    const itemsData = (items || []) as any[];
    const categoriesData = (categories || []) as any[];
    const profileData = profile as any;
    const streakEntriesData = (streakEntries || []) as any[];
    
    // Calculate stats
    const totalItems = itemsData.length;
    const masteredItems = itemsData.filter(i => i.status === 'completed').length;
    
    // Calculate retention curve (weekly)
    const retentionCurve = await this.calculateRetentionCurve(userId);
    
    // Calculate category breakdown
    const categoryBreakdown = categoriesData.map(cat => {
      const catItems = itemsData.filter(i => i.category_id === cat.id);
      const totalReviewTime = catItems.reduce((acc: number, item: any) => {
        const history = (item.review_history || []) as { time_spent_seconds: number }[];
        return acc + history.reduce((sum, h) => sum + (h.time_spent_seconds || 0), 0);
      }, 0);
      return {
        category: cat.name,
        time_spent: Math.round(totalReviewTime / 60), // Convert to minutes
        color: cat.color,
      };
    });
    
    // Calculate daily activity (last 7 days)
    const dailyActivity = await this.calculateDailyActivity(userId);
    
    // Calculate longest streak
    let longestStreak = 0;
    let currentStreakCount = 0;
    streakEntriesData.forEach(entry => {
      if (!entry.streak_broken) {
        currentStreakCount++;
        longestStreak = Math.max(longestStreak, currentStreakCount);
      } else {
        currentStreakCount = 0;
      }
    });
    
    // Calculate average accuracy
    const allReviewHistory = itemsData.flatMap(i => (i.review_history || []) as { performance: string }[]);
    const easyCount = allReviewHistory.filter(r => r.performance === 'easy').length;
    const goodCount = allReviewHistory.filter(r => r.performance === 'good' || r.performance === 'medium').length;
    const totalReviews = allReviewHistory.length;
    const averageAccuracy = totalReviews > 0 
      ? Math.round(((easyCount + goodCount * 0.7) / totalReviews) * 100)
      : 0;
    
    return {
      retention_curve: retentionCurve,
      category_breakdown: categoryBreakdown,
      daily_activity: dailyActivity,
      total_items: totalItems,
      mastered_items: masteredItems,
      current_streak: profileData?.streak_count || 0,
      longest_streak: longestStreak,
      average_accuracy: averageAccuracy,
    };
  },

  // Calculate retention curve (last 8 weeks)
  async calculateRetentionCurve(userId: string): Promise<{ date: string; retention: number }[]> {
    const supabase = getSupabase();
    const curve: { date: string; retention: number }[] = [];
    
    for (let week = 0; week < 8; week++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (week + 1) * 7);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - week * 7);
      
      const { data: reviews } = await supabase
        .from('reviews')
        .select('performance')
        .eq('user_id', userId)
        .gte('scheduled_date', startDate.toISOString().split('T')[0])
        .lt('scheduled_date', endDate.toISOString().split('T')[0])
        .not('completed_date', 'is', null);
      
      const reviewsData = (reviews || []) as any[];
      const total = reviewsData.length;
      const successful = reviewsData.filter(r => 
        r.performance === 'easy' || r.performance === 'good' || r.performance === 'medium'
      ).length;
      
      const retention = total > 0 ? Math.round((successful / total) * 100) : 100;
      
      curve.unshift({
        date: `Week ${8 - week}`,
        retention,
      });
    }
    
    return curve;
  },

  // Calculate daily activity (last 7 days)
  async calculateDailyActivity(userId: string): Promise<{ date: string; count: number }[]> {
    const supabase = getSupabase();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const activity: { date: string; count: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const { count } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('scheduled_date', dateStr)
        .not('completed_date', 'is', null);
      
      activity.push({
        date: days[date.getDay()],
        count: count || 0,
      });
    }
    
    return activity;
  },

  // Get calendar data for date range
  async getCalendarData(startDate: string, endDate: string): Promise<DaySchedule[]> {
    const supabase = getSupabase();
    const userId = await requireAuth();
    
    // Get all memory items due in range
    const { data: items, error: itemsError } = await supabase
      .from('memory_items')
      .select('*')
      .eq('user_id', userId)
      .gte('next_review_date', startDate)
      .lte('next_review_date', endDate);
    
    if (itemsError) {
      console.error('Error fetching items for calendar:', itemsError);
      throw itemsError;
    }
    
    // Get completed reviews in range
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userId)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate);
    
    if (reviewsError) {
      console.error('Error fetching reviews for calendar:', reviewsError);
      throw reviewsError;
    }
    
    const itemsData = (items || []) as any[];
    const reviewsData = (reviews || []) as any[];
    
    // Build calendar data
    const calendarMap: Record<string, DaySchedule> = {};
    
    // Initialize dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      calendarMap[dateStr] = {
        date: dateStr,
        reviews_due: 0,
        reviews_completed: 0,
        items: [],
      };
    }
    
    // Add items
    itemsData.forEach(item => {
      const dateStr = item.next_review_date;
      if (calendarMap[dateStr]) {
        calendarMap[dateStr].reviews_due++;
        calendarMap[dateStr].items.push(item);
      }
    });
    
    // Add completed reviews
    reviewsData.forEach(review => {
      const dateStr = review.scheduled_date;
      if (calendarMap[dateStr] && review.completed_date) {
        calendarMap[dateStr].reviews_completed++;
      }
    });
    
    return Object.values(calendarMap).sort((a, b) => 
      a.date.localeCompare(b.date)
    );
  },
};
