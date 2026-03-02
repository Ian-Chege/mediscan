import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme, AppColors } from '@/hooks/useTheme';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={message}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: 20,
    },
    card: {
      alignItems: 'center',
      backgroundColor: colors.card,
      paddingHorizontal: 40,
      paddingVertical: 32,
      borderRadius: 20,
      gap: 16,
    },
    message: {
      fontSize: 15,
      color: colors.textSecondary,
      fontWeight: '500',
      letterSpacing: -0.2,
    },
  });
}
