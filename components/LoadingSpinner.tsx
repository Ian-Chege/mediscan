import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/Colors';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={message}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  card: {
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: 40,
    paddingVertical: 32,
    borderRadius: 20,
    gap: 16,
  },
  message: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
});
