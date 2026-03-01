// Semantic colors — unchanged between themes
export const Colors = {
  primary: '#4A90D9',
  primaryDark: '#2E5C8A',
  secondary: '#6BCB77',
  warning: '#FFB347',
  danger: '#FF6B6B',
};

export const LightColors = {
  ...Colors,
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};

export const DarkColors = {
  ...Colors,
  background: '#0F172A',
  card: '#1E293B',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  border: '#334155',
};

// Keep the theme-based export for compatibility with Expo template components
export default {
  light: {
    text: LightColors.text,
    background: LightColors.background,
    tint: Colors.primary,
    tabIconDefault: LightColors.textSecondary,
    tabIconSelected: Colors.primary,
  },
  dark: {
    text: DarkColors.text,
    background: DarkColors.background,
    tint: Colors.primary,
    tabIconDefault: DarkColors.textSecondary,
    tabIconSelected: Colors.primary,
  },
};
