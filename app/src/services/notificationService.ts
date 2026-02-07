import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { MemoryItem } from '@/types';

/**
 * Notification service for scheduling review reminders on Android.
 * With SM-2 adaptive scheduling, we can only schedule the NEXT review
 * (future intervals are computed dynamically after each review).
 */
class NotificationService {
  private isNative = Capacitor.isNativePlatform();

  async initialize(): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const permResult = await LocalNotifications.requestPermissions();
      if (permResult.display !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }
      await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        console.log('Notification action:', notification);
      });
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * Schedule notification for the next review of an item.
   * Called on item creation and after each review completion.
   */
  async scheduleReviewNotifications(item: MemoryItem): Promise<void> {
    await this.scheduleNextReview(item);
  }

  /**
   * Schedule a single notification for the next review of an item
   * (called after completing a review)
   */
  async scheduleNextReview(item: MemoryItem): Promise<void> {
    if (!this.isNative || item.status !== 'active' || !item.next_review_date) return;

    try {
      await this.cancelItemNotifications(item.id);

      const reviewDate = new Date(item.next_review_date + 'T09:00:00');
      if (reviewDate <= new Date()) return;

      const notifId = this.generateNotificationId(item.id, item.repetition);

      await LocalNotifications.schedule({
        notifications: [{
          id: notifId,
          title: '📚 Review Due!',
          body: `"${item.title}" is ready for review`,
          schedule: { at: reviewDate, allowWhileIdle: true },
          extra: { itemId: item.id },
          smallIcon: 'ic_stat_icon_config_sample',
          largeIcon: 'ic_launcher',
          channelId: 'review-reminders',
        }],
      });
    } catch (error) {
      console.error('Failed to schedule next review notification:', error);
    }
  }

  /**
   * Cancel all notifications for a specific item
   */
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

  /**
   * Cancel all scheduled notifications
   */
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

  /**
   * Create a notification channel for Android (required for Android 8+)
   */
  async createChannel(): Promise<void> {
    if (!this.isNative) return;

    try {
      await LocalNotifications.createChannel({
        id: 'review-reminders',
        name: 'Review Reminders',
        description: 'Notifications for scheduled spaced repetition reviews',
        importance: 4, // High
        visibility: 1, // Public
        vibration: true,
        sound: 'beep.wav',
        lights: true,
        lightColor: '#FF8000',
      });
    } catch (error) {
      console.error('Failed to create notification channel:', error);
    }
  }

  /**
   * Generate a deterministic numeric ID for a notification
   * based on item ID and stage index
   */
  private generateNotificationId(itemId: string, stageIndex: number): number {
    let hash = 0;
    const str = `${itemId}-${stageIndex}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

export const notificationService = new NotificationService();
