export const Colors = {
  primary: '#4A90D9',
  primaryDark: '#2E5C8A',
  secondary: '#6BCB77',
  warning: '#FFB347',
  danger: '#FF6B6B',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};

// Keep the theme-based export for compatibility with Expo template components
export default {
  light: {
    text: Colors.text,
    background: Colors.background,
    tint: Colors.primary,
    tabIconDefault: Colors.textSecondary,
    tabIconSelected: Colors.primary,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#4A90D9',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#4A90D9',
  },
};
