import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme, AppColors } from '@/hooks/useTheme';
import type { AppShadows } from '@/constants/Colors';

interface MedicationCardProps {
  name: string;
  dosage: string;
  frequency: string;
  purpose?: string;
  instructions?: string;
  isActive?: boolean;
  confidence?: string;
  onPress?: () => void;
  onToggleActive?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export function MedicationCard({
  name,
  dosage,
  frequency,
  purpose,
  instructions,
  isActive = true,
  confidence,
  onPress,
  onToggleActive,
  onDelete,
  showActions = false,
}: MedicationCardProps) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        !isActive && styles.cardInactive,
        pressed && onPress && styles.cardPressed,
      ]}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'none'}
      accessibilityLabel={`${name}, ${dosage}, ${frequency}`}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, !isActive && styles.accentBarInactive]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, !isActive && styles.nameInactive]}>{name}</Text>
            {confidence && (
              <View
                style={[
                  styles.badge,
                  confidence === 'high'
                    ? styles.badgeHigh
                    : confidence === 'medium'
                      ? styles.badgeMedium
                      : styles.badgeLow,
                ]}
              >
                <Text style={[
                  styles.badgeText,
                  confidence === 'high'
                    ? styles.badgeTextHigh
                    : confidence === 'medium'
                      ? styles.badgeTextMedium
                      : styles.badgeTextLow,
                ]}>{confidence}</Text>
              </View>
            )}
          </View>
          {!isActive && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Paused</Text>
            </View>
          )}
        </View>

        <View style={styles.details}>
          <View style={styles.detailChip}>
            <FontAwesome name="medkit" size={11} color={colors.primary} />
            <Text style={styles.detailText}>{dosage}</Text>
          </View>
          <View style={styles.detailChip}>
            <FontAwesome name="clock-o" size={11} color={colors.primary} />
            <Text style={styles.detailText}>{frequency}</Text>
          </View>
          {!isActive && (
            <View style={[styles.detailChip, { backgroundColor: colors.warningSoft }]}>
              <FontAwesome name="pause" size={9} color={colors.warning} />
              <Text style={[styles.detailText, { color: colors.warning }]}>Paused</Text>
            </View>
          )}
        </View>

        {purpose && (
          <Text style={styles.purpose}>{purpose}</Text>
        )}

        {instructions && (
          <View style={styles.instructionsRow}>
            <FontAwesome name="info-circle" size={12} color={colors.warning} />
            <Text style={styles.instructions}>{instructions}</Text>
          </View>
        )}

        {showActions && (
          <View style={styles.actions}>
            {onToggleActive && (
              <Pressable
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
                onPress={onToggleActive}
                accessibilityRole="button"
                accessibilityLabel={isActive ? `Pause ${name}` : `Resume ${name}`}
              >
                <FontAwesome
                  name={isActive ? 'pause-circle' : 'play-circle'}
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.actionText}>
                  {isActive ? 'Pause' : 'Resume'}
                </Text>
              </Pressable>
            )}
            {onDelete && (
              <Pressable
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
                onPress={onDelete}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${name}`}
              >
                <FontAwesome name="trash-o" size={16} color={colors.danger} />
                <Text style={[styles.actionText, { color: colors.danger }]}>
                  Delete
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

function createStyles(colors: AppColors, shadows: AppShadows) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 16,
      marginBottom: 12,
      overflow: 'hidden',
      ...shadows.sm,
    },
    cardInactive: {
      opacity: 0.7,
    },
    cardPressed: {
      backgroundColor: colors.surfaceHover,
    },
    accentBar: {
      width: 4,
      backgroundColor: colors.primary,
    },
    accentBarInactive: {
      backgroundColor: colors.textTertiary,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    name: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.3,
    },
    nameInactive: {
      color: colors.textSecondary,
    },
    inactiveBadge: {
      backgroundColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    inactiveBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    badgeHigh: {
      backgroundColor: colors.secondarySoft,
    },
    badgeMedium: {
      backgroundColor: colors.warningSoft,
    },
    badgeLow: {
      backgroundColor: colors.dangerSoft,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    badgeTextHigh: {
      color: colors.badgeHighText,
    },
    badgeTextMedium: {
      color: colors.badgeMediumText,
    },
    badgeTextLow: {
      color: colors.badgeLowText,
    },
    details: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 4,
    },
    detailChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.background,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    detailText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    purpose: {
      marginTop: 8,
      fontSize: 13,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    instructionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      backgroundColor: colors.warningSoft,
      padding: 10,
      borderRadius: 10,
    },
    instructions: {
      fontSize: 13,
      color: colors.text,
      flex: 1,
      lineHeight: 18,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 16,
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    actionButtonPressed: {
      opacity: 0.6,
    },
    actionText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
    },
  });
}
