import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/Colors';
import { useTheme, AppColors } from '@/hooks/useTheme';

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
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  return (
    <Pressable
      style={[styles.card, !isActive && styles.cardInactive]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{name}</Text>
          {confidence && (
            <View
              style={[
                styles.confidenceBadge,
                confidence === 'high'
                  ? styles.confidenceHigh
                  : confidence === 'medium'
                    ? styles.confidenceMedium
                    : styles.confidenceLow,
              ]}
            >
              <Text style={styles.confidenceText}>{confidence}</Text>
            </View>
          )}
        </View>
        {!isActive && <Text style={styles.inactiveBadge}>Inactive</Text>}
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <FontAwesome name="medkit" size={14} color={Colors.primary} />
          <Text style={styles.detailText}>{dosage}</Text>
        </View>
        <View style={styles.detailRow}>
          <FontAwesome name="clock-o" size={14} color={Colors.primary} />
          <Text style={styles.detailText}>{frequency}</Text>
        </View>
      </View>

      {purpose && (
        <Text style={styles.purpose}>{purpose}</Text>
      )}

      {instructions && (
        <View style={styles.instructionsRow}>
          <FontAwesome name="info-circle" size={12} color={Colors.warning} />
          <Text style={styles.instructions}>{instructions}</Text>
        </View>
      )}

      {showActions && (
        <View style={styles.actions}>
          {onToggleActive && (
            <Pressable style={styles.actionButton} onPress={onToggleActive}>
              <FontAwesome
                name={isActive ? 'pause-circle' : 'play-circle'}
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.actionText}>
                {isActive ? 'Pause' : 'Resume'}
              </Text>
            </Pressable>
          )}
          {onDelete && (
            <Pressable style={styles.actionButton} onPress={onDelete}>
              <FontAwesome name="trash" size={20} color={Colors.danger} />
              <Text style={[styles.actionText, { color: Colors.danger }]}>
                Delete
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardInactive: {
      opacity: 0.6,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    name: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    inactiveBadge: {
      fontSize: 12,
      color: colors.textSecondary,
      backgroundColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    confidenceBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    confidenceHigh: {
      backgroundColor: isDark ? '#14532D' : '#DCFCE7',
    },
    confidenceMedium: {
      backgroundColor: isDark ? '#451A03' : '#FEF3C7',
    },
    confidenceLow: {
      backgroundColor: isDark ? '#450A0A' : '#FEE2E2',
    },
    confidenceText: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'capitalize',
      color: colors.text,
    },
    details: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 4,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    detailText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    purpose: {
      marginTop: 8,
      fontSize: 14,
      color: colors.text,
      fontStyle: 'italic',
    },
    instructionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      backgroundColor: isDark ? '#451A03' : '#FEF3C7',
      padding: 8,
      borderRadius: 6,
    },
    instructions: {
      fontSize: 13,
      color: colors.text,
      flex: 1,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 16,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionText: {
      fontSize: 14,
      color: Colors.primary,
      fontWeight: '500',
    },
  });
}
