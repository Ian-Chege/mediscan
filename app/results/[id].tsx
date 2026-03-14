import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DoseTimePickerModal } from '@/components/DoseTimePickerModal';
import Markdown from 'react-native-markdown-display';
import { useTheme, AppColors } from '@/hooks/useTheme';
import type { AppShadows } from '@/constants/Colors';
import { formatDateTime } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import { parseDosesPerDay, computeDoseTimes, isQuietHour, formatTime12h } from '@/lib/scheduleCalculator';
import { scheduleMedicationReminder } from '@/lib/notifications';

let useMutation: any, useQuery: any, api: any;
try {
  const convexReact = require('convex/react');
  useMutation = convexReact.useMutation;
  useQuery = convexReact.useQuery;
  api = require('@/convex/_generated/api').api;
} catch {}

const labels = {
  en: {
    addToMeds: 'Save Selected to My Meds',
    added: 'Added',
    addedMsg: (name: string) => `${name} saved to your medications.`,
    explanation: 'Detailed Breakdown',
    condition: 'Condition',
    age: 'Age',
    allergies: 'Allergies',
    patientInfo: 'Patient Info',
    disclaimer:
      'For information only — always talk to your doctor before changing your medication.',
    scanNotFound: 'Scan not found',
    scanDeleted: 'This scan may have been deleted',
    planTitle: 'What to Buy',
    yourPlan: 'Your Plan',
    yourPlanDesc: 'These medications are safe to take together',
    alternatives: 'Alternatives',
    alternativesDesc: 'Try these if a recommended medication doesn\'t work',
    primary: 'Buy This',
    alternative: 'Alternative',
    dosage: 'Dosage',
    take: 'Take',
    tips: 'Remember',
    warnings: 'Warnings',
    doNotCombine: 'Do not combine',
    caution: 'Caution',
    safeToTake: 'Safe to take together',
    noInteractions: 'No known interactions between these medications',
    savedAll: 'Saved',
    savedAllMsg: 'All medications saved to your list.',
    buy: 'Buy',
    avoid: 'Avoid',
    selectedCount: (n: number) => `${n} medication${n !== 1 ? 's' : ''} selected`,
  },
  sw: {
    addToMeds: 'Hifadhi Zilizochaguliwa kwenye Dawa Zangu',
    added: 'Imeongezwa',
    addedMsg: (name: string) => `${name} imehifadhiwa kwenye dawa zako.`,
    explanation: 'Maelezo Kamili',
    condition: 'Hali',
    age: 'Umri',
    allergies: 'Mizio',
    patientInfo: 'Taarifa za Mgonjwa',
    disclaimer:
      'Kwa taarifa tu — daima ongea na daktari wako kabla ya kubadilisha dawa yako.',
    scanNotFound: 'Skani haijapatikana',
    scanDeleted: 'Skani hii inaweza kuwa imefutwa',
    planTitle: 'Nini Cha Kununua',
    yourPlan: 'Mpango Wako',
    yourPlanDesc: 'Dawa hizi ni salama kutumia pamoja',
    alternatives: 'Mbadala',
    alternativesDesc: 'Jaribu hizi ikiwa dawa iliyopendekezwa haifanyi kazi',
    primary: 'Nunua Hii',
    alternative: 'Mbadala',
    dosage: 'Kipimo',
    take: 'Tumia',
    tips: 'Kumbuka',
    warnings: 'Tahadhari',
    doNotCombine: 'Usichanganye',
    caution: 'Tahadhari',
    safeToTake: 'Salama kutumia pamoja',
    noInteractions: 'Hakuna mwingiliano unaojulikana kati ya dawa hizi',
    savedAll: 'Imehifadhiwa',
    savedAllMsg: 'Dawa zote zimehifadhiwa kwenye orodha yako.',
    buy: 'Nunua',
    avoid: 'Epuka',
    selectedCount: (n: number) => `Dawa ${n} zimechaguliwa`,
  },
};

type Lang = 'en' | 'sw';

type ConditionMatch = {
  drug: string;
  match: 'yes' | 'no' | 'partial';
  reason_en: string;
  reason_sw: string;
};

type MedicationSafety = {
  index: number;
  ageRestrictions: { severity: string; text_en: string; text_sw: string }[];
  allergyRestrictions: { allergen: string; severity?: string; text_en: string; text_sw: string }[];
};

/** "3 times daily" → "1 × 3", "every 6-8 hours" → "1 × 3", "as needed" → "PRN" */
function formatCompactDosage(frequency: string, lang: Lang = 'en'): string {
  const freq = frequency.toLowerCase().trim();

  // "X times daily/a day/per day"
  const timesMatch = freq.match(/(\d+)\s*(?:times?\s*(?:daily|a\s*day|per\s*day))/);
  if (timesMatch) return `1 × ${timesMatch[1]}`;

  if (/once\s*(?:daily|a\s*day)/.test(freq)) return '1 × 1';
  if (/twice\s*(?:daily|a\s*day)/.test(freq)) return '1 × 2';

  // "every X-Y hours" → use the higher interval
  const rangeMatch = freq.match(/every\s*(\d+)\s*-\s*(\d+)\s*(?:hours?|hrs?)/);
  if (rangeMatch) return `1 × ${Math.floor(24 / Number(rangeMatch[2]))}`;

  // "every X hours"
  const everyMatch = freq.match(/every\s*(\d+)\s*(?:hours?|hrs?)/);
  if (everyMatch) return `1 × ${Math.floor(24 / Number(everyMatch[1]))}`;

  // "every X-Y minutes" → roughly per day
  const minRangeMatch = freq.match(/every\s*(\d+)\s*-\s*(\d+)\s*min/);
  if (minRangeMatch) return lang === 'sw' ? 'Ikihitajika' : 'As needed';

  // Catch-all for "as needed", "after each...", "when required", etc.
  if (/as\s*needed|prn|after\s*each|when\s*required|loose\s*stool/i.test(freq)) return lang === 'sw' ? 'Ikihitajika' : 'As needed';

  return '—';
}

function parseExplanation(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.en && parsed.sw) {
      return {
        en: parsed.en,
        sw: parsed.sw,
        conditionMatches: (parsed.conditionMatches || []) as ConditionMatch[],
        medicationSafety: (parsed.medicationSafety || []) as MedicationSafety[],
      };
    }
  } catch {}
  const marker = '---SWAHILI---';
  const idx = raw.indexOf(marker);
  if (idx !== -1) {
    return {
      en: raw.substring(0, idx).trim(),
      sw: raw.substring(idx + marker.length).trim(),
      conditionMatches: [] as ConditionMatch[],
      medicationSafety: [] as MedicationSafety[],
    };
  }
  return { en: raw, sw: raw, conditionMatches: [] as ConditionMatch[], medicationSafety: [] as MedicationSafety[] };
}

export default function ScanResultsScreen() {
  const userId = useUser();
  const { colors, shadows } = useTheme();
  const [lang, setLang] = useState<Lang>('en');
  const l = labels[lang];
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const mdStyles = useMemo(() => createMarkdownStyles(colors), [colors]);
  const { id, data } = useLocalSearchParams<{ id: string; data?: string }>();
  const [showExplanation, setShowExplanation] = useState(false);
  // Track which meds the patient has selected to save (indexed by position)
  const [selectedMeds, setSelectedMeds] = useState<Set<number>>(new Set());

  const isLocal = id === 'local';

  const localScan = useMemo(() => {
    if (!isLocal || !data) return null;
    try { return JSON.parse(data as string); } catch { return null; }
  }, [isLocal, data]);

  const remoteScan =
    api && useQuery && !isLocal
      ? useQuery(api.scans.get, { id: id as any })
      : undefined;

  const scan = isLocal ? localScan : remoteScan;
  const addMedication = api && useMutation ? useMutation(api.medications.add) : null;
  const addReminder = api && useMutation ? useMutation(api.reminders.add) : null;
  const addScheduledTodo = api && useMutation ? useMutation(api.todos.addScheduled) : null;
  const seedDayEntries = api && useMutation ? useMutation(api.schedule.seedDayEntries) : null;

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Pre-compute warnings so callbacks can reference them (must be before early returns for hook rules)
  type MedWarnings = { name: string; notes: string[]; shouldAvoid: boolean };
  const { explanationParts, medWarnings } = useMemo(() => {
    if (!scan) return { explanationParts: { en: '', sw: '', conditionMatches: [] as ConditionMatch[], medicationSafety: [] as MedicationSafety[] }, medWarnings: [] as MedWarnings[] };

    const parts = parseExplanation(scan.explanation ?? '');
    const conditionMap = new Map<string, ConditionMatch>();
    for (const cm of parts.conditionMatches) conditionMap.set(cm.drug.toLowerCase(), cm);

    const findMatch = (name: string) => {
      const lower = name.toLowerCase();
      if (conditionMap.has(lower)) return conditionMap.get(lower);
      for (const [key, val] of conditionMap) {
        if (lower.includes(key) || key.includes(lower)) return val;
      }
      return undefined;
    };

    const warnings: MedWarnings[] = [];
    scan.extractedMedications.forEach((med: any, index: number) => {
      const notes: string[] = [];
      const aiRecommended = med.confidence === 'high';
      const match = scan.condition ? findMatch(med.name) : undefined;
      if (match?.match === 'no') {
        const reason = (lang === 'sw' ? match!.reason_sw : match!.reason_en)?.trim();
        if (reason) notes.push(reason);
      }
      const safety = parts.medicationSafety.find((s: any) => s.index === index);
      safety?.ageRestrictions?.forEach((r: any) => {
        if (r.severity !== 'high') return;
        const text = (lang === 'sw' ? r.text_sw : r.text_en)?.trim();
        if (text) notes.push(text);
      });
      safety?.allergyRestrictions?.forEach((r: any) => {
        if (r.severity === 'safe') return;
        const text = (lang === 'sw' ? r.text_sw : r.text_en)?.trim();
        if (!text || /no known/i.test(text)) return;
        notes.push(text);
      });
      const hasHardAvoid = !aiRecommended && notes.some((n) =>
        /\bavoid\b|not safe|contraindicated|do not use|not appropriate/i.test(n),
      );
      const unique = notes.filter((n, i, arr) => arr.indexOf(n) === i);
      if (unique.length > 0) warnings.push({ name: med.name, notes: unique, shouldAvoid: hasHardAvoid });
    });

    return { explanationParts: parts, medWarnings: warnings };
  }, [scan, lang]);

  // Auto-select primary (high-confidence, non-avoid) meds when scan loads
  const initialSelection = useMemo(() => {
    if (!scan) return new Set<number>();
    const set = new Set<number>();
    scan.extractedMedications.forEach((med: any, i: number) => {
      const mw = medWarnings.find((w) => w.name === med.name);
      if (mw?.shouldAvoid) return;
      if (med.confidence === 'high' || (i === 0 && !mw?.shouldAvoid)) set.add(i);
    });
    return set;
  }, [scan, medWarnings]);

  // Sync initial selection when scan loads (only once)
  const [selectionInitialized, setSelectionInitialized] = useState(false);
  if (!selectionInitialized && initialSelection.size > 0) {
    setSelectedMeds(initialSelection);
    setSelectionInitialized(true);
  }

  const toggleMedSelection = useCallback((index: number) => {
    setSelectedMeds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handleSaveWithSchedule = useCallback(async (hour: number, minute: number) => {
    if (!userId || !addMedication || !scan) return;
    setShowTimePicker(false);
    setIsSaving(true);

    try {
      // Only save meds the patient selected (and not avoided)
      const safeMeds = scan.extractedMedications.filter((_: any, i: number) => {
        if (!selectedMeds.has(i)) return false;
        const mw = medWarnings.find((w: MedWarnings) => w.name === scan.extractedMedications[i].name);
        return !mw?.shouldAvoid;
      });

      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const scheduleEntriesBatch: { medicationId: any; reminderId: any; time: string }[] = [];

      // Group meds by their dose times for combined todos
      const todosByTime = new Map<string, { names: string[]; doses: string[]; medName: string }>();

      for (const med of safeMeds) {
        // Build instructions from context
        const parts: string[] = [];
        if (scan.condition) parts.push(`For: ${scan.condition}`);
        if (scan.allergies) parts.push(`Allergies: ${scan.allergies}`);
        const instructions = parts.length > 0 ? parts.join('. ') : undefined;

        // Save medication
        const medicationId = await addMedication({
          userId: userId as any,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          instructions,
          purpose: med.purpose,
        });

        // Compute schedule
        const dosesPerDay = parseDosesPerDay(med.frequency);
        const times = computeDoseTimes(dosesPerDay, hour, minute);

        if (times.length === 0) continue; // as-needed meds — saved but no schedule

        // Create reminders + notifications for each dose time
        for (const time of times) {
          const [h, m] = time.split(':').map(Number);
          const displayTime = formatTime12h(time);

          // Schedule notification (skip during quiet hours unless it's the user-selected start time)
          let notifId: string | undefined;
          const isUserSelectedTime = h === hour && m === minute;

          if (!isQuietHour(h) || isUserSelectedTime) {
            notifId = await scheduleMedicationReminder(med.name, med.dosage, h, m);
          }
          // Follow-up is scheduled reactively when the main notification fires
          // (see notificationReceived listener in _layout.tsx), not at setup time.

          // Create reminder in Convex
          if (addReminder) {
            const reminderId = await addReminder({
              userId: userId as any,
              medicationId,
              time,
              days: ['daily'],
              notificationId: notifId,
            });

            scheduleEntriesBatch.push({ medicationId, reminderId, time });
          }

          // Group for combined todos
          const existing = todosByTime.get(time);
          if (existing) {
            existing.names.push(med.name);
            existing.doses.push(med.dosage);
          } else {
            todosByTime.set(time, { names: [med.name], doses: [med.dosage], medName: med.name });
          }
        }
      }

      // Create todos — combine meds at the same time
      if (addScheduledTodo) {
        for (const [time, group] of todosByTime) {
          const taskText = group.names.length === 1
            ? `Take ${group.names[0]} ${group.doses[0]}`
            : `Take ${group.names.join(' + ')}`;
          const medName = group.names.length === 1 ? group.medName : group.names.join(', ');

          await addScheduledTodo({
            userId: userId as any,
            task: taskText,
            medicationName: medName,
            scheduledTime: time,
            scheduledDate: today,
            status: 'pending',
          });
        }
      }

      // Seed schedule entries
      if (seedDayEntries && scheduleEntriesBatch.length > 0) {
        await seedDayEntries({
          userId: userId as any,
          date: today,
          entries: scheduleEntriesBatch,
        });
      }

      setIsSaving(false);
      Alert.alert(
        l.savedAll,
        'Medications saved with reminders and schedule.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/todos' as any) }],
      );
    } catch (err) {
      setIsSaving(false);
      Alert.alert('Error', 'Failed to save medications with schedule.');
    }
  }, [userId, addMedication, addReminder, addScheduledTodo, seedDayEntries, scan, medWarnings, selectedMeds, l]);

  const handleSaveOnly = useCallback(async () => {
    setShowTimePicker(false);
    if (!userId || !addMedication || !scan) {
      if (!userId) Alert.alert('Setup Required', 'Please sign in to save medications.');
      return;
    }
    setIsSaving(true);
    try {
      for (let idx = 0; idx < scan.extractedMedications.length; idx++) {
        if (!selectedMeds.has(idx)) continue;
        const med = scan.extractedMedications[idx];
        const mw = medWarnings.find((w: MedWarnings) => w.name === med.name);
        if (mw?.shouldAvoid) continue;

        const parts: string[] = [];
        if (scan.condition) parts.push(`For: ${scan.condition}`);
        if (scan.allergies) parts.push(`Allergies: ${scan.allergies}`);

        await addMedication({
          userId: userId as any,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          instructions: parts.length > 0 ? parts.join('. ') : undefined,
          purpose: med.purpose,
        });
      }
      setIsSaving(false);
      Alert.alert(l.savedAll, l.savedAllMsg);
    } catch {
      setIsSaving(false);
      Alert.alert('Error', 'Failed to save medications.');
    }
  }, [userId, addMedication, scan, medWarnings, selectedMeds, l]);

  const handleSaveAll = useCallback(() => {
    if (!userId) {
      Alert.alert('Setup Required', 'Please sign in to save medications.');
      return;
    }
    setShowTimePicker(true);
  }, [userId]);

  if (!isLocal && scan === undefined) {
    return <LoadingSpinner message="Loading..." />;
  }

  if (scan === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconCircle}>
            <FontAwesome name="exclamation-circle" size={28} color={colors.danger} />
          </View>
          <Text style={styles.errorTitle}>{l.scanNotFound}</Text>
          <Text style={styles.errorText}>{l.scanDeleted}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dangerousInteractions = scan.interactions.filter((i: any) => i.severity === 'high');
  const otherInteractions = scan.interactions.filter((i: any) => i.severity !== 'high');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <FontAwesome name="chevron-left" size={14} color={colors.text} />
          </Pressable>
          <View style={styles.dateBadge}>
            <FontAwesome name="clock-o" size={11} color={colors.textSecondary} />
            <Text style={styles.dateText}>{formatDateTime(scan.scannedAt)}</Text>
          </View>
          <View style={styles.langToggle}>
            <Pressable
              style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
              onPress={() => setLang('en')}
            >
              <Text style={[styles.langBtnText, lang === 'en' && styles.langBtnTextActive]}>EN</Text>
            </Pressable>
            <Pressable
              style={[styles.langBtn, lang === 'sw' && styles.langBtnActive]}
              onPress={() => setLang('sw')}
            >
              <Text style={[styles.langBtnText, lang === 'sw' && styles.langBtnTextActive]}>SW</Text>
            </Pressable>
          </View>
        </View>

        {/* Patient info */}
        {(scan.condition || scan.age || scan.allergies) && (
          <View style={styles.patientInfoCard}>
            {scan.condition && (
              <View style={styles.patientInfoRow}>
                <FontAwesome name="heartbeat" size={12} color={colors.accent} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientInfoLabel}>{l.condition}</Text>
                  <Text style={styles.patientInfoValue}>{scan.condition}</Text>
                </View>
              </View>
            )}
            {scan.age && (
              <View style={styles.patientInfoRow}>
                <FontAwesome name="user" size={12} color={colors.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientInfoLabel}>{l.age}</Text>
                  <Text style={styles.patientInfoValue}>{scan.age}</Text>
                </View>
              </View>
            )}
            {scan.allergies && (
              <View style={styles.patientInfoRow}>
                <FontAwesome name="exclamation-triangle" size={11} color={colors.danger} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientInfoLabel}>{l.allergies}</Text>
                  <Text style={styles.patientInfoValue}>{scan.allergies}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ═══ WHAT TO BUY ═══ */}
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <View style={styles.planIconCircle}>
              <FontAwesome name="shopping-cart" size={14} color={colors.textInverse} />
            </View>
            <Text style={styles.planTitle}>{l.planTitle}</Text>
          </View>

          {/* Recommendation text (from AI) */}
          {scan.recommendation && (
            <Text style={styles.recommendationText}>{scan.recommendation}</Text>
          )}

          {/* Medication list — grouped into "Your Plan" and "Alternatives" */}
          {(() => {
            type MedItem = { name: string; dosage: string; frequency: string; confidence?: string; purpose?: string };
            const meds: MedItem[] = scan.extractedMedications;
            const primaryMeds: { med: MedItem; idx: number }[] = [];
            const altMeds: { med: MedItem; idx: number }[] = [];
            const avoidMeds: { med: MedItem; idx: number }[] = [];

            meds.forEach((med, i) => {
              const mw = medWarnings.find((w) => w.name === med.name);
              if (mw?.shouldAvoid) { avoidMeds.push({ med, idx: i }); return; }
              if (med.confidence === 'high' || (i === 0 && !mw?.shouldAvoid)) {
                primaryMeds.push({ med, idx: i });
              } else {
                altMeds.push({ med, idx: i });
              }
            });

            const renderMedCard = ({ med, idx }: { med: MedItem; idx: number }, isPrimary: boolean) => {
              const compact = formatCompactDosage(med.frequency, lang);
              const maxMatch = med.frequency.match(/(?:not?\s*(?:to\s*)?exceed|max(?:imum)?)\s*(\d+\s*m?g(?:\s*per\s*day)?)/i);
              const isAsNeeded = compact.includes('needed') || compact.includes('Ikihitajika');
              const instruction = isAsNeeded
                ? (lang === 'sw' ? `Tumia ${med.dosage} ikihitajika` : `Take ${med.dosage} as needed`)
                : (lang === 'sw'
                    ? `Tumia ${med.dosage}, mara ${compact.split('× ')[1]} kwa siku`
                    : `Take ${med.dosage}, ${compact.split('× ')[1]} times a day`);
              const isSelected = selectedMeds.has(idx);

              return (
                <Pressable
                  key={idx}
                  style={[
                    styles.dosageRow,
                    isPrimary && styles.dosageRowPrimary,
                    isSelected && { borderWidth: 1.5, borderColor: colors.secondary + '60' },
                    !isSelected && { opacity: 0.55 },
                  ]}
                  onPress={() => toggleMedSelection(idx)}
                >
                  <View style={[
                    styles.medCheckbox,
                    isSelected && { backgroundColor: colors.secondary, borderColor: colors.secondary },
                  ]}>
                    {isSelected && <FontAwesome name="check" size={10} color="#fff" />}
                  </View>
                  <View style={styles.dosageInfo}>
                    {isPrimary && (
                      <Text style={styles.primaryLabel}>{l.primary}</Text>
                    )}
                    {!isPrimary && (
                      <Text style={styles.alternativeLabel}>{l.alternative}</Text>
                    )}
                    <Text style={styles.dosageMedName}>{med.name}</Text>
                    <Text style={styles.dosageInstruction}>{instruction}</Text>
                    {med.purpose && (
                      <Text style={styles.dosagePurpose}>{med.purpose}</Text>
                    )}
                    {maxMatch && (
                      <Text style={styles.dosageMax}>
                        {lang === 'sw' ? `Usizidi ${maxMatch[1]}` : `Do not exceed ${maxMatch[1]}`}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.dosageBadge, isPrimary && isSelected && { backgroundColor: colors.secondary + '18' }]}>
                    <Text style={[styles.dosageBadgeText, isPrimary && isSelected && { color: colors.secondary }]}>{compact}</Text>
                  </View>
                </Pressable>
              );
            };

            return (
              <>
                {/* ── Your Plan (primary meds) ── */}
                {primaryMeds.length > 0 && (
                  <>
                    <View style={styles.groupHeader}>
                      <FontAwesome name="check-circle" size={13} color={colors.secondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.groupTitle}>{l.yourPlan}</Text>
                        <Text style={styles.groupDesc}>{l.yourPlanDesc}</Text>
                      </View>
                    </View>
                    {primaryMeds.map((item) => renderMedCard(item, true))}
                  </>
                )}

                {/* ── Alternatives ── */}
                {altMeds.length > 0 && (
                  <>
                    <View style={[styles.groupHeader, { marginTop: 12 }]}>
                      <FontAwesome name="exchange" size={12} color={colors.textTertiary} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>{l.alternatives}</Text>
                        <Text style={styles.groupDesc}>{l.alternativesDesc}</Text>
                      </View>
                    </View>
                    {altMeds.map((item) => renderMedCard(item, false))}
                  </>
                )}

                {/* ── Avoid ── */}
                {avoidMeds.map(({ med, idx }) => (
                  <View key={idx} style={[styles.dosageRow, { opacity: 0.45, borderWidth: 1, borderColor: colors.danger + '30' }]}>
                    <View style={styles.dosageInfo}>
                      <Text style={[styles.dosageMedName, { textDecorationLine: 'line-through' }]}>{med.name}</Text>
                    </View>
                    <View style={[styles.dosageBadge, { backgroundColor: colors.dangerSoft }]}>
                      <Text style={[styles.dosageBadgeText, { color: colors.danger, fontSize: 11 }]}>{l.avoid}</Text>
                    </View>
                  </View>
                ))}
              </>
            );
          })()}

          {/* Interactions */}
          {dangerousInteractions.length > 0 && (
            <View style={[styles.alertBox, { backgroundColor: colors.dangerSoft, borderColor: colors.danger + '30' }]}>
              <FontAwesome name="ban" size={13} color={colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertBoxTitle, { color: colors.danger }]}>{l.doNotCombine}</Text>
                {dangerousInteractions.map((inter: any, i: number) => (
                  <Text key={i} style={[styles.alertBoxText, { color: colors.danger }]}>
                    {inter.drug1} + {inter.drug2} — {inter.description}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {otherInteractions.length > 0 && (
            <View style={[styles.alertBox, { backgroundColor: colors.warningSoft, borderColor: colors.warning + '30' }]}>
              <FontAwesome name="exclamation-triangle" size={12} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertBoxTitle, { color: colors.warning }]}>{l.caution}</Text>
                {otherInteractions.map((inter: any, i: number) => (
                  <Text key={i} style={[styles.alertBoxText, { color: colors.warning }]}>
                    {inter.drug1} + {inter.drug2} — {inter.description}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {scan.interactions.length === 0 && scan.extractedMedications.length > 1 && (
            <View style={[styles.alertBox, { backgroundColor: colors.secondarySoft, borderColor: colors.secondary + '30' }]}>
              <FontAwesome name="check" size={13} color={colors.secondary} />
              <Text style={[styles.alertBoxText, { color: colors.secondary, flex: 1 }]}>{l.noInteractions}</Text>
            </View>
          )}

          {/* Warnings */}
          {medWarnings.length > 0 && (
            <View style={[styles.alertBox, { backgroundColor: colors.warningSoft, borderColor: colors.warning + '30' }]}>
              <FontAwesome name="exclamation-triangle" size={13} color={colors.warning} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={[styles.alertBoxTitle, { color: colors.warning }]}>{l.warnings}</Text>
                {medWarnings.map((mw, i) => (
                  <View key={i} style={{ gap: 2 }}>
                    <Text style={styles.warningMedName}>{mw.name}</Text>
                    {mw.notes.map((note, j) => (
                      <Text key={j} style={styles.warningNote}>• {note}</Text>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Tips from AI */}
          {scan.tips && scan.tips.length > 0 && (
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>{l.tips}</Text>
              {scan.tips.map((tip: string, i: number) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Save selected */}
          {selectedMeds.size > 0 && (
            <View style={styles.saveSection}>
              <Text style={styles.selectedCount}>{l.selectedCount(selectedMeds.size)}</Text>
              <Pressable
                style={({ pressed }) => [styles.saveAllButton, pressed && styles.saveAllButtonPressed, isSaving && { opacity: 0.6 }]}
                onPress={handleSaveAll}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <FontAwesome name="plus" size={12} color={colors.textInverse} />
                )}
                <Text style={styles.saveAllButtonText}>{isSaving ? 'Saving...' : l.addToMeds}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <DoseTimePickerModal
          visible={showTimePicker}
          onConfirm={handleSaveWithSchedule}
          onSkip={handleSaveOnly}
        />

        {/* ═══ AI Explanation (collapsible) ═══ */}
        {scan.explanation && (
          <View style={styles.explanationCard}>
            <Pressable
              style={styles.explanationHeader}
              onPress={() => setShowExplanation(!showExplanation)}
            >
              <View style={styles.explanationIconCircle}>
                <FontAwesome name="lightbulb-o" size={15} color={colors.accent} />
              </View>
              <Text style={styles.explanationTitle}>{l.explanation}</Text>
              <FontAwesome
                name={showExplanation ? 'chevron-up' : 'chevron-down'}
                size={12}
                color={colors.textTertiary}
              />
            </Pressable>
            {showExplanation && (
              <View style={styles.explanationBody}>
                <Markdown style={mdStyles}>
                  {lang === 'sw' ? explanationParts.sw : explanationParts.en}
                </Markdown>
              </View>
            )}
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <FontAwesome name="info-circle" size={13} color={colors.textTertiary} />
          <Text style={styles.disclaimerText}>{l.disclaimer}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createMarkdownStyles(colors: AppColors) {
  return StyleSheet.create({
    body: { fontSize: 14, color: colors.text, lineHeight: 22 },
    heading1: { fontSize: 16, fontWeight: '700' as const, color: colors.text, marginTop: 12, marginBottom: 4 },
    heading2: { fontSize: 15, fontWeight: '700' as const, color: colors.text, marginTop: 10, marginBottom: 4 },
    heading3: { fontSize: 14, fontWeight: '600' as const, color: colors.text, marginTop: 8, marginBottom: 4 },
    strong: { fontWeight: '700' as const, color: colors.text },
    bullet_list: { marginVertical: 2 },
    ordered_list: { marginVertical: 2 },
    list_item: { flexDirection: 'row' as const, marginVertical: 2 },
    bullet_list_icon: { fontSize: 14, color: colors.primary, marginRight: 8 },
    paragraph: { marginVertical: 3 },
  });
}

function createStyles(colors: AppColors, shadows: AppShadows) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 80 },

    // Top bar
    backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', ...shadows.sm },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10 },
    dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, ...shadows.sm },
    dateText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
    langToggle: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 10, padding: 3, ...shadows.sm },
    langBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
    langBtnActive: { backgroundColor: colors.primary },
    langBtnText: { fontSize: 13, fontWeight: '700', color: colors.textTertiary },
    langBtnTextActive: { color: colors.textInverse },

    // Patient info
    patientInfoCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 14, gap: 10, ...shadows.sm },
    patientInfoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    patientInfoLabel: { fontSize: 10, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    patientInfoValue: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 1 },

    // ── Plan card ──
    planCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 14, gap: 14, ...shadows.md },
    planHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    planIconCircle: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    planTitle: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },

    // Recommendation
    recommendationText: { fontSize: 14, fontWeight: '500', color: colors.text, lineHeight: 21 },

    // Dosage list
    groupHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8, marginTop: 4, paddingTop: 4 },
    groupTitle: { fontSize: 13, fontWeight: '700', color: colors.secondary, letterSpacing: -0.2 },
    groupDesc: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
    dosageRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceHover, borderRadius: 10, padding: 12, gap: 12 },
    dosageRowPrimary: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary + '25' },
    medCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.textTertiary, alignItems: 'center', justifyContent: 'center' },
    dosageInfo: { flex: 1, gap: 2 },
    primaryLabel: { fontSize: 10, fontWeight: '700', color: colors.secondary, textTransform: 'uppercase', letterSpacing: 0.4 },
    alternativeLabel: { fontSize: 10, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    dosageMedName: { fontSize: 14, fontWeight: '700', color: colors.text },
    dosageInstruction: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
    dosagePurpose: { fontSize: 12, fontWeight: '500', color: colors.textTertiary, fontStyle: 'italic' },
    dosageMax: { fontSize: 11, fontWeight: '600', color: colors.warning, marginTop: 2 },
    dosageBadge: { backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, minWidth: 48, alignItems: 'center' },
    dosageBadgeText: { fontSize: 14, fontWeight: '800', color: colors.primary },

    // Tips
    tipsSection: { gap: 6 },
    tipsTitle: { fontSize: 12, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.3 },
    tipRow: { flexDirection: 'row', gap: 6 },
    tipBullet: { fontSize: 13, color: colors.primary, lineHeight: 18 },
    tipText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, lineHeight: 18, flex: 1 },

    // Alert boxes (interactions / safe)
    alertBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
    alertBoxTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
    alertBoxText: { fontSize: 12, fontWeight: '500', lineHeight: 17 },

    // Warnings
    warningMedName: { fontSize: 13, fontWeight: '700', color: colors.text },
    warningNote: { fontSize: 12, fontWeight: '500', color: colors.textSecondary, lineHeight: 17, paddingLeft: 4 },

    // Save all
    saveSection: { marginTop: 4, gap: 8 },
    selectedCount: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
    saveAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.secondary, paddingVertical: 12, borderRadius: 10 },
    saveAllButtonPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
    saveAllButtonText: { color: colors.textInverse, fontSize: 14, fontWeight: '700' },

    // ── Explanation (collapsible) ──
    explanationCard: { backgroundColor: colors.card, borderRadius: 16, marginBottom: 14, ...shadows.sm, overflow: 'hidden' },
    explanationHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
    explanationIconCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accentSoft, justifyContent: 'center', alignItems: 'center' },
    explanationTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1, letterSpacing: -0.3 },
    explanationBody: { paddingHorizontal: 16, paddingBottom: 16 },

    // Disclaimer
    disclaimerCard: { flexDirection: 'row', gap: 10, backgroundColor: colors.surfaceHover, borderRadius: 12, padding: 14 },
    disclaimerText: { fontSize: 12, color: colors.textTertiary, lineHeight: 18, flex: 1 },

    // Error
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 40 },
    errorIconCircle: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.dangerSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    errorTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    errorText: { fontSize: 14, color: colors.textSecondary },
  });
}
