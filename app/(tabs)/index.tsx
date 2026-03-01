import { useCallback, useMemo, useState } from 'react';
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
import { Colors } from '@/constants/Colors';
import { useTheme, AppColors } from '@/hooks/useTheme';
import { formatDateTime } from '@/lib/utils';

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

const DEMO_USER_ID = null;

export default function ScanScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [prescriptionText, setPrescriptionText] = useState('');

  const processScan = api && useAction ? useAction(api.ai.processScan) : null;
  const saveScan = api && useMutation ? useMutation(api.scans.save) : null;
  const scans = api && useQuery
    ? (DEMO_USER_ID ? useQuery(api.scans.list, { userId: DEMO_USER_ID as any }) : undefined)
    : undefined;
  const activeMeds = api && useQuery
    ? (DEMO_USER_ID ? useQuery(api.medications.listActive, { userId: DEMO_USER_ID as any }) : undefined)
    : undefined;

  // Navigate to results after a single processScan call
  const handleResult = useCallback(
    async (result: any) => {
      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }
      if (!result.medications || result.medications.length === 0) {
        Alert.alert('No Medications Found', 'Could not identify any medications. Try again with more detail.');
        return;
      }
      if (DEMO_USER_ID && saveScan) {
        const scanId = await saveScan({
          userId: DEMO_USER_ID as any,
          extractedMedications: result.medications,
          interactions: result.interactions,
          explanation: result.explanation ?? 'No explanation available.',
        });
        router.push(`/results/${scanId}`);
      } else {
        router.push({
          pathname: '/results/[id]',
          params: {
            id: 'local',
            data: JSON.stringify({
              extractedMedications: result.medications,
              interactions: result.interactions,
              explanation: result.explanation ?? 'No explanation available.',
              scannedAt: Date.now(),
            }),
          },
        });
      }
    },
    [saveScan],
  );

  // Handle image scan — single round trip
  const handleImageCaptured = useCallback(
    async (base64: string) => {
      if (!processScan) {
        Alert.alert('Setup Required', 'Connect Convex and set your OpenAI API key to enable scanning.');
        return;
      }
      setIsProcessing(true);
      setProcessingStep('Analyzing prescription...');
      try {
        const result = await processScan({
          imageBase64: base64,
          existingMedications: (activeMeds ?? []).map((m: any) => m.name),
        });
        await handleResult(result);
      } catch (error) {
        console.error('Scan error:', error);
        Alert.alert('Scan Failed', 'Something went wrong. Please try again.');
      } finally {
        setIsProcessing(false);
        setProcessingStep('');
      }
    },
    [processScan, activeMeds, handleResult],
  );

  // Handle text lookup — single round trip
  const handleTextLookup = useCallback(async () => {
    const text = prescriptionText.trim();
    if (!text) {
      Alert.alert('Enter a Prescription', 'Type a medication, e.g. "Bruffen 1x3"');
      return;
    }
    if (!processScan) {
      Alert.alert('Setup Required', 'Connect Convex and set your OpenAI API key to enable lookups.');
      return;
    }
    Keyboard.dismiss();
    setIsProcessing(true);
    setProcessingStep('Analyzing prescription...');
    try {
      const result = await processScan({
        prescriptionText: text,
        existingMedications: (activeMeds ?? []).map((m: any) => m.name),
      });
      await handleResult(result);
      setPrescriptionText('');
    } catch (error) {
      console.error('Lookup error:', error);
      Alert.alert('Lookup Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  }, [prescriptionText, processScan, activeMeds, handleResult]);

  if (isProcessing) {
    return <LoadingSpinner message={processingStep} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <FontAwesome name="plus-square" size={28} color={Colors.primary} />
          <Text style={styles.headerTitle}>MediScan</Text>
          <View style={{ flex: 1 }} />
          <Pressable onPress={toggleTheme} style={styles.themeToggle} hitSlop={8}>
            <FontAwesome
              name={isDark ? 'sun-o' : 'moon-o'}
              size={22}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* Text input for quick prescription lookup */}
        <View style={styles.textInputSection}>
          <Text style={styles.sectionTitle}>Type a Prescription</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={prescriptionText}
              onChangeText={setPrescriptionText}
              placeholder='e.g. "Bruffen 1x3" or "Amoxicillin 500mg twice daily"'
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              onSubmitEditing={handleTextLookup}
            />
            <Pressable
              style={[styles.lookupButton, !prescriptionText.trim() && styles.lookupButtonDisabled]}
              onPress={handleTextLookup}
              disabled={!prescriptionText.trim()}
            >
              <FontAwesome name="search" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or scan</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Camera capture */}
        <CameraCapture onImageCaptured={handleImageCaptured} />

        <Text style={styles.hint}>
          Take a photo of your prescription or select from gallery
        </Text>

        {/* Recent Scans */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Scans</Text>
          {!scans || scans.length === 0 ? (
            <EmptyState
              icon="file-text-o"
              title="No scans yet"
              message="Scan or type your first prescription to get started"
            />
          ) : (
            <FlatList
              data={scans}
              horizontal
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item: any) => item._id}
              renderItem={({ item }: any) => (
                <Pressable
                  style={styles.scanCard}
                  onPress={() => router.push(`/results/${item._id}`)}
                >
                  <FontAwesome name="file-text" size={24} color={Colors.primary} />
                  <Text style={styles.scanCardMeds}>
                    {item.extractedMedications.length} medication
                    {item.extractedMedications.length !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.scanCardDate}>
                    {formatDateTime(item.scannedAt)}
                  </Text>
                  {item.interactions.length > 0 && (
                    <View style={styles.warningDot}>
                      <FontAwesome name="exclamation-circle" size={14} color={Colors.danger} />
                    </View>
                  )}
                </Pressable>
              )}
            />
          )}
        </View>

        <Text style={styles.disclaimer}>
          For informational purposes only. Not a substitute for professional medical advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
    },
    themeToggle: {
      padding: 4,
    },
    textInputSection: {
      paddingHorizontal: 20,
      marginTop: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 10,
    },
    inputRow: {
      flexDirection: 'row',
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    lookupButton: {
      backgroundColor: Colors.primary,
      borderRadius: 10,
      width: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    lookupButtonDisabled: {
      opacity: 0.4,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginVertical: 16,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      marginHorizontal: 12,
      fontSize: 13,
      color: colors.textSecondary,
    },
    hint: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: 14,
      paddingHorizontal: 40,
    },
    recentSection: {
      marginTop: 24,
      paddingHorizontal: 20,
    },
    scanCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginRight: 12,
      width: 140,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      gap: 6,
    },
    scanCardMeds: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    scanCardDate: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    warningDot: {
      position: 'absolute',
      top: 8,
      right: 8,
    },
    disclaimer: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: 11,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
      fontStyle: 'italic',
    },
  });
}
