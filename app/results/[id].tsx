import { useCallback, useMemo, useState } from 'react';
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
import { LoadingSpinner } from '@/components/LoadingSpinner';
import Markdown from 'react-native-markdown-display';
import { useTheme, AppColors } from '@/hooks/useTheme';
import type { AppShadows } from '@/constants/Colors';
import { formatDateTime } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';

let useMutation: any, useQuery: any, api: any;
try {
  const convexReact = require('convex/react');
  useMutation = convexReact.useMutation;
  useQuery = convexReact.useQuery;
  api = require('@/convex/_generated/api').api;
} catch {}

const labels = {
  en: {
    medsFound: 'Medications Found',
    addToMeds: 'Save to My Meds',
    added: 'Added',
    addedMsg: (name: string) => `${name} saved to your medications.`,
    dosage: 'Dosage',
    frequency: 'How often',
    explanation: 'What You Should Know',
    interactions: 'Interactions',
    interactionWarning: 'These medications may interact:',
    condition: 'Your condition',
    disclaimer:
      'For information only — always talk to your doctor before changing your medication.',
    scanNotFound: 'Scan not found',
    scanDeleted: 'This scan may have been deleted',
    high: 'High risk',
    moderate: 'Caution',
    low: 'Low risk',
    ageRestriction: 'Age restriction',
    allergyWarning: 'Allergy warning',
  },
  sw: {
    medsFound: 'Dawa Zilizopatikana',
    addToMeds: 'Hifadhi kwenye Dawa Zangu',
    added: 'Imeongezwa',
    addedMsg: (name: string) => `${name} imehifadhiwa kwenye dawa zako.`,
    dosage: 'Kipimo',
    frequency: 'Mara ngapi',
    explanation: 'Unachopaswa Kujua',
    interactions: 'Mwingiliano wa Dawa',
    interactionWarning: 'Dawa hizi zinaweza kuathiriana:',
    condition: 'Hali yako',
    disclaimer:
      'Kwa taarifa tu — daima ongea na daktari wako kabla ya kubadilisha dawa yako.',
    scanNotFound: 'Skani haijapatikana',
    scanDeleted: 'Skani hii inaweza kuwa imefutwa',
    high: 'Hatari kubwa',
    moderate: 'Tahadhari',
    low: 'Hatari ndogo',
    ageRestriction: 'Kikwazo cha umri',
    allergyWarning: 'Onyo la mzio',
  },
};

type Lang = 'en' | 'sw';

type ConditionMatch = {
  drug: string;
  match: 'yes' | 'no' | 'partial';
  reason_en: string;
  reason_sw: string;
};

type AgeRestriction = {
  severity: 'high' | 'moderate' | 'low';
  text_en: string;
  text_sw: string;
};

type AllergyRestriction = {
  allergen: string;
  text_en: string;
  text_sw: string;
};

type MedicationSafety = {
  index: number;
  ageRestrictions: AgeRestriction[];
  allergyRestrictions: AllergyRestriction[];
};

function parseExplanation(raw: string): {
  en: string;
  sw: string;
  conditionMatches: ConditionMatch[];
  medicationSafety: MedicationSafety[];
} {
  try {
    const parsed = JSON.parse(raw);
    if (parsed.en && parsed.sw) {
      return {
        en: parsed.en,
        sw: parsed.sw,
        conditionMatches: parsed.conditionMatches || [],
        medicationSafety: parsed.medicationSafety || [],
      };
    }
  } catch {
    // Not JSON — legacy format or plain text
  }
  const marker = '---SWAHILI---';
  const idx = raw.indexOf(marker);
  if (idx !== -1) {
    return {
      en: raw.substring(0, idx).trim(),
      sw: raw.substring(idx + marker.length).trim(),
      conditionMatches: [],
      medicationSafety: [],
    };
  }
  return { en: raw, sw: raw, conditionMatches: [], medicationSafety: [] };
}

function getSeverityInfo(severity: string, lang: Lang, colors: AppColors) {
  const l = labels[lang];
  switch (severity) {
    case 'high':
      return { label: l.high, color: colors.danger, bg: colors.dangerSoft, icon: 'exclamation-circle' as const };
    case 'moderate':
      return { label: l.moderate, color: colors.warning, bg: colors.warningSoft, icon: 'exclamation-triangle' as const };
    default:
      return { label: l.low, color: colors.secondary, bg: colors.secondarySoft, icon: 'info-circle' as const };
  }
}

export default function ScanResultsScreen() {
  const userId = useUser();
  const { colors, shadows } = useTheme();
  const [lang, setLang] = useState<Lang>('en');
  const l = labels[lang];
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);
  const mdStyles = useMemo(() => createMarkdownStyles(colors), [colors]);
  const { id, data } = useLocalSearchParams<{ id: string; data?: string }>();

  const isLocal = id === 'local';

  const localScan = useMemo(() => {
    if (!isLocal || !data) return null;
    try {
      return JSON.parse(data as string);
    } catch {
      return null;
    }
  }, [isLocal, data]);

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
        Alert.alert(l.added, l.addedMsg(med.name));
      } catch {
        Alert.alert('Error', 'Failed to add medication.');
      }
    },
    [userId, addMedication, l],
  );

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

  const explanationParts = parseExplanation(scan.explanation ?? '');

  // Build condition match map by drug name (fuzzy)
  const conditionMatchMap = new Map<string, ConditionMatch>();
  for (const cm of explanationParts.conditionMatches) {
    conditionMatchMap.set(cm.drug.toLowerCase(), cm);
  }
  function getMatchForMed(medName: string): ConditionMatch | undefined {
    const lower = medName.toLowerCase();
    if (conditionMatchMap.has(lower)) return conditionMatchMap.get(lower);
    for (const [key, val] of conditionMatchMap) {
      if (lower.includes(key) || key.includes(lower)) return val;
    }
    return undefined;
  }

  // Safety info is looked up by array index — no name matching needed
  function getSafetyForIndex(index: number): MedicationSafety | undefined {
    return explanationParts.medicationSafety.find((s) => s.index === index);
  }

  function getMatchBadge(match: ConditionMatch) {
    const reason = lang === 'sw' ? match.reason_sw : match.reason_en;
    switch (match.match) {
      case 'yes':
        return { icon: 'check-circle' as const, color: colors.secondary, bg: colors.secondarySoft, reason };
      case 'no':
        return { icon: 'times-circle' as const, color: colors.danger, bg: colors.dangerSoft, reason };
      case 'partial':
        return { icon: 'exclamation-circle' as const, color: colors.warning, bg: colors.warningSoft, reason };
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Language toggle + date */}
        <View style={styles.topBar}>
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

        {/* Condition badge */}
        {scan.condition && (
          <View style={styles.conditionBadge}>
            <FontAwesome name="heartbeat" size={14} color={colors.accent} />
            <Text style={styles.conditionLabel}>{l.condition}:</Text>
            <Text style={styles.conditionValue}>{scan.condition}</Text>
          </View>
        )}

        {/* Interaction warnings — simplified */}
        {scan.interactions.length > 0 && (
          <View style={styles.interactionsCard}>
            <View style={styles.interactionsHeader}>
              <FontAwesome name="exclamation-triangle" size={16} color={colors.danger} />
              <Text style={styles.interactionsTitle}>{l.interactions}</Text>
            </View>
            <Text style={styles.interactionsSubtext}>{l.interactionWarning}</Text>
            {scan.interactions.map((inter: any, i: number) => {
              const sev = getSeverityInfo(inter.severity, lang, colors);
              return (
                <View key={i} style={[styles.interactionRow, { backgroundColor: sev.bg }]}>
                  <FontAwesome name={sev.icon} size={14} color={sev.color} />
                  <View style={styles.interactionInfo}>
                    <Text style={styles.interactionDrugs}>
                      {inter.drug1} + {inter.drug2}
                    </Text>
                    <Text style={[styles.interactionSeverity, { color: sev.color }]}>
                      {sev.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Medications — clean cards */}
        <Text style={styles.sectionTitle}>
          {l.medsFound} ({scan.extractedMedications.length})
        </Text>

        {scan.extractedMedications.map(
          (med: { name: string; dosage: string; frequency: string; confidence?: string }, index: number) => {
            const match = scan.condition ? getMatchForMed(med.name) : undefined;
            const badge = match ? getMatchBadge(match) : undefined;
            const safety = getSafetyForIndex(index);
            return (
            <View key={index} style={styles.medCard}>
              <View style={styles.medIconCircle}>
                <FontAwesome name="medkit" size={16} color={colors.primary} />
              </View>
              <View style={styles.medInfo}>
                <Text style={styles.medName}>{med.name}</Text>
                {badge && (
                  <View style={[styles.matchBadge, { backgroundColor: badge.bg }]}>
                    <FontAwesome name={badge.icon} size={14} color={badge.color} />
                    <Text style={[styles.matchBadgeText, { color: badge.color }]}>{badge.reason}</Text>
                  </View>
                )}
                {safety?.ageRestrictions?.map((r, i) => (
                  <View key={`age-${i}`} style={[styles.safetyCard, {
                    backgroundColor: r.severity === 'high' ? colors.dangerSoft : colors.warningSoft,
                    borderColor: r.severity === 'high' ? colors.danger + '40' : colors.warning + '40',
                  }]}>
                    <View style={styles.safetyCardHeader}>
                      <FontAwesome
                        name="ban"
                        size={13}
                        color={r.severity === 'high' ? colors.danger : colors.warning}
                      />
                      <Text style={[styles.safetyCardLabel, {
                        color: r.severity === 'high' ? colors.danger : colors.warning,
                      }]}>
                        {l.ageRestriction}
                      </Text>
                    </View>
                    <Text style={[styles.safetyCardText, {
                      color: r.severity === 'high' ? colors.danger : colors.warning,
                    }]}>
                      {lang === 'sw' ? r.text_sw : r.text_en}
                    </Text>
                  </View>
                ))}
                {safety?.allergyRestrictions?.map((r, i) => (
                  <View key={`allergy-${i}`} style={[styles.safetyCard, {
                    backgroundColor: colors.dangerSoft,
                    borderColor: colors.danger + '40',
                  }]}>
                    <View style={styles.safetyCardHeader}>
                      <FontAwesome name="exclamation-triangle" size={13} color={colors.danger} />
                      <Text style={[styles.safetyCardLabel, { color: colors.danger }]}>
                        {l.allergyWarning}: {r.allergen}
                      </Text>
                    </View>
                    <Text style={[styles.safetyCardText, { color: colors.danger }]}>
                      {lang === 'sw' ? r.text_sw : r.text_en}
                    </Text>
                  </View>
                ))}
                <View style={styles.medDetailsRow}>
                  <View style={styles.medDetail}>
                    <Text style={styles.medDetailLabel}>{l.dosage}</Text>
                    <Text style={styles.medDetailValue}>{med.dosage}</Text>
                  </View>
                  <View style={styles.medDetailDivider} />
                  <View style={styles.medDetail}>
                    <Text style={styles.medDetailLabel}>{l.frequency}</Text>
                    <Text style={styles.medDetailValue}>{med.frequency}</Text>
                  </View>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
                  onPress={() => handleAddToMeds(med)}
                >
                  <FontAwesome name="plus" size={11} color={colors.textInverse} />
                  <Text style={styles.addButtonText}>{l.addToMeds}</Text>
                </Pressable>
              </View>
            </View>
            );
          },
        )}

        {/* AI Explanation — simplified */}
        {scan.explanation && (
          <View style={styles.explanationCard}>
            <View style={styles.explanationHeader}>
              <View style={styles.explanationIconCircle}>
                <FontAwesome name="lightbulb-o" size={16} color={colors.accent} />
              </View>
              <Text style={styles.explanationTitle}>{l.explanation}</Text>
            </View>
            <Markdown style={mdStyles}>
              {lang === 'sw' ? explanationParts.sw : explanationParts.en}
            </Markdown>
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
    body: {
      fontSize: 15,
      color: colors.text,
      lineHeight: 24,
    },
    heading1: {
      fontSize: 17,
      fontWeight: '700' as const,
      color: colors.text,
      marginTop: 14,
      marginBottom: 6,
    },
    heading2: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
      marginTop: 12,
      marginBottom: 4,
    },
    heading3: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: colors.text,
      marginTop: 10,
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
      marginVertical: 3,
    },
    bullet_list_icon: {
      fontSize: 15,
      color: colors.primary,
      marginRight: 8,
    },
    paragraph: {
      marginVertical: 4,
    },
  });
}

function createStyles(colors: AppColors, shadows: AppShadows) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingBottom: 40,
    },

    // ── Top bar ──
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    dateBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      ...shadows.sm,
    },
    dateText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    langToggle: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 3,
      ...shadows.sm,
    },
    langBtn: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 8,
    },
    langBtnActive: {
      backgroundColor: colors.primary,
    },
    langBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textTertiary,
    },
    langBtnTextActive: {
      color: colors.textInverse,
    },

    // ── Condition ──
    conditionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      marginBottom: 14,
    },
    conditionLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    conditionValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '700',
      flex: 1,
    },

    // ── Interactions ──
    interactionsCard: {
      backgroundColor: colors.dangerSoft,
      borderRadius: 14,
      padding: 16,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: colors.danger + '20',
    },
    interactionsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    interactionsTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.danger,
    },
    interactionsSubtext: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 10,
    },
    interactionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 10,
      marginTop: 6,
    },
    interactionInfo: {
      flex: 1,
    },
    interactionDrugs: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    interactionSeverity: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },

    // ── Medications ──
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
      letterSpacing: -0.3,
    },
    medCard: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      gap: 14,
      ...shadows.sm,
    },
    medIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },
    medInfo: {
      flex: 1,
    },
    medName: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.3,
      marginBottom: 8,
    },
    matchBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      marginBottom: 8,
    },
    matchBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    safetyCard: {
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 8,
      gap: 4,
    },
    safetyCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    safetyCardLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    safetyCardText: {
      fontSize: 13,
      fontWeight: '500',
      lineHeight: 18,
    },
    medDetailsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceHover,
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
    },
    medDetail: {
      flex: 1,
      alignItems: 'center',
    },
    medDetailLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    medDetailValue: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    medDetailDivider: {
      width: 1,
      height: 20,
      backgroundColor: colors.border,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.secondary,
      paddingVertical: 10,
      borderRadius: 10,
    },
    addButtonPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },
    addButtonText: {
      color: colors.textInverse,
      fontSize: 13,
      fontWeight: '700',
    },

    // ── Explanation ──
    explanationCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 18,
      marginTop: 8,
      marginBottom: 14,
      ...shadows.sm,
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
      backgroundColor: colors.accentSoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    explanationTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.3,
    },

    // ── Disclaimer ──
    disclaimerCard: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: colors.surfaceHover,
      borderRadius: 12,
      padding: 14,
    },
    disclaimerText: {
      fontSize: 12,
      color: colors.textTertiary,
      lineHeight: 18,
      flex: 1,
    },

    // ── Error ──
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      padding: 40,
    },
    errorIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: colors.dangerSoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    errorText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
  });
}
