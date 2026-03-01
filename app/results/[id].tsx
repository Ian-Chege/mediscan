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
import { Colors } from '@/constants/Colors';
import { useTheme, AppColors } from '@/hooks/useTheme';
import { formatDateTime } from '@/lib/utils';

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

export default function ScanResultsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const markdownStyles = useMemo(() => createMarkdownStyles(colors), [colors]);
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
      if (!DEMO_USER_ID || !addMedication) {
        Alert.alert('Setup Required', 'Connect Convex to save medications.');
        return;
      }
      try {
        await addMedication({
          userId: DEMO_USER_ID as any,
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
    [addMedication],
  );

  if (!isLocal && scan === undefined) {
    return <LoadingSpinner message="Loading scan results..." />;
  }

  if (scan === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <FontAwesome
            name="exclamation-circle"
            size={48}
            color={Colors.danger}
          />
          <Text style={styles.errorText}>Scan not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Date */}
        <Text style={styles.date}>
          Scanned {formatDateTime(scan.scannedAt)}
        </Text>

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
                  style={styles.addButton}
                  onPress={() => handleAddToMeds(med)}
                >
                  <FontAwesome name="plus" size={14} color="#FFFFFF" />
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
              <FontAwesome
                name="lightbulb-o"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.explanationTitle}>What You Should Know</Text>
            </View>
            <Markdown style={markdownStyles}>{scan.explanation}</Markdown>
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <FontAwesome
            name="info-circle"
            size={16}
            color={colors.textSecondary}
          />
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

function createMarkdownStyles(colors: AppColors) {
  return StyleSheet.create({
    body: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 22,
    },
    heading1: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text,
      marginTop: 12,
      marginBottom: 6,
    },
    heading2: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
      marginTop: 10,
      marginBottom: 4,
    },
    heading3: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
      marginTop: 8,
      marginBottom: 4,
    },
    strong: {
      fontWeight: '700' as const,
      color: colors.text,
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
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingBottom: 40,
    },
    date: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
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
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 6,
    },
    addButtonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
    },
    explanationCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginTop: 8,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    explanationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    explanationTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    disclaimerCard: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    disclaimerText: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 18,
      flex: 1,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    errorText: {
      fontSize: 18,
      color: colors.textSecondary,
    },
  });
}
