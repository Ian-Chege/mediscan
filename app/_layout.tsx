import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';
import { UserProvider } from '@/contexts/UserContext';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

// Initialize Convex client
// The EXPO_PUBLIC_CONVEX_URL env var is set after running `npx convex dev`
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // TODO: Re-enable when using a development build instead of Expo Go
  // useNotifications();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const content = (
    <>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="results/[id]"
          options={{
            title: 'Scan Results',
            headerBackTitle: 'Back',
            headerStyle: {
              backgroundColor: Colors.background,
            },
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 17,
              color: Colors.text,
            },
            headerTintColor: Colors.primary,
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </>
  );

  if (convex) {
    return (
      <ConvexProvider client={convex}>
        <UserProvider>{content}</UserProvider>
      </ConvexProvider>
    );
  }

  // If Convex is not configured yet, render without provider
  return content;
}
