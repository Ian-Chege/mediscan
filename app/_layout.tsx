import { LightColors } from "@/constants/Colors";
import { useAuth, UserProvider } from "@/contexts/UserContext";
import { ThemeProvider } from "@/hooks/useTheme";
import {
  registerForPushNotifications,
  scheduleFollowUpReminder,
  cancelReminder,
} from "@/lib/notifications";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as Notifications from "expo-notifications";
import { router, Slot } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { formatTime12h } from "@/lib/scheduleCalculator";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

// Storage adapter
// SecureStore is native-only — fall back to localStorage on web
const secureStorage =
  Platform.OS === "web"
    ? {
        getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
        setItem: (key: string, value: string) =>
          Promise.resolve(localStorage.setItem(key, value)),
        removeItem: (key: string) =>
          Promise.resolve(localStorage.removeItem(key)),
      }
    : (() => {
        try {
          const SecureStore = require("expo-secure-store");
          return {
            getItem: (key: string) => SecureStore.getItemAsync(key),
            setItem: (key: string, value: string) =>
              SecureStore.setItemAsync(key, value),
            removeItem: (key: string) => SecureStore.deleteItemAsync(key),
          };
        } catch {
          // SecureStore native module unavailable — fall back to AsyncStorage
          const AsyncStorage =
            require("@react-native-async-storage/async-storage").default;
          return {
            getItem: (key: string) => AsyncStorage.getItem(key),
            setItem: (key: string, value: string) =>
              AsyncStorage.setItem(key, value),
            removeItem: (key: string) => AsyncStorage.removeItem(key),
          };
        }
      })();

// Auth gate — reads auth state and routes accordingly
function AuthGate() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const updatePushToken = useMutation(api.users.updatePushToken);

  // Register for push notifications and save token to Convex.
  // Wait for `user` (not just isAuthenticated) to ensure the Convex auth
  // session is fully established before calling the mutation.
  useEffect(() => {
    if (Platform.OS !== "web" && isAuthenticated && user) {
      registerForPushNotifications().then((token) => {
        if (token) {
          updatePushToken({ pushToken: token }).catch((err: any) =>
            console.log("Failed to save push token:", err),
          );
        }
      });

      // When a medication reminder fires, schedule a one-shot follow-up
      // 30 minutes later (in case the user hasn't taken their meds yet).
      notificationListener.current =
        Notifications.addNotificationReceivedListener(async (notification) => {
          const data = notification.request.content.data;
          if (data?.medicationName && !data?.isFollowUp) {
            try {
              const medName = data.medicationName as string;
              const dosage = (data.dosage as string) ?? "";
              const now = new Date();
              const h = now.getHours();
              const m = now.getMinutes();
              const timeDisplay = formatTime12h(
                `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
              );
              const followUpId = await scheduleFollowUpReminder(
                medName,
                dosage,
                timeDisplay,
              );
              // Store follow-up ID so it can be cancelled when dose is marked done
              await AsyncStorage.setItem(
                `followup:${medName}`,
                followUpId,
              );
            } catch (err) {
              console.log("Failed to schedule follow-up:", err);
            }
          }
        });

      responseListener.current =
        Notifications.addNotificationResponseReceivedListener(() => {});

      return () => {
        notificationListener.current?.remove();
        responseListener.current?.remove();
      };
    }
  }, [isAuthenticated, user]);

  // Route based on auth state
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/(auth)/login");
      return;
    }

    if (!user) return;

    router.replace("/(tabs)");
  }, [isAuthenticated, isLoading, user]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: LightColors.background,
        }}
      >
        <ActivityIndicator size="large" color={LightColors.primary} />
      </View>
    );
  }

  return <Slot />;
}

// Root
export default function RootLayout() {
  return (
    <ConvexAuthProvider client={convex} storage={secureStorage}>
      <ThemeProvider>
        <UserProvider>
          <AuthGate />
        </UserProvider>
      </ThemeProvider>
    </ConvexAuthProvider>
  );
}
