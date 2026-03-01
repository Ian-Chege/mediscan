import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { getSeverityColor } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

interface Interaction {
  drug1: string;
  drug2: string;
  severity: string;
  description: string;
}

interface InteractionWarningProps {
  interactions: Interaction[];
}

export function InteractionWarning({ interactions }: InteractionWarningProps) {
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(isDark), [isDark]);
  if (interactions.length === 0) return null;

  const hasHighSeverity = interactions.some((i) => i.severity === 'high');

  return (
    <View
      style={[
        styles.container,
        hasHighSeverity ? styles.containerHigh : styles.containerModerate,
      ]}
    >
      <View style={styles.header}>
        <FontAwesome
          name="exclamation-triangle"
          size={20}
          color={hasHighSeverity ? '#991B1B' : '#92400E'}
        />
        <Text
          style={[
            styles.headerText,
            hasHighSeverity ? styles.headerTextHigh : styles.headerTextModerate,
          ]}
        >
          Drug Interaction{interactions.length > 1 ? 's' : ''} Found
        </Text>
      </View>

      {interactions.map((interaction, index) => (
        <View key={index} style={styles.interactionItem}>
          <View style={styles.drugPair}>
            <Text style={styles.drugName}>{interaction.drug1}</Text>
            <FontAwesome name="exchange" size={12} color="#6B7280" />
            <Text style={styles.drugName}>{interaction.drug2}</Text>
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: getSeverityColor(interaction.severity) },
              ]}
            >
              <Text style={styles.severityText}>{interaction.severity}</Text>
            </View>
          </View>
          <Text style={styles.description}>{interaction.description}</Text>
        </View>
      ))}

      <View style={styles.disclaimer}>
        <FontAwesome name="user-md" size={14} color="#6B7280" />
        <Text style={styles.disclaimerText}>
          Please consult your doctor or pharmacist about these interactions.
        </Text>
      </View>
    </View>
  );
}

function createStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
    },
    containerHigh: {
      backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
      borderColor: isDark ? '#7F1D1D' : '#FECACA',
    },
    containerModerate: {
      backgroundColor: isDark ? '#451A03' : '#FFFBEB',
      borderColor: isDark ? '#78350F' : '#FDE68A',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    headerText: {
      fontSize: 16,
      fontWeight: '700',
    },
    headerTextHigh: {
      color: isDark ? '#FCA5A5' : '#991B1B',
    },
    headerTextModerate: {
      color: isDark ? '#FDE68A' : '#92400E',
    },
    interactionItem: {
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    },
    drugPair: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
      flexWrap: 'wrap',
    },
    drugName: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#F1F5F9' : '#1F2937',
    },
    severityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    severityText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
      textTransform: 'uppercase',
    },
    description: {
      fontSize: 13,
      color: isDark ? '#94A3B8' : '#4B5563',
      lineHeight: 18,
    },
    disclaimer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
      paddingTop: 8,
    },
    disclaimerText: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#6B7280',
      fontStyle: 'italic',
      flex: 1,
    },
  });
}
