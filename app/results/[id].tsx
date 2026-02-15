import { useCallback, useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { MedicationCard } from '@/components/MedicationCard';
import { InteractionWarning } from '@/components/InteractionWarning';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import Markdown from 'react-native-markdown-display';
import { Colors, Shadows } from '@/constants/Colors';
import { formatDateTime } from '@/lib/utils';
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

export default function ScanResultsScreen() {
  const userId = useUser();
  const { id, data } = useLocalSearchParams<{ id: string; data?: string }>();

  // If id is "local", data was passed via route params (no Convex user yet)
  const isLocal = id === 'local';

  const localScan = useMemo(() => {
    if (!isLocal || !data) return null;
    try {
      return JSON.parse(data as string);
    } catch {
      return null;
    }
  }, [isLocal, data]);

  // Only query Convex if this is a real scan ID
  const remoteScan =
    api && useQuery && !isLocal
      ? useQuery(api.scans.get, { id: id as any })
      : undefined;

  const scan = isLocal ? localScan : remoteScan;

  const addMedication =
    api && useMutation ? useMutation(api.medications.add) : null;

  const handleAddToMeds = useCallback(
    async (med: { name: string; dosage: string; frequency: string }) => {
      if (!userId || !addMedication) {
        Alert.alert('Setup Required', 'Connect Convex to save medications.');
        return;
      }
      try {
        await addMedication({
          userId: userId as any,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
        });
        Alert.alert(
          'Added',
          `${med.name} has been added to your medications.`,
        );
      } catch {
        Alert.alert('Error', 'Failed to add medication.');
      }
    },
    [userId, addMedication],
  );

  if (!isLocal && scan === undefined) {
    return <LoadingSpinner message="Loading scan results..." />;
  }

  if (scan === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <FontAwesome name="exclamation-circle" size={32} color={Colors.danger} />
          </View>
          <Text style={styles.errorTitle}>Scan not found</Text>
          <Text style={styles.errorText}>This scan may have been deleted</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Date badge */}
        <View style={styles.dateBadge}>
          <FontAwesome name="clock-o" size={12} color={Colors.textSecondary} />
          <Text style={styles.dateText}>
            {formatDateTime(scan.scannedAt)}
          </Text>
        </View>

        {/* Interaction warnings */}
        {scan.interactions.length > 0 && (
          <InteractionWarning interactions={scan.interactions} />
        )}

        {/* Extracted medications */}
        <Text style={styles.sectionTitle}>
          Medications Found ({scan.extractedMedications.length})
        </Text>

        {scan.extractedMedications.map(
          (
            med: {
              name: string;
              dosage: string;
              frequency: string;
              confidence?: string;
            },
            index: number,
          ) => (
            <View key={index}>
              <MedicationCard
                name={med.name}
                dosage={med.dosage}
                frequency={med.frequency}
                confidence={med.confidence}
              />
              <View style={styles.cardActions}>
                <Pressable
                  style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
                  onPress={() => handleAddToMeds(med)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${med.name} to my medications`}
                >
                  <FontAwesome name="plus" size={12} color={Colors.textInverse} />
                  <Text style={styles.addButtonText}>Add to My Meds</Text>
                </Pressable>
              </View>
            </View>
          ),
        )}

        {/* AI Explanation */}
        {scan.explanation && (
          <View style={styles.explanationCard}>
            <View style={styles.explanationHeader}>
              <View style={styles.explanationIconCircle}>
                <FontAwesome name="lightbulb-o" size={16} color={Colors.accent} />
              </View>
              <Text style={styles.explanationTitle}>What You Should Know</Text>
            </View>
            <Markdown style={markdownStyles}>{scan.explanation}</Markdown>
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <FontAwesome name="info-circle" size={14} color={Colors.textTertiary} />
          <Text style={styles.disclaimerText}>
            This information is for reference only and does not replace
            professional medical advice. Always consult your healthcare provider
            before making changes to your medication.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  heading1: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 12,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  heading2: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 10,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  heading3: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  strong: {
    fontWeight: '700' as const,
    color: Colors.text,
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    flexDirection: 'row' as const,
    marginVertical: 2,
  },
  bullet_list_icon: {
    fontSize: 14,
    color: Colors.primary,
    marginRight: 8,
  },
  paragraph: {
    marginVertical: 4,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
    ...Shadows.sm,
  },
  dateText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: -4,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    ...Shadows.sm,
  },
  addButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  addButtonText: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: '600',
  },
  explanationCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
    marginBottom: 16,
    ...Shadows.sm,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  explanationIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  disclaimerCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.surfaceHover,
    borderRadius: 12,
    padding: 14,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.textTertiary,
    lineHeight: 18,
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 40,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dangerSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  errorText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
