import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/Colors';
import { useSupabaseStore as useStore } from '../../lib/supabaseStore';

function StatCard({
    title,
    value,
    subtitle,
    icon,
    color,
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
}) {
    return (
        <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
            {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
    );
}

function AchievementBadge({
    name,
    icon,
    unlocked,
    color,
}: {
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    unlocked: boolean;
    color: string;
}) {
    return (
        <View style={[styles.badge, !unlocked && styles.badgeLocked]}>
            <View style={[styles.badgeIcon, { backgroundColor: unlocked ? color : Colors.dark.borderSubtle }]}>
                <Ionicons name={icon} size={18} color={unlocked ? '#FFFFFF' : Colors.dark.textMuted} />
            </View>
            <Text style={[styles.badgeName, !unlocked && styles.badgeNameLocked]} numberOfLines={1}>
                {name}
            </Text>
        </View>
    );
}

export default function StatsScreen() {
    const { user, memoryItems, getCurrentStreak } = useStore();
    const currentStreak = getCurrentStreak();

    const totalItems = memoryItems.length;
    const masteredItems = memoryItems.filter((m) => m.status === 'mastered').length;
    const learningItems = memoryItems.filter((m) => m.status === 'learning').length;
    const reviewingItems = memoryItems.filter((m) => m.status === 'reviewing').length;

    const achievements = [
        { name: '7 Day Streak', icon: 'flame' as const, unlocked: currentStreak >= 7, color: Colors.dark.accent },
        { name: '100 Reviews', icon: 'checkmark-circle' as const, unlocked: (user?.totalReviews || 0) >= 100, color: Colors.dark.success },
        { name: 'Code Master', icon: 'code-slash' as const, unlocked: false, color: '#22C55E' },
        { name: 'Speed Reader', icon: 'flash' as const, unlocked: false, color: '#F59E0B' },
        { name: 'AI Explorer', icon: 'sparkles' as const, unlocked: false, color: '#8B5CF6' },
        { name: 'Night Owl', icon: 'moon' as const, unlocked: false, color: '#6366F1' },
    ];

    const getProgressWidth = (count: number) => {
        if (totalItems === 0) return 0;
        return (count / totalItems) * 100;
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Stats Grid */}
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
                <StatCard
                    title="Streak"
                    value={currentStreak}
                    subtitle="days"
                    icon="flame"
                    color={Colors.dark.accent}
                />
                <StatCard
                    title="Reviews"
                    value={user?.totalReviews || 0}
                    icon="checkmark-circle"
                    color={Colors.dark.success}
                />
                <StatCard
                    title="Mastered"
                    value={masteredItems}
                    subtitle={`of ${totalItems}`}
                    icon="trophy"
                    color={Colors.dark.warning}
                />
                <StatCard
                    title="Active"
                    value={learningItems + reviewingItems}
                    icon="hourglass"
                    color="#8B5CF6"
                />
            </View>

            {/* Progress */}
            <Text style={styles.sectionTitle}>Progress</Text>
            <View style={styles.progressCard}>
                <View style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                        <View style={[styles.progressDot, { backgroundColor: Colors.dark.success }]} />
                        <Text style={styles.progressLabel}>Mastered</Text>
                        <Text style={styles.progressValue}>{masteredItems}</Text>
                    </View>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${getProgressWidth(masteredItems)}%`, backgroundColor: Colors.dark.success }]} />
                    </View>
                </View>

                <View style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                        <View style={[styles.progressDot, { backgroundColor: Colors.dark.accentSecondary }]} />
                        <Text style={styles.progressLabel}>Reviewing</Text>
                        <Text style={styles.progressValue}>{reviewingItems}</Text>
                    </View>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${getProgressWidth(reviewingItems)}%`, backgroundColor: Colors.dark.accentSecondary }]} />
                    </View>
                </View>

                <View style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                        <View style={[styles.progressDot, { backgroundColor: '#8B5CF6' }]} />
                        <Text style={styles.progressLabel}>Learning</Text>
                        <Text style={styles.progressValue}>{learningItems}</Text>
                    </View>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${getProgressWidth(learningItems)}%`, backgroundColor: '#8B5CF6' }]} />
                    </View>
                </View>
            </View>

            {/* Achievements */}
            <Text style={styles.sectionTitle}>Achievements</Text>
            <View style={styles.achievementsGrid}>
                {achievements.map((achievement) => (
                    <AchievementBadge
                        key={achievement.name}
                        name={achievement.name}
                        icon={achievement.icon}
                        unlocked={achievement.unlocked}
                        color={achievement.color}
                    />
                ))}
            </View>

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
        padding: Spacing.lg,
    },
    sectionTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold,
        color: Colors.dark.text,
        marginBottom: Spacing.md,
        marginTop: Spacing.md,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    statCard: {
        width: '48%',
        alignItems: 'center',
        padding: Spacing.lg,
        backgroundColor: Colors.dark.card,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    statIcon: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    statValue: {
        fontSize: Typography.sizes['3xl'],
        fontWeight: Typography.weights.bold,
        color: Colors.dark.text,
    },
    statTitle: {
        fontSize: Typography.sizes.sm,
        color: Colors.dark.textSecondary,
        marginTop: 2,
    },
    statSubtitle: {
        fontSize: Typography.sizes.xs,
        color: Colors.dark.textMuted,
    },
    progressCard: {
        backgroundColor: Colors.dark.card,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        gap: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    progressItem: {
        gap: 8,
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: Spacing.sm,
    },
    progressLabel: {
        fontSize: Typography.sizes.sm,
        color: Colors.dark.textSecondary,
        flex: 1,
    },
    progressValue: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
        color: Colors.dark.text,
    },
    progressBar: {
        height: 6,
        backgroundColor: Colors.dark.borderSubtle,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
        minWidth: 4,
    },
    achievementsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    badge: {
        width: '31%',
        alignItems: 'center',
        padding: Spacing.md,
        backgroundColor: Colors.dark.card,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    badgeLocked: {
        opacity: 0.5,
    },
    badgeIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xs,
    },
    badgeName: {
        fontSize: 10,
        color: Colors.dark.text,
        textAlign: 'center',
        fontWeight: Typography.weights.medium,
    },
    badgeNameLocked: {
        color: Colors.dark.textMuted,
    },
});
