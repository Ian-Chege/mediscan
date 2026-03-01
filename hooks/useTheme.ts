import React, { createContext, useCallback, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { LightColors, DarkColors } from '@/constants/Colors';

export type AppColors = typeof LightColors;

interface ThemeContextValue {
  colors: AppColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: LightColors,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<'light' | 'dark' | null>(null);

  const isDark = override !== null ? override === 'dark' : systemScheme === 'dark';
  const colors = isDark ? DarkColors : LightColors;

  const toggleTheme = useCallback(() => {
    setOverride(isDark ? 'light' : 'dark');
  }, [isDark]);

  return React.createElement(
    ThemeContext.Provider,
    { value: { colors, isDark, toggleTheme } },
    children,
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
