import { Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors, Shadows } from '@/constants/Colors';

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
            <FontAwesome name="medkit" size={11} color={Colors.primary} />
            <Text style={styles.detailText}>{dosage}</Text>
          </View>
          <View style={styles.detailChip}>
            <FontAwesome name="clock-o" size={11} color={Colors.primary} />
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
              <Pressable
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
                onPress={onToggleActive}
                accessibilityRole="button"
                accessibilityLabel={isActive ? `Pause ${name}` : `Resume ${name}`}
              >
                <FontAwesome
                  name={isActive ? 'pause-circle' : 'play-circle'}
                  size={16}
                  color={Colors.primary}
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
                <FontAwesome name="trash-o" size={16} color={Colors.danger} />
                <Text style={[styles.actionText, { color: Colors.danger }]}>
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

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardInactive: {
    opacity: 0.7,
  },
  cardPressed: {
    backgroundColor: Colors.surfaceHover,
  },
  accentBar: {
    width: 4,
    backgroundColor: Colors.primary,
  },
  accentBarInactive: {
    backgroundColor: Colors.textTertiary,
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
    color: Colors.text,
    letterSpacing: -0.3,
  },
  nameInactive: {
    color: Colors.textSecondary,
  },
  inactiveBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inactiveBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeHigh: {
    backgroundColor: Colors.secondarySoft,
  },
  badgeMedium: {
    backgroundColor: Colors.warningSoft,
  },
  badgeLow: {
    backgroundColor: Colors.dangerSoft,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  badgeTextHigh: {
    color: '#065F46',
  },
  badgeTextMedium: {
    color: '#92400E',
  },
  badgeTextLow: {
    color: '#991B1B',
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
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  purpose: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  instructionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: Colors.warningSoft,
    padding: 10,
    borderRadius: 10,
  },
  instructions: {
    fontSize: 13,
    color: Colors.text,
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
    borderTopColor: Colors.borderLight,
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
    color: Colors.primary,
    fontWeight: '600',
  },
});
