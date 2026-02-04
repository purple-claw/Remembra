import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/Colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

interface CalendarDay {
    date: number;
    fullDate: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    hasReviews: boolean;
    reviewCount: number;
}

function getMonthDays(year: number, month: number): CalendarDay[] {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: CalendarDay[] = [];

    // Previous month days
    const prevMonthDays = firstDay.getDay();
    const prevMonth = new Date(year, month, 0);
    for (let i = prevMonthDays - 1; i >= 0; i--) {
        const d = prevMonth.getDate() - i;
        days.push({
            date: d,
            fullDate: new Date(year, month - 1, d),
            isCurrentMonth: false,
            isToday: false,
            hasReviews: false,
            reviewCount: 0,
        });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const date = new Date(year, month, i);
        const isToday = date.getTime() === today.getTime();
        // Demo: random reviews for visual testing
        const hasReviews = Math.random() > 0.6;
        days.push({
            date: i,
            fullDate: date,
            isCurrentMonth: true,
            isToday,
            hasReviews,
            reviewCount: hasReviews ? Math.floor(Math.random() * 5) + 1 : 0,
        });
    }

    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
        days.push({
            date: i,
            fullDate: new Date(year, month + 1, i),
            isCurrentMonth: false,
            isToday: false,
            hasReviews: false,
            reviewCount: 0,
        });
    }

    return days;
}

export default function CalendarScreen() {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = useState<Date | null>(today);

    const days = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth]);
    const cellSize = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.xs * 6) / 7;

    const goToPrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const goToNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const goToToday = () => {
        setCurrentMonth(today.getMonth());
        setCurrentYear(today.getFullYear());
        setSelectedDate(today);
    };

    const isSelected = (day: CalendarDay) => {
        if (!selectedDate) return false;
        return day.fullDate.toDateString() === selectedDate.toDateString();
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.yearText}>{currentYear}</Text>
                    <Text style={styles.monthText}>{MONTHS[currentMonth]}</Text>
                </View>
                <TouchableOpacity style={styles.todayBtn} onPress={goToToday}>
                    <Text style={styles.todayBtnText}>Today</Text>
                </TouchableOpacity>
            </View>

            {/* Month Navigation */}
            <View style={styles.navRow}>
                <TouchableOpacity onPress={goToPrevMonth} style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={20} color={Colors.dark.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={20} color={Colors.dark.text} />
                </TouchableOpacity>
            </View>

            {/* Days Header */}
            <View style={styles.daysHeader}>
                {DAYS.map((day, index) => (
                    <View key={index} style={[styles.dayHeaderCell, { width: cellSize }]}>
                        <Text style={[
                            styles.dayHeaderText,
                            (index === 0 || index === 6) && styles.weekendText
                        ]}>
                            {day}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
                {days.map((day, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.dayCell,
                            { width: cellSize, height: cellSize },
                            day.isToday && styles.todayCell,
                            isSelected(day) && !day.isToday && styles.selectedCell,
                        ]}
                        onPress={() => day.isCurrentMonth && setSelectedDate(day.fullDate)}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.dayNumber,
                                !day.isCurrentMonth && styles.otherMonthText,
                                day.isToday && styles.todayText,
                                isSelected(day) && !day.isToday && styles.selectedText,
                            ]}
                        >
                            {day.date}
                        </Text>
                        {day.hasReviews && day.isCurrentMonth && (
                            <View style={[
                                styles.reviewIndicator,
                                day.reviewCount > 3 && styles.reviewIndicatorHigh,
                            ]}>
                                <Text style={styles.reviewIndicatorText}>{day.reviewCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {/* Selected Date Info */}
            {selectedDate && (
                <View style={styles.selectedInfo}>
                    <View style={styles.selectedInfoHeader}>
                        <Text style={styles.selectedDateText}>
                            {selectedDate.toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </Text>
                    </View>
                    <View style={styles.reviewList}>
                        <View style={styles.reviewItem}>
                            <View style={styles.reviewItemDot} />
                            <Text style={styles.reviewItemText}>No reviews scheduled</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.addReviewBtn}>
                        <Ionicons name="add" size={18} color={Colors.dark.accent} />
                        <Text style={styles.addReviewText}>Schedule Review</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
    },
    yearText: {
        fontSize: Typography.sizes.sm,
        color: Colors.dark.textMuted,
        marginBottom: 2,
    },
    monthText: {
        fontSize: Typography.sizes['3xl'],
        fontWeight: Typography.weights.bold,
        color: Colors.dark.text,
    },
    todayBtn: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.dark.card,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    todayBtnText: {
        fontSize: Typography.sizes.sm,
        color: Colors.dark.accent,
        fontWeight: Typography.weights.medium,
    },
    navRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.md,
    },
    navBtn: {
        width: 40,
        height: 40,
        backgroundColor: Colors.dark.card,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    daysHeader: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    dayHeaderCell: {
        alignItems: 'center',
    },
    dayHeaderText: {
        fontSize: Typography.sizes.sm,
        color: Colors.dark.textSecondary,
        fontWeight: Typography.weights.medium,
    },
    weekendText: {
        color: Colors.dark.textMuted,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: Spacing.lg,
        gap: Spacing.xs,
    },
    dayCell: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.md,
        position: 'relative',
    },
    todayCell: {
        backgroundColor: Colors.dark.accent,
    },
    selectedCell: {
        backgroundColor: Colors.dark.cardElevated,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    dayNumber: {
        fontSize: Typography.sizes.base,
        color: Colors.dark.text,
        fontWeight: Typography.weights.medium,
    },
    todayText: {
        color: '#FFFFFF',
        fontWeight: Typography.weights.bold,
    },
    selectedText: {
        color: Colors.dark.text,
    },
    otherMonthText: {
        color: Colors.dark.textMuted,
        opacity: 0.4,
    },
    reviewIndicator: {
        position: 'absolute',
        bottom: 4,
        backgroundColor: Colors.dark.accentSecondary,
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: BorderRadius.xs,
        minWidth: 16,
        alignItems: 'center',
    },
    reviewIndicatorHigh: {
        backgroundColor: Colors.dark.accent,
    },
    reviewIndicatorText: {
        fontSize: 9,
        color: '#FFFFFF',
        fontWeight: Typography.weights.bold,
    },
    selectedInfo: {
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.xl,
        backgroundColor: Colors.dark.card,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    selectedInfoHeader: {
        marginBottom: Spacing.md,
    },
    selectedDateText: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold,
        color: Colors.dark.text,
    },
    reviewList: {
        gap: Spacing.sm,
    },
    reviewItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
    },
    reviewItemDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.dark.textMuted,
    },
    reviewItemText: {
        fontSize: Typography.sizes.base,
        color: Colors.dark.textSecondary,
    },
    addReviewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        marginTop: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.dark.cardElevated,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    addReviewText: {
        fontSize: Typography.sizes.sm,
        color: Colors.dark.accent,
        fontWeight: Typography.weights.medium,
    },
});
