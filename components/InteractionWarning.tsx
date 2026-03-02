import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme, AppColors } from '@/hooks/useTheme';
import { getSeverityColor } from '@/lib/utils';

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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
            color={hasHighSeverity ? colors.interactionHighText : colors.interactionModerateText}
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
            <FontAwesome name="exchange" size={10} color={colors.textTertiary} />
            <Text style={styles.drugName}>{interaction.drug2}</Text>
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: getSeverityColor(interaction.severity, colors) },
              ]}
            >
              <Text style={styles.severityText}>{interaction.severity}</Text>
            </View>
          </View>
          <Text style={styles.description}>{interaction.description}</Text>
        </View>
      ))}

      <View style={styles.disclaimer}>
        <FontAwesome name="user-md" size={13} color={colors.textSecondary} />
        <Text style={styles.disclaimerText}>
          Please consult your doctor or pharmacist about these interactions.
        </Text>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    containerHigh: {
      backgroundColor: colors.interactionHighBg,
    },
    containerModerate: {
      backgroundColor: colors.interactionModerateBg,
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
      backgroundColor: colors.interactionHighIconBg,
    },
    iconCircleModerate: {
      backgroundColor: colors.interactionModerateIconBg,
    },
    headerText: {
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    headerTextHigh: {
      color: colors.interactionHighText,
    },
    headerTextModerate: {
      color: colors.interactionModerateText,
    },
    interactionItem: {
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.interactionBorder,
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
      color: colors.text,
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
      color: colors.interactionDescText,
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
      color: colors.textSecondary,
      fontStyle: 'italic',
      flex: 1,
    },
  });
}
