import { ViewStyle } from 'react-native';

export const Colors = {
  // Primary — warm teal, trustworthy but not clinical
  primary: '#0D9488',
  primaryDark: '#0F766E',
  primaryLight: '#14B8A6',
  primarySoft: '#CCFBF1',

  // Accent — indigo for special moments
  accent: '#6366F1',
  accentSoft: '#EEF2FF',

  // Semantic
  secondary: '#10B981',
  secondarySoft: '#D1FAE5',
  warning: '#F59E0B',
  warningSoft: '#FEF3C7',
  danger: '#EF4444',
  dangerSoft: '#FEE2E2',

  // Surfaces — warm undertones
  background: '#FAFAF9',
  surface: '#FFFFFF',
  surfaceHover: '#F5F5F4',
  card: '#FFFFFF',

  // Text
  text: '#1C1917',
  textSecondary: '#78716C',
  textTertiary: '#A8A29E',
  textInverse: '#FFFFFF',

  // Borders & dividers
  border: '#E7E5E4',
  borderLight: '#F5F5F4',
  divider: '#D6D3D1',
};

// Reusable shadow presets
export const Shadows = {
  sm: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,
  md: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  } as ViewStyle,
  lg: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  } as ViewStyle,
};

// Keep the theme-based export for compatibility with Expo template components
export default {
  light: {
    text: Colors.text,
    background: Colors.background,
    tint: Colors.primary,
    tabIconDefault: Colors.textTertiary,
    tabIconSelected: Colors.primary,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#14B8A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#14B8A6',
  },
};
