import { useCallback, useState } from 'react';
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
import { MedicationCard } from '@/components/MedicationCard';
import { EmptyState } from '@/components/EmptyState';
import { Colors, Shadows } from '@/constants/Colors';
import { useUser } from '@/contexts/UserContext';

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

export default function MedicationsScreen() {
  const userId = useUser();
  const [showAll, setShowAll] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    frequency: '',
    purpose: '',
    instructions: '',
  });

  const medications = api && useQuery
    ? useQuery(showAll ? api.medications.list : api.medications.listActive, userId ? { userId: userId as any } : "skip")
    : undefined;
  const addMedication = api && useMutation ? useMutation(api.medications.add) : null;
  const toggleActive = api && useMutation ? useMutation(api.medications.toggleActive) : null;
  const removeMedication = api && useMutation ? useMutation(api.medications.remove) : null;

  const handleAdd = useCallback(async () => {
    if (!newMed.name || !newMed.dosage || !newMed.frequency) {
      Alert.alert('Missing Info', 'Please fill in name, dosage, and frequency.');
      return;
    }
    if (!userId || !addMedication) {
      Alert.alert('Setup Required', 'Connect Convex to save medications.');
      return;
    }
    try {
      await addMedication({
        userId: userId as any,
        name: newMed.name,
        dosage: newMed.dosage,
        frequency: newMed.frequency,
        purpose: newMed.purpose || undefined,
        instructions: newMed.instructions || undefined,
      });
      setShowAddModal(false);
      setNewMed({ name: '', dosage: '', frequency: '', purpose: '', instructions: '' });
    } catch {
      Alert.alert('Error', 'Failed to add medication.');
    }
  }, [userId, newMed, addMedication]);

  const handleDelete = useCallback(
    (id: any, name: string) => {
      Alert.alert(
        'Delete Medication',
        `Remove ${name} from your list? This will also delete associated reminders.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => removeMedication?.({ id }),
          },
        ],
      );
    },
    [removeMedication],
  );

  const isFormValid = newMed.name.trim() && newMed.dosage.trim() && newMed.frequency.trim();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with filter */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Meds</Text>
        <View style={styles.filterRow}>
          {(['Active', 'All'] as const).map((label) => {
            const isActive = label === 'Active' ? !showAll : showAll;
            return (
              <Pressable
                key={label}
                style={({ pressed }) => [
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                  pressed && styles.filterChipPressed,
                ]}
                onPress={() => setShowAll(label === 'All')}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Medication list */}
      {!medications || medications.length === 0 ? (
        <EmptyState
          icon="medkit"
          title="No medications yet"
          message="Add medications manually or scan a prescription to get started"
          actionLabel="Add Medication"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <FlatList
          data={medications}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: any) => (
            <MedicationCard
              name={item.name}
              dosage={item.dosage}
              frequency={item.frequency}
              purpose={item.purpose}
              instructions={item.instructions}
              isActive={item.isActive}
              showActions
              onToggleActive={() => toggleActive?.({ id: item._id })}
              onDelete={() => handleDelete(item._id, item.name)}
            />
          )}
        />
      )}

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => setShowAddModal(true)}
        accessibilityRole="button"
        accessibilityLabel="Add medication"
      >
        <FontAwesome name="plus" size={22} color={Colors.textInverse} />
      </Pressable>

      {/* Add Medication Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Medication</Text>
            <Pressable
              onPress={() => setShowAddModal(false)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <FontAwesome name="times" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
            {[
              { key: 'name', label: 'Medication Name', placeholder: 'e.g., Amoxicillin', required: true },
              { key: 'dosage', label: 'Dosage', placeholder: 'e.g., 500mg', required: true },
              { key: 'frequency', label: 'Frequency', placeholder: 'e.g., 3 times daily', required: true },
              { key: 'purpose', label: 'What is it for?', placeholder: 'e.g., For blood pressure', required: false },
              { key: 'instructions', label: 'Special Instructions', placeholder: 'e.g., Take with food', required: false },
            ].map(({ key, label, placeholder, required }) => (
              <View key={key} style={styles.inputGroup}>
                <Text style={styles.label}>
                  {label}{required ? ' *' : ''}
                </Text>
                <TextInput
                  style={styles.input}
                  value={newMed[key as keyof typeof newMed]}
                  onChangeText={(text) =>
                    setNewMed((prev) => ({ ...prev, [key]: text }))
                  }
                  placeholder={placeholder}
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
            ))}

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                !isFormValid && styles.saveButtonDisabled,
                pressed && isFormValid && styles.saveButtonPressed,
              ]}
              onPress={handleAdd}
              disabled={!isFormValid}
              accessibilityRole="button"
              accessibilityLabel="Save medication"
            >
              <Text style={styles.saveButtonText}>Save Medication</Text>
            </Pressable>
          </ScrollView>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.8,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.card,
    ...Shadows.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipPressed: {
    transform: [{ scale: 0.96 }],
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.textInverse,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
  },
  fabPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.93 }],
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
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
    ...Shadows.md,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.textTertiary,
  },
  saveButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  saveButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
