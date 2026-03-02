import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme, AppColors } from '@/hooks/useTheme';
import type { AppShadows } from '@/constants/Colors';

interface EmptyStateProps {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <FontAwesome name={icon} size={32} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <FontAwesome name="plus" size={14} color={colors.textInverse} />
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function createStyles(colors: AppColors, shadows: AppShadows) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    iconWrapper: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    message: {
      marginTop: 8,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 260,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 24,
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 12,
      ...shadows.md,
    },
    actionButtonPressed: {
      backgroundColor: colors.primaryDark,
      transform: [{ scale: 0.97 }],
    },
    actionButtonText: {
      color: colors.textInverse,
      fontSize: 15,
      fontWeight: '600',
    },
  });
}
