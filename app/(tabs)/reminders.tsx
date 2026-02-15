import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ReminderItem } from '@/components/ReminderItem';
import { EmptyState } from '@/components/EmptyState';
import { Colors } from '@/constants/Colors';
// TODO: Re-enable when using a development build instead of Expo Go
// import { scheduleMedicationReminder, cancelReminder } from '@/lib/notifications';
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

const DEMO_USER_ID = null;

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState('08:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(['daily']);
  const [selectedMedId, setSelectedMedId] = useState<string | null>(null);

  const reminders = api && useQuery
    ? (DEMO_USER_ID ? useQuery(api.reminders.list, { userId: DEMO_USER_ID as any }) : undefined)
    : undefined;
  const medications = api && useQuery
    ? (DEMO_USER_ID ? useQuery(api.medications.listActive, { userId: DEMO_USER_ID as any }) : undefined)
    : undefined;
  const addReminder = api && useMutation ? useMutation(api.reminders.add) : null;
  const toggleReminder = api && useMutation ? useMutation(api.reminders.toggleActive) : null;
  const removeReminder = api && useMutation ? useMutation(api.reminders.remove) : null;

  const handleToggle = useCallback(
    async (id: any, _isActive: boolean, _notificationId?: string) => {
      // TODO: cancel local notification when using dev build
      await toggleReminder?.({ id });
    },
    [toggleReminder],
  );

  const handleDelete = useCallback(
    (id: any, name: string, _notificationId?: string) => {
      Alert.alert('Delete Reminder', `Remove reminder for ${name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // TODO: cancel local notification when using dev build
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
    if (!DEMO_USER_ID || !addReminder) {
      Alert.alert('Setup Required', 'Connect Convex to save reminders.');
      return;
    }

    try {
      const med = (medications ?? []).find((m: any) => m._id === selectedMedId);
      const { hour, minute } = parseTime(selectedTime);

      // TODO: schedule local notification when using dev build
      // const notificationId = await scheduleMedicationReminder(...)

      await addReminder({
        userId: DEMO_USER_ID as any,
        medicationId: selectedMedId as any,
        time: selectedTime,
        days: selectedDays,
      });

      setShowAddModal(false);
      setSelectedTime('08:00');
      setSelectedDays(['daily']);
      setSelectedMedId(null);
    } catch {
      Alert.alert('Error', 'Failed to create reminder.');
    }
  }, [selectedMedId, selectedTime, selectedDays, medications, addReminder]);

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
      {!reminders || reminders.length === 0 ? (
        <EmptyState
          icon="bell-o"
          title="No reminders set"
          message="Add reminders to never miss a dose"
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

      {/* Add button */}
      <Pressable style={styles.fab} onPress={() => setShowAddModal(true)}>
        <FontAwesome name="plus" size={24} color="#FFFFFF" />
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
            <Pressable onPress={() => setShowAddModal(false)}>
              <FontAwesome
                name="times"
                size={24}
                color={Colors.textSecondary}
              />
            </Pressable>
          </View>

          <View style={styles.form}>
            {/* Medication selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Medication</Text>
              {!medications || medications.length === 0 ? (
                <Text style={styles.noMedsText}>
                  No active medications. Add one in the My Meds tab first.
                </Text>
              ) : (
                <View style={styles.medOptions}>
                  {medications.map((med: any) => (
                    <Pressable
                      key={med._id}
                      style={[
                        styles.medOption,
                        selectedMedId === med._id && styles.medOptionActive,
                      ]}
                      onPress={() => setSelectedMedId(med._id)}
                    >
                      <Text
                        style={[
                          styles.medOptionText,
                          selectedMedId === med._id &&
                            styles.medOptionTextActive,
                        ]}
                      >
                        {med.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Time input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Time (HH:MM, 24h format)</Text>
              <TextInput
                style={styles.input}
                value={selectedTime}
                onChangeText={setSelectedTime}
                placeholder="08:00"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            {/* Days selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Days</Text>
              <View style={styles.daysRow}>
                {DAYS_OPTIONS.map((day) => (
                  <Pressable
                    key={day.value}
                    style={[
                      styles.dayChip,
                      selectedDays.includes(day.value) && styles.dayChipActive,
                    ]}
                    onPress={() => toggleDay(day.value)}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        selectedDays.includes(day.value) &&
                          styles.dayChipTextActive,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable style={styles.saveButton} onPress={handleAdd}>
              <Text style={styles.saveButtonText}>Set Reminder</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    padding: 20,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  form: {
    padding: 20,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
  },
  noMedsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  medOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  medOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  medOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  medOptionText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  medOptionTextActive: {
    color: '#FFFFFF',
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dayChipTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
