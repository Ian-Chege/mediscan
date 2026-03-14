import { useTheme } from '@/hooks/useTheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  onConfirm: (hour: number, minute: number) => void;
  onSkip?: () => void;
  onCancel?: () => void;
  initialHour?: number;
  initialMinute?: number;
};

export function DoseTimePickerModal({ visible, onConfirm, onSkip, onCancel, initialHour, initialMinute }: Props) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const now = new Date();
  const [hourText, setHourText] = useState(String(initialHour ?? now.getHours()));
  const [minuteText, setMinuteText] = useState(
    String(initialMinute ?? now.getMinutes()).padStart(2, '0'),
  );

  const dismiss = onCancel ?? onSkip;

  const handleConfirm = () => {
    const h = Math.max(0, Math.min(23, parseInt(hourText, 10) || 0));
    const m = Math.max(0, Math.min(59, parseInt(minuteText, 10) || 0));
    onConfirm(h, m);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleConfirm}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <FontAwesome name="clock-o" size={24} color={colors.primary} />
          </View>
          <Text style={styles.title}>When will you take your first dose?</Text>
          <Text style={styles.subtitle}>
            We'll space the rest of your doses evenly throughout the day.
          </Text>

          <View style={styles.timeRow}>
            <View style={styles.timeInputGroup}>
              <Text style={styles.timeLabel}>Hour (0-23)</Text>
              <TextInput
                style={styles.timeInput}
                keyboardType="number-pad"
                maxLength={2}
                value={hourText}
                onChangeText={setHourText}
                selectTextOnFocus
              />
            </View>
            <Text style={styles.colon}>:</Text>
            <View style={styles.timeInputGroup}>
              <Text style={styles.timeLabel}>Minute (0-59)</Text>
              <TextInput
                style={styles.timeInput}
                keyboardType="number-pad"
                maxLength={2}
                value={minuteText}
                onChangeText={setMinuteText}
                selectTextOnFocus
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.confirmButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleConfirm}
          >
            <FontAwesome name="calendar-check-o" size={14} color={colors.textInverse} />
            <Text style={styles.confirmText}>Set Schedule</Text>
          </Pressable>

          <Pressable onPress={dismiss} style={styles.skipButton}>
            <Text style={styles.skipText}>{onCancel ? 'Cancel' : 'Just Save Meds'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: any, shadows: any) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      width: '100%',
      maxWidth: 360,
      alignItems: 'center',
      ...shadows.lg,
    },
    iconCircle: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
      lineHeight: 19,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginBottom: 24,
    },
    timeInputGroup: {
      alignItems: 'center',
      gap: 4,
    },
    timeLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
    },
    timeInput: {
      backgroundColor: colors.surfaceHover,
      borderRadius: 12,
      width: 72,
      height: 52,
      textAlign: 'center',
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    colon: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textTertiary,
      marginBottom: 4,
    },
    confirmButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 12,
      width: '100%',
    },
    confirmText: {
      color: colors.textInverse,
      fontSize: 15,
      fontWeight: '700',
    },
    skipButton: {
      marginTop: 12,
      paddingVertical: 8,
    },
    skipText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
