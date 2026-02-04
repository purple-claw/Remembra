// Remembra Theme - Pure black with glassmorphism and red/orange accents

const tintColorDark = '#FF6B35';
const tintColorLight = '#FF4444';

export const Colors = {
  light: {
    text: '#18181B',
    textSecondary: '#71717A',
    textMuted: '#A1A1AA',
    background: '#FAFAFA',
    backgroundSecondary: '#F4F4F5',
    card: '#FFFFFF',
    tint: tintColorLight,
    accent: '#FF4444',
    accentSecondary: '#FF6B35',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    tabIconDefault: '#71717A',
    tabIconSelected: tintColorLight,
    border: '#E4E4E7',
  },
  dark: {
    // Pure black backgrounds
    text: '#FFFFFF',
    textSecondary: '#A1A1AA',
    textMuted: '#52525B',
    background: '#000000',
    backgroundSecondary: '#0A0A0A',
    backgroundTertiary: '#111111',

    // Glassmorphism cards
    card: 'rgba(255, 255, 255, 0.05)',
    cardElevated: 'rgba(255, 255, 255, 0.08)',
    cardGlass: 'rgba(255, 255, 255, 0.03)',
    surface: 'rgba(255, 255, 255, 0.06)',

    // Glass border
    glassBorder: 'rgba(255, 255, 255, 0.1)',
    glassHighlight: 'rgba(255, 255, 255, 0.15)',

    tint: tintColorDark,
    accent: '#FF4444',
    accentSecondary: '#FF6B35',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    tabIconDefault: '#52525B',
    tabIconSelected: tintColorDark,
    border: 'rgba(255, 255, 255, 0.08)',
    borderSubtle: 'rgba(255, 255, 255, 0.05)',
  },
  // Gradient colors for buttons and cards
  gradient: {
    primary: ['#FF4444', '#FF6B35'],
    accent: ['#6366F1', '#8B5CF6', '#EC4899'],
    glass: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'],
  },
};

// Spacing scale
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

// Border radius - more rounded
export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  '2xl': 28,
  full: 9999,
};

// Typography
export const Typography = {
  fontFamily: 'Inter',
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
};

// Glassmorphism styles helper
export const GlassStyles = {
  card: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
  },
  cardElevated: {
    backgroundColor: Colors.dark.cardElevated,
    borderWidth: 1,
    borderColor: Colors.dark.glassHighlight,
  },
};

// For backward compatibility
export default {
  light: Colors.light,
  dark: Colors.dark,
};
