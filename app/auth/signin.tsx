import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import React, { useState, useEffect } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native'
import { useAuth } from '@/contexts/AuthContext'

export default function AuthScreen() {
  const router = useRouter()
  const { signIn, signUp, signInWithMagicLink, user, loading: authLoading } = useAuth()

  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      router.replace('/(tabs)')
    }
  }, [user, authLoading])

  const handleSubmit = async () => {
    setError('')
    setLoading(true)

    try {
      if (mode === 'magic') {
        if (!email) {
          setError('Please enter your email')
          return
        }
        await signInWithMagicLink(email)
        Alert.alert('Check your email!', 'We sent you a magic link to sign in.')
      } else if (mode === 'signin') {
        if (!email || !password) {
          setError('Please enter email and password')
          return
        }
        await signIn(email, password)
        router.replace('/(tabs)')
      } else {
        if (!email || !password) {
          setError('Please enter email and password')
          return
        }
        await signUp(email, password, fullName)
        router.replace('/(tabs)')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <ActivityIndicator size="large" color="#6366F1" />
      </LinearGradient>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}
      >
        <View style={styles.content}>
          {/* Logo/Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="bulb" size={60} color="#6366F1" />
            </View>
            <Text style={styles.title}>Remembra</Text>
            <Text style={styles.subtitle}>
              Master anything with 1-4-7 spaced repetition
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Full Name Input (Signup only) */}
            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name (optional)"
                  placeholderTextColor="#64748b"
                  value={fullName}
                  onChangeText={setFullName}
                  autoComplete="name"
                />
              </View>
            )}

            {/* Password Input (not for magic link) */}
            {mode !== 'magic' && (
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#64748b"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>
                    {mode === 'magic' ? 'Send Magic Link' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            {/* Mode Switchers */}
            <View style={styles.switchContainer}>
              {mode === 'signin' ? (
                <>
                  <TouchableOpacity onPress={() => setMode('signup')}>
                    <Text style={styles.switchText}>
                      Don't have an account? <Text style={styles.switchTextBold}>Sign Up</Text>
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMode('magic')}>
                    <Text style={styles.switchText}>
                      <Text style={styles.switchTextBold}>Use Magic Link</Text>
                    </Text>
                  </TouchableOpacity>
                </>
              ) : mode === 'signup' ? (
                <>
                  <TouchableOpacity onPress={() => setMode('signin')}>
                    <Text style={styles.switchText}>
                      Already have an account? <Text style={styles.switchTextBold}>Sign In</Text>
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMode('magic')}>
                    <Text style={styles.switchText}>
                      <Text style={styles.switchTextBold}>Use Magic Link</Text>
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity onPress={() => setMode('signin')}>
                  <Text style={styles.switchText}>
                    <Text style={styles.switchTextBold}>Back to Sign In</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Features */}
          <View style={styles.features}>
            <FeatureItem icon="flash" text="1-4-7 Spaced Repetition" />
            <FeatureItem icon="sparkles" text="AI-Powered Learning" />
            <FeatureItem icon="trending-up" text="Track Your Progress" />
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  )
}

function FeatureItem({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={16} color="#6366F1" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    marginLeft: 8,
    flex: 1,
  },
  button: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  switchContainer: {
    alignItems: 'center',
    gap: 12,
  },
  switchText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  switchTextBold: {
    color: '#6366F1',
    fontWeight: '600',
  },
  features: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    color: '#cbd5e1',
    fontSize: 14,
  },
})
