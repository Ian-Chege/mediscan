import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ReminderItem } from '@/components/ReminderItem';
import { EmptyState } from '@/components/EmptyState';
import { useTheme, AppColors } from '@/hooks/useTheme';
import type { AppShadows } from '@/constants/Colors';
import { useUser } from '@/contexts/UserContext';
import { scheduleMedicationReminder, cancelReminder } from '@/lib/notifications';
import { parseTime } from '@/lib/utils';

// Convex hooks — imported conditionally once Convex is configured
let useMutation: any, useQuery: any, api: any;
try {
  const convexReact = require('convex/react');
  useMutation = convexReact.useMutation;
  useQuery = convexReact.useQuery;
  api = require('@/convex/_generated/api').api;
} catch {
  // Convex not yet set up
}

const DAYS_OPTIONS = [
  { label: 'Every day', value: 'daily' },
  { label: 'Mon', value: 'monday' },
  { label: 'Tue', value: 'tuesday' },
  { label: 'Wed', value: 'wednesday' },
  { label: 'Thu', value: 'thursday' },
  { label: 'Fri', value: 'friday' },
  { label: 'Sat', value: 'saturday' },
  { label: 'Sun', value: 'sunday' },
];

export default function RemindersScreen() {
  const userId = useUser();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState('08:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(['daily']);
  const [selectedMedId, setSelectedMedId] = useState<string | null>(null);

  const reminders = api && useQuery
    ? useQuery(api.reminders.list, userId ? { userId: userId as any } : "skip")
    : undefined;
  const medications = api && useQuery
    ? useQuery(api.medications.listActive, userId ? { userId: userId as any } : "skip")
    : undefined;
  const addReminder = api && useMutation ? useMutation(api.reminders.add) : null;
  const toggleReminder = api && useMutation ? useMutation(api.reminders.toggleActive) : null;
  const removeReminder = api && useMutation ? useMutation(api.reminders.remove) : null;

  const handleToggle = useCallback(
    async (id: any, isActive: boolean, notificationId?: string) => {
      if (isActive && notificationId) {
        await cancelReminder(notificationId);
      }
      await toggleReminder?.({ id });
    },
    [toggleReminder],
  );

  const handleDelete = useCallback(
    (id: any, name: string, notificationId?: string) => {
      Alert.alert('Delete Reminder', `Remove reminder for ${name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (notificationId) {
              await cancelReminder(notificationId);
            }
            await removeReminder?.({ id });
          },
        },
      ]);
    },
    [removeReminder],
  );

  const handleAdd = useCallback(async () => {
    if (!selectedMedId) {
      Alert.alert(
        'Select Medication',
        'Please choose a medication for this reminder.',
      );
      return;
    }
    if (!userId || !addReminder) {
      Alert.alert('Setup Required', 'Connect Convex to save reminders.');
      return;
    }

    try {
      const med = (medications ?? []).find((m: any) => m._id === selectedMedId);
      const { hour, minute } = parseTime(selectedTime);

      const notificationId = await scheduleMedicationReminder(
        med?.name ?? 'Medication',
        med?.dosage ?? '',
        hour,
        minute,
      );

      await addReminder({
        userId: userId as any,
        medicationId: selectedMedId as any,
        time: selectedTime,
        days: selectedDays,
        notificationId,
      });

      setShowAddModal(false);
      setSelectedTime('08:00');
      setSelectedDays(['daily']);
      setSelectedMedId(null);
    } catch {
      Alert.alert('Error', 'Failed to create reminder.');
    }
  }, [userId, selectedMedId, selectedTime, selectedDays, medications, addReminder]);

  const toggleDay = (day: string) => {
    if (day === 'daily') {
      setSelectedDays(['daily']);
      return;
    }
    setSelectedDays((prev) => {
      const filtered = prev.filter((d) => d !== 'daily');
      if (filtered.includes(day)) {
        return filtered.filter((d) => d !== day);
      }
      return [...filtered, day];
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reminders</Text>
      </View>

      {!reminders || reminders.length === 0 ? (
        <EmptyState
          icon="bell-o"
          title="No reminders set"
          message="Never miss a dose — set reminders for your medications"
          actionLabel="Add Reminder"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: any) => (
            <ReminderItem
              medicationName={item.medicationName}
              medicationDosage={item.medicationDosage}
              time={item.time}
              days={item.days}
              isActive={item.isActive}
              onToggle={() =>
                handleToggle(item._id, item.isActive, item.notificationId)
              }
              onDelete={() =>
                handleDelete(
                  item._id,
                  item.medicationName,
                  item.notificationId,
                )
              }
            />
          )}
        />
      )}

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => setShowAddModal(true)}
        accessibilityRole="button"
        accessibilityLabel="Add reminder"
      >
        <FontAwesome name="plus" size={22} color={colors.textInverse} />
      </Pressable>

      {/* Add Reminder Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Reminder</Text>
            <Pressable
              onPress={() => setShowAddModal(false)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <FontAwesome name="times" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
            {/* Medication selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Medication</Text>
              {!medications || medications.length === 0 ? (
                <View style={styles.noMedsCard}>
                  <FontAwesome name="info-circle" size={14} color={colors.textTertiary} />
                  <Text style={styles.noMedsText}>
                    No active medications. Add one in the My Meds tab first.
                  </Text>
                </View>
              ) : (
                <View style={styles.medOptions}>
                  {medications.map((med: any) => {
                    const isSelected = selectedMedId === med._id;
                    return (
                      <Pressable
                        key={med._id}
                        style={({ pressed }) => [
                          styles.medOption,
                          isSelected && styles.medOptionActive,
                          pressed && styles.medOptionPressed,
                        ]}
                        onPress={() => setSelectedMedId(med._id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text
                          style={[
                            styles.medOptionText,
                            isSelected && styles.medOptionTextActive,
                          ]}
                        >
                          {med.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Time input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Time (24h format)</Text>
              <TextInput
                style={styles.input}
                value={selectedTime}
                onChangeText={setSelectedTime}
                placeholder="08:00"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numbers-and-punctuation"
                accessibilityLabel="Reminder time"
              />
            </View>

            {/* Days selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Days</Text>
              <View style={styles.daysRow}>
                {DAYS_OPTIONS.map((day) => {
                  const isSelected = selectedDays.includes(day.value);
                  return (
                    <Pressable
                      key={day.value}
                      style={({ pressed }) => [
                        styles.dayChip,
                        isSelected && styles.dayChipActive,
                        pressed && styles.dayChipPressed,
                      ]}
                      onPress={() => toggleDay(day.value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          isSelected && styles.dayChipTextActive,
                        ]}
                      >
                        {day.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                !selectedMedId && styles.saveButtonDisabled,
                pressed && selectedMedId && styles.saveButtonPressed,
              ]}
              onPress={handleAdd}
              disabled={!selectedMedId}
              accessibilityRole="button"
              accessibilityLabel="Set reminder"
            >
              <Text style={styles.saveButtonText}>Set Reminder</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
      paddingBottom: 12,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.8,
    },
    list: {
      padding: 20,
      paddingBottom: 100,
    },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 58,
      height: 58,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.lg,
    },
    fabPressed: {
      backgroundColor: colors.primaryDark,
      transform: [{ scale: 0.93 }],
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.3,
    },
    form: {
      padding: 20,
    },
    inputGroup: {
      marginBottom: 24,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      color: colors.text,
    },
    noMedsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
    },
    noMedsText: {
      fontSize: 14,
      color: colors.textTertiary,
      flex: 1,
    },
    medOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    medOption: {
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.card,
      ...shadows.sm,
    },
    medOptionActive: {
      backgroundColor: colors.primary,
    },
    medOptionPressed: {
      transform: [{ scale: 0.96 }],
    },
    medOptionText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
    },
    medOptionTextActive: {
      color: colors.textInverse,
    },
    daysRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    dayChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 24,
      backgroundColor: colors.card,
      ...shadows.sm,
    },
    dayChipActive: {
      backgroundColor: colors.primary,
    },
    dayChipPressed: {
      transform: [{ scale: 0.95 }],
    },
    dayChipText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    dayChipTextActive: {
      color: colors.textInverse,
    },
    saveButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      padding: 18,
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 40,
      ...shadows.md,
    },
    saveButtonDisabled: {
      backgroundColor: colors.textTertiary,
    },
    saveButtonPressed: {
      backgroundColor: colors.primaryDark,
      transform: [{ scale: 0.98 }],
    },
    saveButtonText: {
      color: colors.textInverse,
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: -0.2,
    },
  });
}
