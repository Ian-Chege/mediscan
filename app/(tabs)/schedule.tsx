import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { EmptyState } from '@/components/EmptyState';
import { useTheme, AppColors } from '@/hooks/useTheme';
import type { AppShadows } from '@/constants/Colors';
import { useUser } from '@/contexts/UserContext';

let useMutation: any, useQuery: any, api: any;
try {
  const convexReact = require('convex/react');
  useMutation = convexReact.useMutation;
  useQuery = convexReact.useQuery;
  api = require('@/convex/_generated/api').api;
} catch {
  // Convex not yet set up
}

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDateString(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(dateStr: string) {
  const today = getTodayString();
  const tomorrow = getDateString(1);
  const yesterday = getDateString(-1);
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  if (dateStr === yesterday) return 'Yesterday';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime12h(time24: string) {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${suffix}`;
}

export default function ScheduleScreen() {
  const userId = useUser();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [selectedDate, setSelectedDate] = useState(getTodayString());

  const schedule = api && useQuery
    ? useQuery(api.schedule.getDailySchedule, userId ? { userId: userId as any, date: selectedDate } : "skip")
    : undefined;
  const markTaken = api && useMutation ? useMutation(api.schedule.markTaken) : null;

  const handleToggleTaken = useCallback(
    async (item: any) => {
      if (!userId || !markTaken) return;
      await markTaken({
        userId: userId as any,
        medicationId: item.medicationId,
        reminderId: item.reminderId,
        date: selectedDate,
        time: item.time,
        taken: !item.taken,
      });
    },
    [userId, markTaken, selectedDate],
  );

  // Date navigation: show 7 days centered on today
  const dateOptions = useMemo(() => {
    const dates = [];
    for (let i = -2; i <= 4; i++) {
      const dateStr = getDateString(i);
      const d = new Date(dateStr + 'T12:00:00');
      dates.push({
        date: dateStr,
        dayName: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
      });
    }
    return dates;
  }, []);

  // Count taken vs total
  const takenCount = (schedule ?? []).filter((s: any) => s.taken).length;
  const totalCount = (schedule ?? []).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule</Text>
        <Text style={styles.headerSubtitle}>{formatDateLabel(selectedDate)}</Text>
      </View>

      {/* Date selector */}
      <View style={styles.dateRow}>
        {dateOptions.map((opt) => {
          const isSelected = opt.date === selectedDate;
          return (
            <Pressable
              key={opt.date}
              style={[styles.dateChip, isSelected && styles.dateChipActive]}
              onPress={() => setSelectedDate(opt.date)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.dateChipDay, isSelected && styles.dateChipDayActive]}>
                {opt.dayName}
              </Text>
              <Text style={[styles.dateChipNum, isSelected && styles.dateChipNumActive]}>
                {opt.dayNum}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Progress bar */}
      {totalCount > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(takenCount / totalCount) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {takenCount} of {totalCount} doses taken
          </Text>
        </View>
      )}

      {/* Schedule list */}
      {!schedule || schedule.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No medications scheduled"
          message="Set up reminders in the Reminders tab to see your daily schedule here"
        />
      ) : (
        <FlatList
          data={schedule}
          keyExtractor={(item: any) => `${item.reminderId}-${item.time}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }: any) => (
            <Pressable
              style={[styles.scheduleCard, item.taken && styles.scheduleCardTaken]}
              onPress={() => handleToggleTaken(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.medicationName} at ${formatTime12h(item.time)}, ${item.taken ? 'taken' : 'not taken'}`}
            >
              <View style={[styles.checkbox, item.taken && styles.checkboxChecked]}>
                {item.taken && (
                  <FontAwesome name="check" size={12} color={colors.textInverse} />
                )}
              </View>
              <View style={styles.scheduleInfo}>
                <Text style={[styles.scheduleTime, item.taken && styles.scheduleTaken]}>
                  {formatTime12h(item.time)}
                </Text>
                <Text style={[styles.scheduleMedName, item.taken && styles.scheduleTaken]}>
                  {item.medicationName}
                </Text>
                {item.medicationDosage ? (
                  <Text style={styles.scheduleDosage}>{item.medicationDosage}</Text>
                ) : null}
              </View>
              {item.taken && (
                <View style={styles.takenBadge}>
                  <Text style={styles.takenBadgeText}>Taken</Text>
                </View>
              )}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors, shadows: AppShadows) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 4,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.8,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
      marginTop: 2,
    },
    dateRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 6,
    },
    dateChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: colors.card,
      ...shadows.sm,
    },
    dateChipActive: {
      backgroundColor: colors.primary,
    },
    dateChipDay: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
      marginBottom: 2,
    },
    dateChipDayActive: {
      color: colors.textInverse,
      opacity: 0.85,
    },
    dateChipNum: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    dateChipNumActive: {
      color: colors.textInverse,
    },
    progressSection: {
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    progressBar: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.surfaceHover,
      overflow: 'hidden',
      marginBottom: 6,
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: colors.secondary,
    },
    progressText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    list: {
      padding: 20,
      paddingTop: 8,
      paddingBottom: 100,
    },
    scheduleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      gap: 14,
      ...shadows.sm,
    },
    scheduleCardTaken: {
      opacity: 0.7,
    },
    checkbox: {
      width: 28,
      height: 28,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.secondary,
      borderColor: colors.secondary,
    },
    scheduleInfo: {
      flex: 1,
    },
    scheduleTime: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 2,
    },
    scheduleMedName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.3,
    },
    scheduleDosage: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    scheduleTaken: {
      textDecorationLine: 'line-through',
      color: colors.textTertiary,
    },
    takenBadge: {
      backgroundColor: colors.secondarySoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    takenBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.secondary,
    },
  });
}
