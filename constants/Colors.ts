export const LightColors = {
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

  // Badge text (MedicationCard confidence)
  badgeHighText: '#065F46',
  badgeMediumText: '#92400E',
  badgeLowText: '#991B1B',

  // Interaction warning
  interactionHighBg: '#FEF2F2',
  interactionModerateBg: '#FFFBEB',
  interactionHighText: '#991B1B',
  interactionModerateText: '#92400E',
  interactionHighIconBg: '#FECACA',
  interactionModerateIconBg: '#FDE68A',
  interactionBorder: 'rgba(0,0,0,0.05)',
  interactionDescText: '#4B5563',

  // Severity (used in getSeverityColor)
  severityHigh: '#FF6B6B',
  severityModerate: '#FFB347',
  severityLow: '#6BCB77',
  severityDefault: '#6B7280',
};

export const DarkColors: typeof LightColors = {
  // Primary — bumped teal for dark bg contrast
  primary: '#14B8A6',
  primaryDark: '#0D9488',
  primaryLight: '#2DD4BF',
  primarySoft: '#042F2E',

  // Accent — brighter indigo
  accent: '#818CF8',
  accentSoft: '#1E1B4B',

  // Semantic
  secondary: '#34D399',
  secondarySoft: '#064E3B',
  warning: '#FBBF24',
  warningSoft: '#451A03',
  danger: '#F87171',
  dangerSoft: '#450A0A',

  // Surfaces — warm stone tones
  background: '#1C1917',
  surface: '#292524',
  surfaceHover: '#44403C',
  card: '#292524',

  // Text
  text: '#F5F5F4',
  textSecondary: '#A8A29E',
  textTertiary: '#78716C',
  textInverse: '#1C1917',

  // Borders & dividers
  border: '#44403C',
  borderLight: '#292524',
  divider: '#57534E',

  // Badge text
  badgeHighText: '#6EE7B7',
  badgeMediumText: '#FCD34D',
  badgeLowText: '#FCA5A5',

  // Interaction warning
  interactionHighBg: '#450A0A',
  interactionModerateBg: '#451A03',
  interactionHighText: '#FCA5A5',
  interactionModerateText: '#FCD34D',
  interactionHighIconBg: '#7F1D1D',
  interactionModerateIconBg: '#78350F',
  interactionBorder: 'rgba(255,255,255,0.06)',
  interactionDescText: '#D1D5DB',

  // Severity
  severityHigh: '#F87171',
  severityModerate: '#FBBF24',
  severityLow: '#4ADE80',
  severityDefault: '#9CA3AF',
};

export function createShadows(isDark: boolean) {
  return {
    sm: {
      shadowColor: '#000000' as string,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.15 : 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000' as string,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000000' as string,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.35 : 0.1,
      shadowRadius: 16,
      elevation: 6,
    },
  };
}

export type AppShadows = ReturnType<typeof createShadows>;

// Keep the theme-based export for compatibility with Expo template components
export default {
  light: {
    text: LightColors.text,
    background: LightColors.background,
    tint: LightColors.primary,
    tabIconDefault: LightColors.textTertiary,
    tabIconSelected: LightColors.primary,
  },
  dark: {
    text: DarkColors.text,
    background: DarkColors.background,
    tint: DarkColors.primary,
    tabIconDefault: DarkColors.textTertiary,
    tabIconSelected: DarkColors.primary,
  },
};
