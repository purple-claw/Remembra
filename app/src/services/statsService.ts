import { db, requireAuth } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { StatsData, DaySchedule } from '@/types';

export const statsService = {
  // Get comprehensive stats data
  async getStatsData(): Promise<StatsData> {
    const userId = requireAuth();

    // Get all memory items
    const itemsQ = query(
      collection(db, 'memory_items'),
      where('user_id', '==', userId),
    );
    const itemsSnap = await getDocs(itemsQ);
    const itemsData = itemsSnap.docs.map(d => d.data());

    // Get profile
    const profileRef = doc(db, 'profiles', userId);
    const profileSnap = await getDoc(profileRef);
    const profileData = profileSnap.data();

    // Get categories
    const catQ = query(
      collection(db, 'categories'),
      where('user_id', '==', userId),
    );
    const catSnap = await getDocs(catQ);
    const categoriesData = catSnap.docs.map(d => d.data());

    // Get streak entries
    const streakQ = query(
      collection(db, 'streak_entries'),
      where('user_id', '==', userId),
      orderBy('date', 'asc'),
    );
    const streakSnap = await getDocs(streakQ);
    const streakEntriesData = streakSnap.docs.map(d => d.data());

    // Calculate stats
    const totalItems = itemsData.length;
    const masteredItems = itemsData.filter(i => i.status === 'completed').length;

    // Calculate retention curve
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
        time_spent: Math.round(totalReviewTime / 60),
        color: cat.color,
      };
    });

    // Calculate daily activity
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
    const curve: { date: string; retention: number }[] = [];

    for (let week = 0; week < 8; week++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (week + 1) * 7);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - week * 7);

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const q = query(
        collection(db, 'reviews'),
        where('user_id', '==', userId),
        where('scheduled_date', '>=', startStr),
        where('scheduled_date', '<', endStr),
      );
      const snap = await getDocs(q);
      const reviewsData = snap.docs.map(d => d.data()).filter(d => d.completed_date != null);

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
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const activity: { date: string; count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const q = query(
        collection(db, 'reviews'),
        where('user_id', '==', userId),
        where('scheduled_date', '==', dateStr),
      );
      const snap = await getDocs(q);
      const count = snap.docs.filter(d => d.data().completed_date != null).length;

      activity.push({
        date: days[date.getDay()],
        count,
      });
    }

    return activity;
  },

  // Get calendar data for date range
  async getCalendarData(startDate: string, endDate: string): Promise<DaySchedule[]> {
    const userId = requireAuth();

    // Get all memory items due in range
    const itemsQ = query(
      collection(db, 'memory_items'),
      where('user_id', '==', userId),
    );
    const itemsSnap = await getDocs(itemsQ);
    const itemsData = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter by date range client-side (Firestore compound queries limitation)
    const itemsInRange = itemsData.filter(
      (item: any) => item.next_review_date && item.next_review_date >= startDate && item.next_review_date <= endDate
    );

    // Get completed reviews in range
    const reviewsQ = query(
      collection(db, 'reviews'),
      where('user_id', '==', userId),
      where('scheduled_date', '>=', startDate),
      where('scheduled_date', '<=', endDate),
    );
    const reviewsSnap = await getDocs(reviewsQ);
    const reviewsData = reviewsSnap.docs.map(d => d.data());

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
    itemsInRange.forEach((item: any) => {
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
