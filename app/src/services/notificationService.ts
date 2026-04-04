import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { MemoryItem } from '@/types';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ErrorCode, createAppError, failure, success, type Result } from '@/lib/errors';
import { logger } from '@/lib/logger';

const REVIEW_CHANNEL_ID = 'review-reminders';
const DAILY_CHANNEL_ID = 'daily-review-summary';
const DAILY_SUMMARY_NOTIFICATION_ID = 147000;
const ENABLE_PUSH_REGISTRATION = import.meta.env.VITE_ENABLE_PUSH_REGISTRATION === 'true';

const buildReviewReminderMessage = (title: string) =>
  `Time to review: ${title}. Active recall strengthens memory.`;

const buildDailySummaryMessage = (dueCount: number) =>
  `${dueCount} review${dueCount === 1 ? '' : 's'} due today. Small wins build momentum.`;

class NotificationService {
  private isNative = Capacitor.isNativePlatform();
  private initialized = false;

  async initialize(): Promise<Result<boolean>> {
    if (!this.isNative) return success(false);
    if (this.initialized) return success(true);

    try {
      const localPermResult = await LocalNotifications.requestPermissions();
      if (localPermResult.display !== 'granted') {
        logger.warn('Local notification permissions not granted');
        return success(false);
      }

      const channelResult = await this.createChannel();
      if (!channelResult.success) {
        return failure(channelResult.error);
      }

      await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        logger.info('Local notification action performed', { notification });
      });

      const pushResult = await this.setupPushRegistration();
      if (!pushResult.success) {
        logger.warn('Push registration setup failed', { error: pushResult.error.message });
      }

      this.initialized = true;
      return success(true);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.SERVICE_UNAVAILABLE,
        message: 'Failed to initialize notifications',
      });
      logger.error('notificationService.initialize failed', appError as Error);
      return failure(appError);
    }
  }

  async scheduleReviewNotifications(item: MemoryItem): Promise<Result<void>> {
    return this.scheduleNextReview(item);
  }

  async scheduleNextReview(item: MemoryItem): Promise<Result<void>> {
    if (!this.isNative || item.status !== 'active' || !item.next_review_date) return success(undefined);

    try {
      const cancelResult = await this.cancelItemNotifications(item.id);
      if (!cancelResult.success) {
        return cancelResult;
      }

      const reviewDate = new Date(`${item.next_review_date}T09:00:00`);
      if (reviewDate <= new Date()) return success(undefined);

      const notifId = this.generateNotificationId(item.id, item.review_stage);
      const body = buildReviewReminderMessage(item.title);

      await LocalNotifications.schedule({
        notifications: [{
          id: notifId,
          title: 'Review Reminder',
          body,
          schedule: { at: reviewDate },
          extra: { itemId: item.id, stage: item.review_stage },
          channelId: REVIEW_CHANNEL_ID,
        }],
      });
      return success(undefined);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.SERVICE_UNAVAILABLE,
        message: 'Failed to schedule next review notification',
      });
      logger.error('notificationService.scheduleNextReview failed', appError as Error);
      return failure(appError);
    }
  }

  async scheduleDailySummary(items: MemoryItem[], reminderTime: string = '09:00'): Promise<Result<void>> {
    if (!this.isNative) return success(undefined);

    try {
      const [hourStr, minuteStr] = reminderTime.split(':');
      const hour = Number(hourStr || '9');
      const minute = Number(minuteStr || '0');

      const now = new Date();
      const triggerAt = new Date(now);
      triggerAt.setHours(hour, minute, 0, 0);
      if (triggerAt <= now) {
        triggerAt.setDate(triggerAt.getDate() + 1);
      }

      const targetDayIso = triggerAt.toISOString().split('T')[0];
      const dueForReminderDay = items
        .filter((item) =>
          item.status === 'active' &&
          !!item.next_review_date &&
          item.next_review_date <= targetDayIso,
        )
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      const body = buildDailySummaryMessage(dueForReminderDay.length);

      await LocalNotifications.cancel({ notifications: [{ id: DAILY_SUMMARY_NOTIFICATION_ID }] });

      await LocalNotifications.schedule({
        notifications: [{
          id: DAILY_SUMMARY_NOTIFICATION_ID,
          title: dueForReminderDay.length > 0
            ? `${dueForReminderDay.length} review${dueForReminderDay.length === 1 ? '' : 's'} due`
            : 'No reviews due',
          body,
          schedule: { at: triggerAt },
          channelId: DAILY_CHANNEL_ID,
        }],
      });
      return success(undefined);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.SERVICE_UNAVAILABLE,
        message: 'Failed to schedule daily summary notification',
      });
      logger.error('notificationService.scheduleDailySummary failed', appError as Error);
      return failure(appError);
    }
  }

  async cancelItemNotifications(itemId: string): Promise<Result<void>> {
    if (!this.isNative) return success(undefined);

    try {
      const pending = await LocalNotifications.getPending();
      const itemNotifIds = pending.notifications
        .filter(n => n.extra?.itemId === itemId)
        .map(n => ({ id: n.id }));

      if (itemNotifIds.length > 0) {
        await LocalNotifications.cancel({ notifications: itemNotifIds });
      }
      return success(undefined);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.SERVICE_UNAVAILABLE,
        message: 'Failed to cancel item notifications',
      });
      logger.error('notificationService.cancelItemNotifications failed', appError as Error, { itemId });
      return failure(appError);
    }
  }

  async cancelAll(): Promise<Result<void>> {
    if (!this.isNative) return success(undefined);

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
      }
      return success(undefined);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.SERVICE_UNAVAILABLE,
        message: 'Failed to cancel all notifications',
      });
      logger.error('notificationService.cancelAll failed', appError as Error);
      return failure(appError);
    }
  }

  async createChannel(): Promise<Result<void>> {
    if (!this.isNative) return success(undefined);

    try {
      await LocalNotifications.createChannel({
        id: REVIEW_CHANNEL_ID,
        name: 'Review Reminders',
        description: 'Notifications for 1-4-7 retention reviews',
        importance: 4,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#FF8000',
      });

      await LocalNotifications.createChannel({
        id: DAILY_CHANNEL_ID,
        name: 'Daily Study Plan',
        description: 'Daily summary reminders',
        importance: 3,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#FF4500',
      });
      return success(undefined);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.SERVICE_UNAVAILABLE,
        message: 'Failed to create notification channels',
      });
      logger.error('notificationService.createChannel failed', appError as Error);
      return failure(appError);
    }
  }

  private async setupPushRegistration(): Promise<Result<void>> {
    if (!ENABLE_PUSH_REGISTRATION) {
      logger.info('Push registration skipped: set VITE_ENABLE_PUSH_REGISTRATION=true after Firebase setup');
      return success(undefined);
    }

    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      const permStatus = await PushNotifications.requestPermissions();
      if (permStatus.receive !== 'granted') {
        logger.warn('Push permission not granted');
        return success(undefined);
      }

      await PushNotifications.addListener('registration', async (token) => {
        const persistResult = await this.persistPushToken(token.value);
        if (!persistResult.success) {
          logger.warn('Failed to persist push token', { error: persistResult.error.message });
        }
      });

      await PushNotifications.addListener('registrationError', (error) => {
        logger.warn('Push registration error', { error });
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        logger.info('Push notification received', { notification });
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        logger.info('Push notification action performed', { notification });
      });

      await PushNotifications.register();
      return success(undefined);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.SERVICE_UNAVAILABLE,
        message: 'Push setup skipped (likely missing FCM config)',
      });
      logger.warn('notificationService.setupPushRegistration failed', { error: appError.message });
      return failure(appError);
    }
  }

  private async persistPushToken(token: string): Promise<Result<void>> {
    try {
      const user = auth.currentUser;
      if (!user) return success(undefined);

      const tokenDoc = doc(db, 'device_push_tokens', token);
      await setDoc(tokenDoc, {
        user_id: user.uid,
        token,
        platform: Capacitor.getPlatform(),
        device_info: {
          appId: 'com.remembra.app',
          source: 'capacitor-push',
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      }, { merge: true });
      return success(undefined);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.DATABASE_ERROR,
        message: 'Unable to persist push token',
      });
      logger.warn('notificationService.persistPushToken failed', { error: appError.message });
      return failure(appError);
    }
  }

  private generateNotificationId(itemId: string, stageIndex: number): number {
    let hash = 0;
    const str = `${itemId}-${stageIndex}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    const normalized = Math.abs(hash);
    return normalized === 2147483648 ? 2147483647 : Math.max(1, Math.min(2147483647, normalized));
  }
}

export const notificationService = new NotificationService();
