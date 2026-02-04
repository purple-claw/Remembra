// Notification scheduling helpers for Remembra
// Uses Expo Notifications for local reminders

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getTodayReviews } from './database';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// Request notification permissions
export async function requestNotificationPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
    }

    // Configure for Android
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('reviews', {
            name: 'Review Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6366F1',
        });
    }

    return true;
}

// Schedule a daily review reminder
export async function scheduleDailyReminder(
    hour: number = 9,
    minute: number = 0
): Promise<string | null> {
    try {
        // Cancel existing daily reminder
        await cancelDailyReminder();

        const identifier = await Notifications.scheduleNotificationAsync({
            content: {
                title: '📚 Time to Review!',
                body: 'Your memory items are waiting. Keep your streak going!',
                data: { type: 'daily_reminder' },
                sound: true,
            },
            trigger: {
                hour,
                minute,
                repeats: true,
            } as any,
        });

        return identifier;
    } catch (error) {
        console.error('Error scheduling daily reminder:', error);
        return null;
    }
}

// Cancel the daily reminder
export async function cancelDailyReminder(): Promise<void> {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of notifications) {
        if (notification.content.data?.type === 'daily_reminder') {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
    }
}

// Schedule streak reminder (evening warning if no reviews done)
export async function scheduleStreakReminder(hour: number = 20): Promise<string | null> {
    try {
        // Cancel existing streak reminder
        await cancelStreakReminder();

        const identifier = await Notifications.scheduleNotificationAsync({
            content: {
                title: '🔥 Don\'t break your streak!',
                body: 'You haven\'t completed any reviews today. Review now to keep your streak!',
                data: { type: 'streak_reminder' },
                sound: true,
            },
            trigger: {
                hour,
                minute: 0,
                repeats: true,
            } as any,
        });

        return identifier;
    } catch (error) {
        console.error('Error scheduling streak reminder:', error);
        return null;
    }
}

// Cancel streak reminder
export async function cancelStreakReminder(): Promise<void> {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of notifications) {
        if (notification.content.data?.type === 'streak_reminder') {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
    }
}

// Send immediate notification for completed reviews
export async function sendReviewCompleteNotification(
    reviewsCompleted: number,
    streakCount: number
): Promise<void> {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: '✅ Great job!',
            body: `You completed ${reviewsCompleted} review${reviewsCompleted > 1 ? 's' : ''}! Streak: ${streakCount} days 🔥`,
            data: { type: 'review_complete' },
        },
        trigger: null, // Immediate
    });
}

// Update badge count with pending reviews
export async function updateBadgeCount(userId: string): Promise<void> {
    try {
        const dueItems = await getTodayReviews(userId);
        await Notifications.setBadgeCountAsync(dueItems.length);
    } catch (error) {
        console.error('Error updating badge count:', error);
    }
}

// Get all scheduled notifications (for debugging)
export async function getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
}

// Cancel all notifications
export async function cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}
