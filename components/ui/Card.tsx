import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { BorderRadius, Colors, Spacing } from '../../constants/Colors';

interface CardProps {
    children: React.ReactNode;
    variant?: 'default' | 'elevated' | 'gradient' | 'glass';
    style?: ViewStyle;
    gradientColors?: string[];
    noPadding?: boolean;
}

export function Card({
    children,
    variant = 'default',
    style,
    gradientColors,
    noPadding = false,
}: CardProps) {
    const paddingStyle = noPadding ? {} : { padding: Spacing.lg };

    if (variant === 'gradient') {
        return (
            <LinearGradient
                colors={Colors.gradient.primary as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.base, paddingStyle, style]}
            >
                {children}
            </LinearGradient>
        );
    }

    const variantStyles = {
        default: styles.glass,
        elevated: styles.glassElevated,
        glass: styles.glassSubtle,
    };

    return (
        <View style={[styles.base, variantStyles[variant], paddingStyle, style]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
    },
    glass: {
        backgroundColor: Colors.dark.card,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    glassElevated: {
        backgroundColor: Colors.dark.cardElevated,
        borderWidth: 1,
        borderColor: Colors.dark.glassHighlight,
    },
    glassSubtle: {
        backgroundColor: Colors.dark.cardGlass,
        borderWidth: 1,
        borderColor: Colors.dark.borderSubtle,
    },
});
