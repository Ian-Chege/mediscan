import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors, Shadows } from '@/constants/Colors';
import { parseTime, formatTime } from '@/lib/utils';

interface ReminderItemProps {
  medicationName: string;
  medicationDosage: string;
  time: string;
  days: string[];
  isActive: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

export function ReminderItem({
  medicationName,
  medicationDosage,
  time,
  days,
  isActive,
  onToggle,
  onDelete,
}: ReminderItemProps) {
  const { hour, minute } = parseTime(time);
  const displayTime = formatTime(hour, minute);
  const displayDays =
    days.includes('daily') ? 'Every day' : days.join(', ');

  return (
    <View
      style={[styles.container, !isActive && styles.containerInactive]}
      accessibilityLabel={`Reminder for ${medicationName}, ${displayTime}, ${displayDays}`}
    >
      <View style={styles.timeBlock}>
        <Text style={[styles.time, !isActive && styles.timeInactive]}>{displayTime}</Text>
        <Text style={styles.days}>{displayDays}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.medSection}>
        <Text style={[styles.medName, !isActive && styles.medNameInactive]}>{medicationName}</Text>
        {medicationDosage ? (
          <Text style={styles.medDosage}>{medicationDosage}</Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Switch
          value={isActive}
          onValueChange={onToggle}
          trackColor={{ false: Colors.border, true: Colors.primaryLight }}
          thumbColor={Colors.surface}
          accessibilityRole="switch"
          accessibilityLabel={`${isActive ? 'Disable' : 'Enable'} reminder for ${medicationName}`}
        />
        <Pressable
          onPress={onDelete}
          hitSlop={12}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Delete reminder for ${medicationName}`}
        >
          <FontAwesome name="trash-o" size={16} color={Colors.danger} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Shadows.sm,
  },
  containerInactive: {
    opacity: 0.55,
  },
  timeBlock: {
    minWidth: 76,
  },
  time: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  timeInactive: {
    color: Colors.textTertiary,
  },
  days: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
    marginHorizontal: 14,
  },
  medSection: {
    flex: 1,
  },
  medName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  medNameInactive: {
    color: Colors.textTertiary,
  },
  medDosage: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonPressed: {
    opacity: 0.5,
  },
});
