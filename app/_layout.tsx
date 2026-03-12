import { LightColors } from "@/constants/Colors";
import { useAuth, UserProvider } from "@/contexts/UserContext";
import { ThemeProvider } from "@/hooks/useTheme";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { router, Slot } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

//  Storage adapter
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
        // Lazy require so web bundle never touches expo-secure-store
        const SecureStore = require("expo-secure-store");
        return {
          getItem: (key: string) => SecureStore.getItemAsync(key),
          setItem: (key: string, value: string) =>
            SecureStore.setItemAsync(key, value),
          removeItem: (key: string) => SecureStore.deleteItemAsync(key),
        };
      })();

//  Auth gate — reads auth state and routes accordingly
function AuthGate() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Route based on auth state
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/(auth)/login");
      return;
    }

    if (!user) return; // still loading user record

    // Patient or approved admin → main app
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

//  Root
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
