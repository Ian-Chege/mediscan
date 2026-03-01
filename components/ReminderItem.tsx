import { useMemo } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Colors } from '@/constants/Colors';
import { useTheme, AppColors } from '@/hooks/useTheme';
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          trackColor={{ false: colors.border, true: Colors.secondary }}
          thumbColor="#FFFFFF"
        />
        <Pressable onPress={onDelete} hitSlop={8}>
          <FontAwesome name="trash-o" size={18} color={Colors.danger} />
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.textSecondary,
      marginTop: 2,
    },
    medSection: {
      flex: 1,
    },
    medName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    medDosage: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
  });
}
