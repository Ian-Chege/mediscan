import { StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { getSeverityColor } from '@/lib/utils';
import { Colors } from '@/constants/Colors';

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
  if (interactions.length === 0) return null;

  const hasHighSeverity = interactions.some((i) => i.severity === 'high');

  return (
    <View
      style={[
        styles.container,
        hasHighSeverity ? styles.containerHigh : styles.containerModerate,
      ]}
      accessibilityRole="alert"
      accessibilityLabel={`${interactions.length} drug interaction${interactions.length > 1 ? 's' : ''} found`}
    >
      <View style={styles.header}>
        <View style={[styles.iconCircle, hasHighSeverity ? styles.iconCircleHigh : styles.iconCircleModerate]}>
          <FontAwesome
            name="exclamation-triangle"
            size={16}
            color={hasHighSeverity ? '#991B1B' : '#92400E'}
          />
        </View>
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
            <FontAwesome name="exchange" size={10} color={Colors.textTertiary} />
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
        <FontAwesome name="user-md" size={13} color={Colors.textSecondary} />
        <Text style={styles.disclaimerText}>
          Please consult your doctor or pharmacist about these interactions.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  containerHigh: {
    backgroundColor: '#FEF2F2',
  },
  containerModerate: {
    backgroundColor: '#FFFBEB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleHigh: {
    backgroundColor: '#FECACA',
  },
  iconCircleModerate: {
    backgroundColor: '#FDE68A',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerTextHigh: {
    color: '#991B1B',
  },
  headerTextModerate: {
    color: '#92400E',
  },
  interactionItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  drugPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  drugName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
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
    color: Colors.textSecondary,
    fontStyle: 'italic',
    flex: 1,
  },
});
