import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { CameraCapture } from '@/components/CameraCapture';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Colors, Shadows } from '@/constants/Colors';
import { formatDateTime } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';

// Convex hooks — imported conditionally once Convex is configured
let useAction: any, useMutation: any, useQuery: any, api: any;
try {
  const convexReact = require('convex/react');
  useAction = convexReact.useAction;
  useMutation = convexReact.useMutation;
  useQuery = convexReact.useQuery;
  api = require('@/convex/_generated/api').api;
} catch {
  // Convex not yet set up
}

export default function ScanScreen() {
  const userId = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [prescriptionText, setPrescriptionText] = useState('');

  const extractMedications = api && useAction ? useAction(api.ai.extractMedications) : null;
  const extractFromText = api && useAction ? useAction(api.ai.extractFromText) : null;
  const checkInteractions = api && useAction ? useAction(api.drugApi.checkInteractions) : null;
  const generateExplanation = api && useAction ? useAction(api.ai.generateExplanation) : null;
  const saveScan = api && useMutation ? useMutation(api.scans.save) : null;
  const scans = api && useQuery
    ? useQuery(api.scans.list, userId ? { userId: userId as any } : "skip")
    : undefined;
  const activeMeds = api && useQuery
    ? useQuery(api.medications.listActive, userId ? { userId: userId as any } : "skip")
    : undefined;

  // Shared logic: take extracted meds → check interactions → get explanation → navigate
  const processExtracted = useCallback(
    async (extracted: any) => {
      if (extracted.error) {
        Alert.alert('Error', extracted.error);
        return;
      }

      if (!extracted.medications || extracted.medications.length === 0) {
        Alert.alert(
          'No Medications Found',
          'Could not identify any medications. Try again with more detail.',
        );
        return;
      }

      // Check interactions
      setProcessingStep('Checking for interactions...');
      const newMedNames = extracted.medications.map((m: any) => m.name);
      const existingMedNames = (activeMeds ?? []).map((m: any) => m.name);
      const interactions = await checkInteractions({
        medications: newMedNames,
        existingMedications: existingMedNames,
      });

      // Generate explanation
      setProcessingStep('Preparing explanation...');
      const explanation = await generateExplanation({
        medications: extracted.medications.map((m: any) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
        })),
        interactions,
      });

      // Save and navigate
      if (userId && saveScan) {
        setProcessingStep('Saving results...');
        const scanId = await saveScan({
          userId: userId as any,
          extractedMedications: extracted.medications,
          interactions,
          explanation: explanation ?? 'No explanation available.',
        });
        router.push(`/results/${scanId}`);
      } else {
        // No Convex user yet — navigate to results with data in params
        router.push({
          pathname: '/results/[id]',
          params: {
            id: 'local',
            data: JSON.stringify({
              extractedMedications: extracted.medications,
              interactions,
              explanation: explanation ?? 'No explanation available.',
              scannedAt: Date.now(),
            }),
          },
        });
      }
    },
    [userId, checkInteractions, generateExplanation, saveScan, activeMeds],
  );

  // Handle image scan
  const handleImageCaptured = useCallback(
    async (base64: string) => {
      if (!extractMedications) {
        Alert.alert(
          'Setup Required',
          'Connect Convex and set your OpenAI API key to enable scanning.',
        );
        return;
      }
      setIsProcessing(true);
      try {
        setProcessingStep('Reading prescription...');
        const extracted = await extractMedications({ imageBase64: base64 });
        await processExtracted(extracted);
      } catch (error) {
        console.error('Scan error:', error);
        Alert.alert('Scan Failed', 'Something went wrong. Please try again.');
      } finally {
        setIsProcessing(false);
        setProcessingStep('');
      }
    },
    [extractMedications, processExtracted],
  );

  // Handle text lookup
  const handleTextLookup = useCallback(async () => {
    const text = prescriptionText.trim();
    if (!text) {
      Alert.alert('Enter a Prescription', 'Type a medication, e.g. "Bruffen 1x3"');
      return;
    }
    if (!extractFromText) {
      Alert.alert(
        'Setup Required',
        'Connect Convex and set your OpenAI API key to enable lookups.',
      );
      return;
    }

    Keyboard.dismiss();
    setIsProcessing(true);
    try {
      setProcessingStep('Analyzing prescription...');
      const extracted = await extractFromText({ prescriptionText: text });
      await processExtracted(extracted);
      setPrescriptionText('');
    } catch (error) {
      console.error('Lookup error:', error);
      Alert.alert('Lookup Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  }, [prescriptionText, extractFromText, processExtracted]);

  if (isProcessing) {
    return <LoadingSpinner message={processingStep} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome to</Text>
            <Text style={styles.brand}>MediScan</Text>
          </View>
          <View style={styles.brandIcon}>
            <FontAwesome name="plus-square" size={20} color={Colors.primary} />
          </View>
        </View>

        {/* Scan options — camera & gallery side by side */}
        <Text style={styles.sectionLabel}>Scan a Prescription</Text>
        <CameraCapture onImageCaptured={handleImageCaptured} />

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or type it</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Text input */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <FontAwesome name="pencil" size={14} color={Colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={prescriptionText}
              onChangeText={setPrescriptionText}
              placeholder='e.g. "Bruffen 1x3" or "Amoxicillin 500mg"'
              placeholderTextColor={Colors.textTertiary}
              returnKeyType="search"
              onSubmitEditing={handleTextLookup}
              accessibilityLabel="Type a prescription"
            />
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.searchButton,
              !prescriptionText.trim() && styles.searchButtonDisabled,
              pressed && prescriptionText.trim() && styles.searchButtonPressed,
            ]}
            onPress={handleTextLookup}
            disabled={!prescriptionText.trim()}
            accessibilityRole="button"
            accessibilityLabel="Search prescription"
          >
            <FontAwesome name="arrow-right" size={16} color={Colors.textInverse} />
          </Pressable>
        </View>

        {/* Recent Scans */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionLabel}>Recent Scans</Text>
          {!scans || scans.length === 0 ? (
            <View style={styles.recentEmpty}>
              <View style={styles.recentEmptyIcon}>
                <FontAwesome name="file-text-o" size={20} color={Colors.textTertiary} />
              </View>
              <Text style={styles.recentEmptyText}>
                Your scan history will appear here
              </Text>
            </View>
          ) : (
            <FlatList
              data={scans}
              horizontal
              scrollEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item: any) => item._id}
              renderItem={({ item }: any) => (
                <Pressable
                  style={({ pressed }) => [styles.scanCard, pressed && styles.scanCardPressed]}
                  onPress={() => router.push(`/results/${item._id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`View scan with ${item.extractedMedications.length} medications`}
                >
                  <View style={styles.scanCardHeader}>
                    <FontAwesome name="file-text" size={16} color={Colors.primary} />
                    {item.interactions.length > 0 && (
                      <FontAwesome name="exclamation-circle" size={12} color={Colors.danger} />
                    )}
                  </View>
                  <Text style={styles.scanCardMeds}>
                    {item.extractedMedications.length} med{item.extractedMedications.length !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.scanCardDate}>
                    {formatDateTime(item.scannedAt)}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          For informational purposes only. Not a substitute for professional medical advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.8,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    ...Shadows.sm,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
  },
  searchButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  searchButtonDisabled: {
    backgroundColor: Colors.textTertiary,
    ...Shadows.sm,
  },
  searchButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.95 }],
  },
  recentSection: {
    marginTop: 28,
  },
  recentEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 16,
    ...Shadows.sm,
  },
  recentEmptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentEmptyText: {
    fontSize: 14,
    color: Colors.textTertiary,
    flex: 1,
  },
  scanCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginLeft: 20,
    width: 120,
    gap: 6,
    ...Shadows.sm,
  },
  scanCardPressed: {
    backgroundColor: Colors.surfaceHover,
    transform: [{ scale: 0.97 }],
  },
  scanCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanCardMeds: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  scanCardDate: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  disclaimer: {
    textAlign: 'center',
    color: Colors.textTertiary,
    fontSize: 11,
    paddingHorizontal: 40,
    paddingTop: 24,
    paddingBottom: 8,
  },
});
