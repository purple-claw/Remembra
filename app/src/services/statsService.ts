/* eslint-disable @typescript-eslint/no-explicit-any */
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, requireAuth } from '@/lib/firebase';
import { ErrorCode, createAppError, failure, success, type Result } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { StatsData, DaySchedule } from '@/types';

const userCollection = (userId: string, name: string) => collection(db, 'users', userId, name);

export const statsService = {
  async getStatsData(): Promise<Result<StatsData>> {
    try {
      const userId = await requireAuth();

      const [itemsSnap, profileSnap, categoriesSnap, streakSnap] = await Promise.all([
        getDocs(userCollection(userId, 'memory_items')),
        getDoc(doc(db, 'profiles', userId)),
        getDocs(userCollection(userId, 'categories')),
        getDocs(userCollection(userId, 'streak_entries')),
      ]);

    const itemsData = itemsSnap.docs.map((itemDoc) => itemDoc.data() as any);
    const categoriesData = categoriesSnap.docs.map((categoryDoc) => ({
      id: categoryDoc.id,
      ...(categoryDoc.data() as any),
    }));
    const streakEntriesData = streakSnap.docs
      .map((entryDoc) => entryDoc.data() as any)
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    const profileData = profileSnap.exists() ? (profileSnap.data() as any) : null;

    const totalItems = itemsData.length;
    const masteredItems = itemsData.filter((item) => item.status === 'completed').length;

      const retentionCurveResult = await this.calculateRetentionCurve(userId);
      if (!retentionCurveResult.success) {
        return retentionCurveResult;
      }

    const categoryBreakdown = categoriesData.map((category) => {
      const categoryItems = itemsData.filter((item) => item.category_id === category.id);
      const totalReviewTime = categoryItems.reduce((acc: number, item: any) => {
        const history = Array.isArray(item.review_history) ? item.review_history : [];
        return acc + history.reduce((sum: number, review: any) => sum + (review.time_spent_seconds || 0), 0);
      }, 0);

      return {
        category: category.name,
        time_spent: Math.round(totalReviewTime / 60),
        color: category.color,
      };
    });

      const dailyActivityResult = await this.calculateDailyActivity(userId);
      if (!dailyActivityResult.success) {
        return dailyActivityResult;
      }

    let longestStreak = 0;
    let currentStreakCount = 0;

    streakEntriesData.forEach((entry) => {
      if (!entry.streak_broken) {
        currentStreakCount += 1;
        longestStreak = Math.max(longestStreak, currentStreakCount);
      } else {
        currentStreakCount = 0;
      }
    });

    const allReviewHistory = itemsData.flatMap((item) => (Array.isArray(item.review_history) ? item.review_history : []));
    const easyCount = allReviewHistory.filter((review: any) => review.performance === 'easy').length;
    const goodCount = allReviewHistory.filter((review: any) => review.performance === 'good' || review.performance === 'medium').length;
    const totalReviews = allReviewHistory.length;

    const averageAccuracy = totalReviews > 0
      ? Math.round(((easyCount + goodCount * 0.7) / totalReviews) * 100)
      : 0;

      return success({
        retention_curve: retentionCurveResult.data,
        category_breakdown: categoryBreakdown,
        daily_activity: dailyActivityResult.data,
        total_items: totalItems,
        mastered_items: masteredItems,
        current_streak: profileData?.streak_count || 0,
        longest_streak: longestStreak,
        average_accuracy: averageAccuracy,
      });
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to load stats data',
      });
      logger.error('statsService.getStatsData failed', appError as Error);
      return failure(appError);
    }
  },

  async calculateRetentionCurve(userId: string): Promise<Result<{ date: string; retention: number }[]>> {
    try {
      const reviewsSnap = await getDocs(userCollection(userId, 'reviews'));
      const reviewsData = reviewsSnap.docs.map((reviewDoc) => reviewDoc.data() as any);
      const curve: { date: string; retention: number }[] = [];

    for (let week = 0; week < 8; week++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (week + 1) * 7);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - week * 7);

      const periodReviews = reviewsData.filter((review) => {
        if (!review.completed_date) return false;
        const scheduledDate = String(review.scheduled_date || '');
        const start = startDate.toISOString().split('T')[0];
        const end = endDate.toISOString().split('T')[0];
        return scheduledDate >= start && scheduledDate < end;
      });

      const total = periodReviews.length;
      const successful = periodReviews.filter((review) =>
        review.performance === 'easy' || review.performance === 'good' || review.performance === 'medium').length;

      const retention = total > 0 ? Math.round((successful / total) * 100) : 100;

      curve.unshift({
        date: `Week ${8 - week}`,
        retention,
      });
    }

      return success(curve);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to calculate retention curve',
      });
      logger.error('statsService.calculateRetentionCurve failed', appError as Error);
      return failure(appError);
    }
  },

  async calculateDailyActivity(userId: string): Promise<Result<{ date: string; count: number }[]>> {
    try {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const reviewsSnap = await getDocs(userCollection(userId, 'reviews'));
      const reviewsData = reviewsSnap.docs.map((reviewDoc) => reviewDoc.data() as any);

      const activity: { date: string; count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const count = reviewsData.filter((review) =>
        review.scheduled_date === dateStr && !!review.completed_date).length;

      activity.push({
        date: days[date.getDay()],
        count,
      });
    }

      return success(activity);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to calculate daily activity',
      });
      logger.error('statsService.calculateDailyActivity failed', appError as Error);
      return failure(appError);
    }
  },

  async getCalendarData(startDate: string, endDate: string): Promise<Result<DaySchedule[]>> {
    try {
      const userId = await requireAuth();

    const [itemsSnap, reviewsSnap] = await Promise.all([
      getDocs(userCollection(userId, 'memory_items')),
      getDocs(userCollection(userId, 'reviews')),
    ]);

    const itemsData = itemsSnap.docs.map((itemDoc) => itemDoc.data() as any);
    const reviewsData = reviewsSnap.docs.map((reviewDoc) => reviewDoc.data() as any);

    const filteredItems = itemsData.filter((item) =>
      item.next_review_date && item.next_review_date >= startDate && item.next_review_date <= endDate);

    const filteredReviews = reviewsData.filter((review) =>
      review.scheduled_date >= startDate && review.scheduled_date <= endDate);

    const calendarMap: Record<string, DaySchedule> = {};

    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
      const dateStr = day.toISOString().split('T')[0];
      calendarMap[dateStr] = {
        date: dateStr,
        reviews_due: 0,
        reviews_completed: 0,
        items: [],
      };
    }

    filteredItems.forEach((item) => {
      const dateStr = item.next_review_date;
      if (calendarMap[dateStr]) {
        calendarMap[dateStr].reviews_due += 1;
        calendarMap[dateStr].items.push(item as any);
      }
    });

    filteredReviews.forEach((review) => {
      const dateStr = review.scheduled_date;
      if (calendarMap[dateStr] && review.completed_date) {
        calendarMap[dateStr].reviews_completed += 1;
      }
    });

      return success(Object.values(calendarMap).sort((a, b) => a.date.localeCompare(b.date)));
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Failed to load calendar data',
      });
      logger.error('statsService.getCalendarData failed', appError as Error);
      return failure(appError);
    }
  },
};
