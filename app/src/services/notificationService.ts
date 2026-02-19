import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import type { MemoryItem } from '@/types';
import { aiService } from '@/services/aiService';
import { getSupabase } from '@/lib/supabase';

const REVIEW_CHANNEL_ID = 'review-reminders';
const DAILY_CHANNEL_ID = 'daily-review-summary';
const DAILY_SUMMARY_NOTIFICATION_ID = 147000;
const ENABLE_PUSH_REGISTRATION = import.meta.env.VITE_ENABLE_PUSH_REGISTRATION === 'true';

class NotificationService {
  private isNative = Capacitor.isNativePlatform();
  private initialized = false;

  async initialize(): Promise<boolean> {
    if (!this.isNative) return false;
    if (this.initialized) return true;

    try {
      const localPermResult = await LocalNotifications.requestPermissions();
      if (localPermResult.display !== 'granted') {
        console.warn('Local notification permissions not granted');
        return false;
      }

      await this.createChannel();

      await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        console.log('Local notification action:', notification);
      });

      await this.setupPushRegistration();

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  async scheduleReviewNotifications(item: MemoryItem): Promise<void> {
    await this.scheduleNextReview(item);
  }

  async scheduleNextReview(item: MemoryItem): Promise<void> {
    if (!this.isNative || item.status !== 'active' || !item.next_review_date) return;

    try {
      await this.cancelItemNotifications(item.id);

      const reviewDate = new Date(`${item.next_review_date}T09:00:00`);
      if (reviewDate <= new Date()) return;

      const notifId = this.generateNotificationId(item.id, item.review_stage);
      const body = await aiService.generateReviewReminderMessage(item.title, item.review_stage);

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
    } catch (error) {
      console.error('Failed to schedule next review notification:', error);
    }
  }

  async scheduleDailySummary(items: MemoryItem[], reminderTime: string = '09:00'): Promise<void> {
    if (!this.isNative) return;

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

      const body = await aiService.generateDailyReminderSummary(
        dueForReminderDay.map(i => i.title),
        dueForReminderDay.length,
      );

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
    } catch (error) {
      console.error('Failed to schedule daily summary notification:', error);
    }
  }

  async cancelItemNotifications(itemId: string): Promise<void> {
    if (!this.isNative) return;

    try {
      const pending = await LocalNotifications.getPending();
      const itemNotifIds = pending.notifications
        .filter(n => n.extra?.itemId === itemId)
        .map(n => ({ id: n.id }));

      if (itemNotifIds.length > 0) {
        await LocalNotifications.cancel({ notifications: itemNotifIds });
      }
    } catch (error) {
      console.error('Failed to cancel notifications:', error);
    }
  }

  async cancelAll(): Promise<void> {
    if (!this.isNative) return;

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
      }
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async createChannel(): Promise<void> {
    if (!this.isNative) return;

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
        description: 'AI-powered daily summary reminders',
        importance: 3,
        visibility: 1,
        vibration: true,
        lights: true,
        lightColor: '#FF4500',
      });
    } catch (error) {
      console.error('Failed to create notification channels:', error);
    }
  }

  private async setupPushRegistration(): Promise<void> {
    if (!ENABLE_PUSH_REGISTRATION) {
      console.info('Push registration skipped: set VITE_ENABLE_PUSH_REGISTRATION=true after Firebase setup');
      return;
    }

    try {
      const permStatus = await PushNotifications.requestPermissions();
      if (permStatus.receive !== 'granted') {
        console.warn('Push permission not granted');
        return;
      }

      await PushNotifications.addListener('registration', async (token) => {
        await this.persistPushToken(token.value);
      });

      await PushNotifications.addListener('registrationError', (error) => {
        console.warn('Push registration error:', error);
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received:', notification);
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed:', notification);
      });

      await PushNotifications.register();
    } catch (error) {
      console.warn('Push setup skipped (likely missing FCM config):', error);
    }
  }

  private async persistPushToken(token: string): Promise<void> {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        user_id: user.id,
        token,
        platform: Capacitor.getPlatform(),
        device_info: {
          appId: 'com.remembra.app',
          source: 'capacitor-push',
        },
      };

      const { error } = await supabase
        .from('device_push_tokens')
        .upsert(payload as any, { onConflict: 'token' });

      if (error) {
        console.warn('Failed to persist push token:', error);
      }
    } catch (error) {
      console.warn('Unable to persist push token:', error);
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
    // Ensure a safe positive 31-bit integer for Android notification IDs.
    return normalized === 2147483648 ? 2147483647 : Math.max(1, Math.min(2147483647, normalized));
  }
}

export const notificationService = new NotificationService();
