// Theme configuration for Remembra
import type { Theme, ThemeColors } from '@/types'

const darkColors: ThemeColors = {
  primary: '#6366F1',     // Indigo
  secondary: '#8B5CF6',   // Purple
  accent: '#EC4899',      // Pink
  background: '#0F172A',  // Slate 900
  surface: '#1E293B',     // Slate 800
  surfaceVariant: '#334155', // Slate 700
  text: '#F1F5F9',        // Slate 100
  textSecondary: '#94A3B8', // Slate 400
  error: '#EF4444',       // Red
  success: '#10B981',     // Green
  warning: '#F59E0B',     // Amber
  border: '#475569',      // Slate 600
}

const lightColors: ThemeColors = {
  primary: '#6366F1',
  secondary: '#8B5CF6',
  accent: '#EC4899',
  background: '#FFFFFF',
  surface: '#F8FAFC',     // Slate 50
  surfaceVariant: '#F1F5F9', // Slate 100
  text: '#0F172A',        // Slate 900
  textSecondary: '#64748B', // Slate 500
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  border: '#E2E8F0',      // Slate 200
}

const spacing = (multiplier: number) => multiplier * 8

const borderRadius = {
  small: 8,
  medium: 12,
  large: 16,
  full: 9999,
}

const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
  },
}

export const darkTheme: Theme = {
  colors: darkColors,
  spacing,
  borderRadius,
  typography,
}

export const lightTheme: Theme = {
  colors: lightColors,
  spacing,
  borderRadius,
  typography,
}

// Default export dark theme
export default darkTheme
