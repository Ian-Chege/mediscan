import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors, createShadows } from '@/constants/Colors';
import type { AppShadows } from '@/constants/Colors';

export type AppColors = typeof LightColors;

const THEME_KEY = 'mediscan_theme_override';

interface ThemeContextValue {
  colors: AppColors;
  shadows: AppShadows;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: LightColors,
  shadows: createShadows(false),
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<'light' | 'dark' | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((value) => {
      if (value === 'light' || value === 'dark') {
        setOverride(value);
      }
      setLoaded(true);
    });
  }, []);

  const isDark = override !== null ? override === 'dark' : systemScheme === 'dark';
  const colors = isDark ? DarkColors : LightColors;
  const shadows = useMemo(() => createShadows(isDark), [isDark]);

  const toggleTheme = useCallback(() => {
    const next = isDark ? 'light' : 'dark';
    setOverride(next);
    AsyncStorage.setItem(THEME_KEY, next);
  }, [isDark]);

  if (!loaded) return null;

  return React.createElement(
    ThemeContext.Provider,
    { value: { colors, isDark, shadows, toggleTheme } },
    children,
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
