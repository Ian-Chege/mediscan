import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Shadows } from '@/constants/Colors';

interface CameraCaptureProps {
  onImageCaptured: (base64: string) => void;
  disabled?: boolean;
}

export function CameraCapture({ onImageCaptured, disabled }: CameraCaptureProps) {
  const pickImage = async (useCamera: boolean) => {
    try {
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Permission needed',
            'Camera permission is required to scan prescriptions.',
          );
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            base64: true,
          });

      if (!result.canceled && result.assets[0].base64) {
        onImageCaptured(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture image. Please try again.');
      console.error('Image capture error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          styles.cameraCard,
          disabled && styles.cardDisabled,
          pressed && styles.cardPressed,
        ]}
        onPress={() => pickImage(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Take a photo of your prescription"
      >
        <View style={styles.iconCircle}>
          <FontAwesome name="camera" size={22} color={Colors.primary} />
        </View>
        <Text style={styles.cardTitle}>Camera</Text>
        <Text style={styles.cardSubtitle}>Take a photo</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.card,
          styles.galleryCard,
          disabled && styles.cardDisabled,
          pressed && styles.cardPressed,
        ]}
        onPress={() => pickImage(false)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Select a prescription image from gallery"
      >
        <View style={[styles.iconCircle, styles.iconCircleAccent]}>
          <FontAwesome name="image" size={22} color={Colors.accent} />
        </View>
        <Text style={styles.cardTitle}>Gallery</Text>
        <Text style={styles.cardSubtitle}>Choose image</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: Colors.card,
    ...Shadows.md,
  },
  cameraCard: {},
  galleryCard: {},
  cardDisabled: {
    opacity: 0.5,
  },
  cardPressed: {
    backgroundColor: Colors.surfaceHover,
    transform: [{ scale: 0.97 }],
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircleAccent: {
    backgroundColor: Colors.accentSoft,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
