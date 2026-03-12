import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  // Push tokens only work on physical devices with a development build,
  // NOT in Expo Go (removed in SDK 53). Wrap everything so it fails
  // gracefully and the app still loads.
  try {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted for notifications');
      return null;
    }

    // projectId is required — pull from app config (expo.extra or EAS)
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.log(
        'No projectId found — push tokens require a development build with EAS configured.',
      );
      return null;
    }

    const token = (
      await Notifications.getExpoPushTokenAsync({ projectId })
    ).data;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(
        'medication-reminders',
        {
          name: 'Medication Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B6B',
        },
      );
    }

    return token;
  } catch (error) {
    console.log('Push notification registration failed (expected in Expo Go):', error);
    return null;
  }
}

export async function scheduleMedicationReminder(
  medicationName: string,
  dosage: string,
  hour: number,
  minute: number,
): Promise<string> {
  if (Platform.OS === 'web') {
    console.log(`[web] Reminder scheduled for ${medicationName} at ${hour}:${minute} (notifications not supported in browser)`);
    return `web-${Date.now()}`;
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time for your medication',
      body: `Take ${medicationName} (${dosage})`,
      sound: true,
      data: { medicationName, dosage },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return id;
}

export async function cancelReminder(notificationId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
