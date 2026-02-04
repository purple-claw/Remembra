// Notification Service for Remembra
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { db } from './database'

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      })
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    return finalStatus === 'granted'
  }

  static async scheduleDailyReminder(userId: string, time: string = '09:00:00') {
    const hasPermission = await this.requestPermissions()
    if (!hasPermission) {
      console.warn('Notification permissions not granted')
      return
    }

    // Cancel existing daily reminder
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    for (const notification of scheduled) {
      if (notification.identifier.includes('daily-reminder')) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier)
      }
    }

    // Parse time (HH:MM:SS)
    const [hours, minutes] = time.split(':').map(Number)

    // Schedule new daily reminder
    await Notifications.scheduleNotificationAsync({
      identifier: `daily-reminder-${userId}`,
      content: {
        title: '📚 Time to Review!',
        body: 'You have items waiting for review. Keep your streak going!',
        data: { type: 'daily-reminder' },
      },
      trigger: {
        hour: hours,
        minute: minutes,
        repeats: true,
      } as any,
    })
  }

  static async scheduleReviewReminder(itemId: string, itemTitle: string, reviewDate: Date) {
    const hasPermission = await this.requestPermissions()
    if (!hasPermission) return

    await Notifications.scheduleNotificationAsync({
      identifier: `review-${itemId}`,
      content: {
        title: '🔔 Review Time',
        body: `Time to review: ${itemTitle}`,
        data: { type: 'review-reminder', itemId },
      },
      trigger: reviewDate as any,
    })
  }

  static async cancelReviewReminder(itemId: string) {
    await Notifications.cancelScheduledNotificationAsync(`review-${itemId}`)
  }

  static async sendStreakReminder(streakCount: number) {
    const hasPermission = await this.requestPermissions()
    if (!hasPermission) return

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 Streak Alert!',
        body: `You have a ${streakCount} day streak! Don't break it today!`,
        data: { type: 'streak-reminder' },
      },
      trigger: null, // Send immediately
    })
  }

  static async sendAchievementNotification(title: string, message: string) {
    const hasPermission = await this.requestPermissions()
    if (!hasPermission) return

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🎉 ${title}`,
        body: message,
        data: { type: 'achievement' },
      },
      trigger: null,
    })
  }

  static async updateNotificationBadge(count: number) {
    await Notifications.setBadgeCountAsync(count)
  }

  static async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync()
    await Notifications.setBadgeCountAsync(0)
  }

  static async cancelAllScheduledNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync()
  }

  // Smart scheduling based on user's review history
  static async scheduleSmartReminders(userId: string) {
    try {
      const insights = await db.getStudyInsights(userId)
      const queue = await db.getReviewQueue(userId)

      if (queue.length === 0) return

      // Schedule reminder at user's best study time
      const bestHour = insights.best_time_of_day ?? 9
      const now = new Date()
      const reminderTime = new Date()
      reminderTime.setHours(bestHour, 0, 0, 0)

      if (reminderTime <= now) {
        // If best time has passed today, schedule for tomorrow
        reminderTime.setDate(reminderTime.getDate() + 1)
      }

      await Notifications.scheduleNotificationAsync({
        identifier: `smart-reminder-${userId}`,
        content: {
          title: '🧠 Perfect Time to Study!',
          body: `You have ${queue.length} items ready for review. This is your optimal study time!`,
          data: { type: 'smart-reminder' },
        },
        trigger: reminderTime as any,
      })
    } catch (error) {
      console.error('Error scheduling smart reminder:', error)
    }
  }

  // Setup all notifications for a user
  static async setupUserNotifications(userId: string) {
    try {
      const prefs = await db.getNotificationPreferences(userId)
      
      if (!prefs || !prefs.enabled) {
        await this.cancelAllScheduledNotifications()
        return
      }

      if (prefs.daily_reminder_time) {
        await this.scheduleDailyReminder(userId, prefs.daily_reminder_time)
      }

      if (prefs.smart_scheduling) {
        await this.scheduleSmartReminders(userId)
      }

      // Update badge with current review count
      const queue = await db.getReviewQueue(userId)
      await this.updateNotificationBadge(queue.length)
    } catch (error) {
      console.error('Error setting up notifications:', error)
    }
  }

  // Handle notification response (when user taps notification)
  static addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback)
  }

  // Handle notification received while app is foregrounded
  static addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(callback)
  }
}

export const notifications = NotificationService
