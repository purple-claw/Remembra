import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Spacing, Typography } from '../constants/Colors';

interface CalendarDay {
    date: Date;
    hasReviews: boolean;
    reviewCount: number;
    isToday: boolean;
    isPast: boolean;
    dayName: string;
    dayNum: number;
}

interface CalendarStripProps {
    days?: number;
    onDayPress?: (date: Date) => void;
    reviewDates?: { [key: string]: number };
}

function generateDays(numDays: number, reviewDates: { [key: string]: number }): CalendarDay[] {
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 3);

    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < numDays + 3; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        const reviewCount = reviewDates[dateKey] || 0;

        days.push({
            date,
            hasReviews: reviewCount > 0,
            reviewCount,
            isToday: date.getTime() === today.getTime(),
            isPast: date < today,
            dayName: DAY_NAMES[date.getDay()],
            dayNum: date.getDate(),
        });
    }

    return days;
}

export function CalendarStrip({
    days = 14,
    onDayPress,
    reviewDates = {},
}: CalendarStripProps) {
    const calendarDays = generateDays(days, reviewDates);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: 3, animated: true, viewPosition: 0.5 });
        }, 500);
    }, []);

    const renderDay = ({ item }: { item: CalendarDay }) => {
        return (
            <TouchableOpacity
                onPress={() => onDayPress?.(item.date)}
                activeOpacity={0.7}
                style={[
                    styles.dayContainer,
                    item.isToday && styles.todayBorder,
                ]}
            >
                {/* Background */}
                {item.isToday ? (
                    <LinearGradient
                        colors={Colors.gradient.primary as any}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                ) : (
                    <View style={styles.glassBackground} />
                )}

                {/* Content */}
                <View style={styles.contentContainer}>
                    <Text style={[styles.dayName, item.isToday && styles.textLight]}>
                        {item.dayName}
                    </Text>
                    <Text style={[styles.dayNum, item.isToday && styles.textLight]}>
                        {item.dayNum}
                    </Text>

                    {/* Indicator */}
                    <View style={styles.indicatorContainer}>
                        {item.hasReviews && (
                            <View
                                style={[
                                    styles.dot,
                                    item.isToday ? styles.dotWhite : (item.isPast ? styles.dotSuccess : styles.dotAccent)
                                ]}
                            />
                        )}
                    </View>
                </View>

                {/* Glow Line for Today */}
                {item.isToday && <View style={styles.glowLine} />}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>Schedule</Text>
                <Text style={styles.headerSubtitle}>
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
            </View>

            <FlatList
                ref={flatListRef}
                data={calendarDays}
                renderItem={renderDay}
                keyExtractor={(item) => item.date.toISOString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                getItemLayout={(_, index) => ({
                    length: 68,
                    offset: 68 * index,
                    index,
                })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: Spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.xs,
    },
    headerTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.bold,
        color: Colors.dark.text,
    },
    headerSubtitle: {
        fontSize: Typography.sizes.sm,
        color: Colors.dark.textSecondary,
    },
    listContent: {
        gap: 12,
        paddingHorizontal: Spacing.xs,
        paddingBottom: 10,
    },
    dayContainer: {
        width: 56,
        height: 84,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: Colors.dark.card,
        elevation: 4,
        // Web shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    todayBorder: {
        borderColor: 'rgba(255,255,255,0.2)',
    },
    glassBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.dark.cardGlass,
    },
    contentContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        zIndex: 2, // Ensure content is above background
    },
    dayName: {
        fontSize: 12,
        color: Colors.dark.textSecondary,
        fontWeight: '500',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dayNum: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.dark.text,
    },
    textLight: {
        color: '#FFFFFF',
    },
    indicatorContainer: {
        height: 6,
        marginTop: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    dotWhite: {
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
    dotAccent: {
        backgroundColor: Colors.dark.accent,
    },
    dotSuccess: {
        backgroundColor: Colors.dark.success,
    },
    glowLine: {
        position: 'absolute',
        bottom: 0,
        left: 12,
        right: 12,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
        zIndex: 3,
    }
});
