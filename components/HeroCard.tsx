import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/Colors';

interface HeroCardProps {
    title: string;
    subtitle: string;
    ctaText: string;
    onPress: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
    reviewCount?: number;
}

export function HeroCard({
    title,
    subtitle,
    ctaText,
    onPress,
    icon = 'flash',
    reviewCount = 0,
}: HeroCardProps) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
            <LinearGradient
                colors={Colors.gradient.primary as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.container}
            >
                {/* Glass overlay */}
                <View style={styles.glassOverlay} />

                <View style={styles.content}>
                    <View style={styles.topRow}>
                        <View style={styles.iconContainer}>
                            <Ionicons name={icon} size={24} color="#FFFFFF" />
                        </View>

                        {reviewCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{reviewCount}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.textContainer}>
                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.subtitle}>{subtitle}</Text>
                    </View>

                    <View style={styles.ctaContainer}>
                        <Text style={styles.ctaText}>{ctaText}</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </View>
                </View>

                {/* Decorative elements */}
                <View style={styles.decorCircle1} />
                <View style={styles.decorCircle2} />
            </LinearGradient>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: BorderRadius['2xl'],
        overflow: 'hidden',
        minHeight: 180,
        position: 'relative',
    },
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    content: {
        padding: Spacing.lg,
        flex: 1,
        justifyContent: 'space-between',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.lg,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
    },
    badgeText: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.bold,
        color: '#FFFFFF',
    },
    textContainer: {
        marginTop: Spacing.md,
    },
    title: {
        fontSize: Typography.sizes['2xl'],
        fontWeight: Typography.weights.bold,
        color: '#FFFFFF',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: Typography.sizes.base,
        color: 'rgba(255, 255, 255, 0.85)',
    },
    ctaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: Spacing.lg,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        alignSelf: 'flex-start',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: BorderRadius.lg,
    },
    ctaText: {
        color: '#FFFFFF',
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.semibold,
    },
    decorCircle1: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    decorCircle2: {
        position: 'absolute',
        bottom: -30,
        right: 50,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
});
