import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import { BorderRadius, Colors, Typography } from '../../constants/Colors';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    style?: ViewStyle;
    textStyle?: TextStyle;
    fullWidth?: boolean;
}

export function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon,
    iconPosition = 'left',
    style,
    textStyle,
    fullWidth = false,
}: ButtonProps) {
    const sizeStyles = {
        sm: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: BorderRadius.md },
        md: { paddingVertical: 14, paddingHorizontal: 22, borderRadius: BorderRadius.lg },
        lg: { paddingVertical: 18, paddingHorizontal: 28, borderRadius: BorderRadius.xl },
    };

    const textSizes = {
        sm: Typography.sizes.sm,
        md: Typography.sizes.base,
        lg: Typography.sizes.lg,
    };

    const content = (
        <>
            {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
                <>
                    {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
                    <Text
                        style={[
                            styles.text,
                            { fontSize: textSizes[size] },
                            variant === 'outline' && styles.outlineText,
                            variant === 'ghost' && styles.ghostText,
                            variant === 'glass' && styles.glassText,
                            textStyle,
                        ]}
                    >
                        {title}
                    </Text>
                    {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
                </>
            )}
        </>
    );

    if (variant === 'primary') {
        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled || loading}
                activeOpacity={0.85}
                style={[fullWidth && styles.fullWidth, style]}
            >
                <LinearGradient
                    colors={Colors.gradient.primary as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                        styles.buttonBase,
                        sizeStyles[size],
                        disabled && styles.disabled,
                    ]}
                >
                    {content}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    const variantStyles = {
        secondary: styles.secondaryContainer,
        outline: styles.outlineContainer,
        ghost: styles.ghostContainer,
        glass: styles.glassContainer,
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.75}
            style={[
                styles.buttonBase,
                variantStyles[variant],
                sizeStyles[size],
                disabled && styles.disabled,
                fullWidth && styles.fullWidth,
                style,
            ]}
        >
            {content}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    buttonBase: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    fullWidth: {
        width: '100%',
    },
    text: {
        color: '#FFFFFF',
        fontWeight: Typography.weights.semibold,
        letterSpacing: 0.3,
    },
    iconLeft: {
        marginRight: 4,
    },
    iconRight: {
        marginLeft: 4,
    },
    disabled: {
        opacity: 0.4,
    },
    secondaryContainer: {
        backgroundColor: Colors.dark.cardElevated,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    outlineContainer: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: Colors.dark.accent,
    },
    outlineText: {
        color: Colors.dark.accent,
    },
    ghostContainer: {
        backgroundColor: 'transparent',
    },
    ghostText: {
        color: Colors.dark.accent,
    },
    glassContainer: {
        backgroundColor: Colors.dark.card,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    glassText: {
        color: Colors.dark.text,
    },
});
