import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';
import { useTheme, AppColors } from '@/hooks/useTheme';

interface CameraCaptureProps {
  onImageCaptured: (base64: string) => void;
  disabled?: boolean;
}

export function CameraCapture({ onImageCaptured, disabled }: CameraCaptureProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
        style={[styles.scanButton, disabled && styles.scanButtonDisabled]}
        onPress={() => pickImage(true)}
        disabled={disabled}
      >
        <View style={styles.scanButtonInner}>
          <FontAwesome name="camera" size={40} color="#FFFFFF" />
          <Text style={styles.scanButtonText}>Scan Prescription</Text>
        </View>
      </Pressable>

      <Text style={styles.orText}>or</Text>

      <Pressable
        style={[styles.galleryButton, disabled && styles.galleryButtonDisabled]}
        onPress={() => pickImage(false)}
        disabled={disabled}
      >
        <FontAwesome name="image" size={18} color={Colors.primary} />
        <Text style={styles.galleryButtonText}>Select from Gallery</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    scanButton: {
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: Colors.primaryDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    scanButtonDisabled: {
      opacity: 0.5,
    },
    scanButtonInner: {
      alignItems: 'center',
      gap: 12,
    },
    scanButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    orText: {
      marginVertical: 16,
      fontSize: 14,
      color: colors.textSecondary,
    },
    galleryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors.primary,
    },
    galleryButtonDisabled: {
      opacity: 0.5,
    },
    galleryButtonText: {
      fontSize: 15,
      color: Colors.primary,
      fontWeight: '500',
    },
  });
}
