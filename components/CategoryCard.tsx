import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/Colors';

interface CategoryCardProps {
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    itemCount: number;
    progress?: number;
    onPress: () => void;
}

export function CategoryCard({
    name,
    icon,
    color,
    itemCount,
    progress = 0,
    onPress,
}: CategoryCardProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={styles.container}
            activeOpacity={0.85}
        >
            <View style={[styles.iconContainer, { backgroundColor: color + '18' }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>

            <Text style={styles.name} numberOfLines={1}>
                {name}
            </Text>

            <Text style={styles.count}>
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Text>

            <View style={styles.progressContainer}>
                <View
                    style={[
                        styles.progressBar,
                        { width: `${Math.max(progress, 5)}%`, backgroundColor: color },
                    ]}
                />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 130,
        backgroundColor: Colors.dark.card,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    name: {
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
        color: Colors.dark.text,
        marginBottom: 2,
    },
    count: {
        fontSize: Typography.sizes.xs,
        color: Colors.dark.textMuted,
        marginBottom: Spacing.sm,
    },
    progressContainer: {
        height: 4,
        backgroundColor: Colors.dark.borderSubtle,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 2,
    },
});
