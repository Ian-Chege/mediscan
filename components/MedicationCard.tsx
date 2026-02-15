import { Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/Colors';

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

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.text,
  },
  inactiveBadge: {
    fontSize: 12,
    color: Colors.textSecondary,
    backgroundColor: Colors.border,
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
    backgroundColor: '#DCFCE7',
  },
  confidenceMedium: {
    backgroundColor: '#FEF3C7',
  },
  confidenceLow: {
    backgroundColor: '#FEE2E2',
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
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
    color: Colors.textSecondary,
  },
  purpose: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.text,
    fontStyle: 'italic',
  },
  instructionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 6,
  },
  instructions: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
