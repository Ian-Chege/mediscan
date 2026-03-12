import { useUserRole } from "@/contexts/UserContext";
import { api } from "@/convex/_generated/api";
import { useTheme } from "@/hooks/useTheme";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useQuery } from "convex/react";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />;
}

// Badge shown on the Profile tab when there are pending oversight requests
function ProfileTabIcon({ color }: { color: string }) {
  const role = useUserRole();
  const pendingOversight = useQuery(api.oversightRequests.myIncoming);
  const hasBadge = role === "patient" && (pendingOversight?.length ?? 0) > 0;

  return (
    <View>
      <TabBarIcon name="user" color={color} />
      {hasBadge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {pendingOversight!.length > 9 ? "9+" : pendingOversight!.length}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
});

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: -0.1,
        },
        tabBarStyle: {
          borderTopWidth: 0,
          backgroundColor: colors.surface,
          elevation: 0,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.15 : 0.04,
          shadowRadius: 8,
          paddingTop: 6,
          paddingBottom: 16,
          height: 72,
        },
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTitleStyle: {
          fontWeight: "800",
          fontSize: 17,
          color: colors.text,
          letterSpacing: -0.3,
        },
      }}
    >
      {/* ── Existing tabs (completely unchanged) ── */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Scan",
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="camera" color={color} />,
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: "My Meds",
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="medkit" color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="calendar" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: "Reminders",
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="bell" color={color} />,
        }}
      />
      <Tabs.Screen
        name="todos"
        options={{
          title: "To-Do",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="check-square" color={color} />
          ),
        }}
      />

      {/* ── New: Profile tab (oversight notifications + account) ── */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ color }) => <ProfileTabIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
