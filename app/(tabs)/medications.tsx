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
import { MedicationCard } from '@/components/MedicationCard';
import { EmptyState } from '@/components/EmptyState';
import { Colors } from '@/constants/Colors';

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

export default function MedicationsScreen() {
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
    ? (DEMO_USER_ID
        ? useQuery(showAll ? api.medications.list : api.medications.listActive, { userId: DEMO_USER_ID as any })
        : undefined)
    : undefined;
  const addMedication = api && useMutation ? useMutation(api.medications.add) : null;
  const toggleActive = api && useMutation ? useMutation(api.medications.toggleActive) : null;
  const removeMedication = api && useMutation ? useMutation(api.medications.remove) : null;

  const handleAdd = useCallback(async () => {
    if (!newMed.name || !newMed.dosage || !newMed.frequency) {
      Alert.alert('Missing Info', 'Please fill in name, dosage, and frequency.');
      return;
    }
    if (!DEMO_USER_ID || !addMedication) {
      Alert.alert('Setup Required', 'Connect Convex to save medications.');
      return;
    }
    try {
      await addMedication({
        userId: DEMO_USER_ID as any,
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
  }, [newMed, addMedication]);

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

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter toggle */}
      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterButton, !showAll && styles.filterButtonActive]}
          onPress={() => setShowAll(false)}
        >
          <Text
            style={[styles.filterText, !showAll && styles.filterTextActive]}
          >
            Active
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterButton, showAll && styles.filterButtonActive]}
          onPress={() => setShowAll(true)}
        >
          <Text
            style={[styles.filterText, showAll && styles.filterTextActive]}
          >
            All
          </Text>
        </Pressable>
      </View>

      {/* Medication list */}
      {!medications || medications.length === 0 ? (
        <EmptyState
          icon="medkit"
          title="No medications yet"
          message="Add medications manually or scan a prescription to get started"
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

      {/* Add button */}
      <Pressable style={styles.fab} onPress={() => setShowAddModal(true)}>
        <FontAwesome name="plus" size={24} color="#FFFFFF" />
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
            <Pressable onPress={() => setShowAddModal(false)}>
              <FontAwesome name="times" size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Medication Name *</Text>
              <TextInput
                style={styles.input}
                value={newMed.name}
                onChangeText={(text) =>
                  setNewMed((prev) => ({ ...prev, name: text }))
                }
                placeholder="e.g., Amoxicillin"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dosage *</Text>
              <TextInput
                style={styles.input}
                value={newMed.dosage}
                onChangeText={(text) =>
                  setNewMed((prev) => ({ ...prev, dosage: text }))
                }
                placeholder="e.g., 500mg"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Frequency *</Text>
              <TextInput
                style={styles.input}
                value={newMed.frequency}
                onChangeText={(text) =>
                  setNewMed((prev) => ({ ...prev, frequency: text }))
                }
                placeholder="e.g., 3 times daily"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>What is it for?</Text>
              <TextInput
                style={styles.input}
                value={newMed.purpose}
                onChangeText={(text) =>
                  setNewMed((prev) => ({ ...prev, purpose: text }))
                }
                placeholder="e.g., For blood pressure"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Special Instructions</Text>
              <TextInput
                style={styles.input}
                value={newMed.instructions}
                onChangeText={(text) =>
                  setNewMed((prev) => ({ ...prev, instructions: text }))
                }
                placeholder="e.g., Take with food"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <Pressable style={styles.saveButton} onPress={handleAdd}>
              <Text style={styles.saveButtonText}>Save Medication</Text>
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  list: {
    paddingHorizontal: 20,
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
    gap: 16,
  },
  inputGroup: {
    gap: 4,
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
