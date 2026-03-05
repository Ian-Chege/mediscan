import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />;
}
export default function TabLayout() {
  const { colors, isDark } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: -0.1,
        },
        tabBarStyle: {
          borderTopWidth: 0,
          backgroundColor: colors.surface,
          elevation: 0,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.15 : 0.04,
          shadowRadius: 8,
          paddingTop: 4,
          height: 56,
        },
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 17,
          color: colors.text,
          letterSpacing: -0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scan',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="camera" color={color} />,
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: 'My Meds',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="medkit" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: 'Reminders',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="bell" color={color} />,
        }}
      />
      <Tabs.Screen
        name="todos"
        options={{
          title: 'To-Do',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="check-square" color={color} />,
        }}
      />
    </Tabs>
  );
}