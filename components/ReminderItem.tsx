import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/Colors';
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
    <View style={[styles.container, !isActive && styles.containerInactive]}>
      <View style={styles.timeSection}>
        <Text style={styles.time}>{displayTime}</Text>
        <Text style={styles.days}>{displayDays}</Text>
      </View>

      <View style={styles.medSection}>
        <Text style={styles.medName}>{medicationName}</Text>
        <Text style={styles.medDosage}>{medicationDosage}</Text>
      </View>

      <View style={styles.actions}>
        <Switch
          value={isActive}
          onValueChange={onToggle}
          trackColor={{ false: Colors.border, true: Colors.secondary }}
          thumbColor="#FFFFFF"
        />
        <Pressable onPress={onDelete} hitSlop={8}>
          <FontAwesome name="trash-o" size={18} color={Colors.danger} />
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  containerInactive: {
    opacity: 0.5,
  },
  timeSection: {
    marginRight: 16,
    minWidth: 80,
  },
  time: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  days: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  medSection: {
    flex: 1,
  },
  medName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  medDosage: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
