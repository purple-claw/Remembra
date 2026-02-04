import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';

export default function AuthScreen() {
    const router = useRouter();
    const { signIn, signUp } = useAuth();

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        if (!isLogin && !username) {
            setError('Please enter a username');
            return;
        }

        setLoading(true);
        setError('');

        try {
            console.log('Auth screen - attempting', isLogin ? 'sign in' : 'sign up');
            if (isLogin) {
                await signIn(email, password);
                console.log('Sign in successful, redirecting...');
                router.replace('/(tabs)');
            } else {
                await signUp(email, password, username);
                console.log('Sign up successful, redirecting...');
                router.replace('/(tabs)');
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            {/* Header */}
            <View style={styles.header}>
                <LinearGradient
                    colors={Colors.gradient.primary as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.logoContainer}
                >
                    <Ionicons name="flash" size={32} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.title}>Remembra</Text>
                <Text style={styles.subtitle}>Master anything with 1-4-7</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
                {!isLogin && (
                    <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={20} color={Colors.dark.textMuted} />
                        <TextInput
                            style={styles.input}
                            placeholder="Username"
                            placeholderTextColor={Colors.dark.textMuted}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />
                    </View>
                )}

                <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={20} color={Colors.dark.textMuted} />
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor={Colors.dark.textMuted}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color={Colors.dark.textMuted} />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor={Colors.dark.textMuted}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={Colors.dark.textMuted}
                        />
                    </TouchableOpacity>
                </View>

                {error ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={16} color={Colors.dark.danger} />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={Colors.gradient.primary as any}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.submitGradient}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.submitText}>
                                {isLogin ? 'Sign In' : 'Create Account'}
                            </Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.switchButton}
                    onPress={() => {
                        setIsLogin(!isLogin);
                        setError('');
                    }}
                >
                    <Text style={styles.switchText}>
                        {isLogin ? "Don't have an account? " : 'Already have an account? '}
                        <Text style={styles.switchLink}>
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    logoContainer: {
        width: 72,
        height: 72,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: Typography.sizes['3xl'],
        fontWeight: Typography.weights.bold,
        color: Colors.dark.text,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontSize: Typography.sizes.base,
        color: Colors.dark.textSecondary,
    },
    form: {
        gap: Spacing.md,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.dark.card,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: 14,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.dark.glassBorder,
    },
    input: {
        flex: 1,
        color: Colors.dark.text,
        fontSize: Typography.sizes.base,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.sm,
    },
    errorText: {
        color: Colors.dark.danger,
        fontSize: Typography.sizes.sm,
    },
    submitButton: {
        marginTop: Spacing.sm,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    submitGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitText: {
        color: '#FFFFFF',
        fontSize: Typography.sizes.base,
        fontWeight: Typography.weights.semibold,
    },
    switchButton: {
        alignItems: 'center',
        marginTop: Spacing.md,
    },
    switchText: {
        color: Colors.dark.textSecondary,
        fontSize: Typography.sizes.sm,
    },
    switchLink: {
        color: Colors.dark.accent,
        fontWeight: Typography.weights.semibold,
    },
    skipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        marginTop: Spacing.xl,
        paddingVertical: Spacing.md,
    },
    skipText: {
        color: Colors.dark.textMuted,
        fontSize: Typography.sizes.sm,
    },
});
