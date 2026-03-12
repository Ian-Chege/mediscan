import type { AppShadows } from "@/constants/Colors";
import { useAuth } from "@/contexts/UserContext";
import { api } from "@/convex/_generated/api";
import { AppColors, useTheme } from "@/hooks/useTheme";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useMemo } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { user, role, signOut } = useAuth();
  const { colors, shadows, isDark, toggleTheme } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, shadows),
    [colors, shadows],
  );

  const pendingOversight = useQuery(api.oversightRequests.myIncoming);
  const respondToOversight = useMutation(api.oversightRequests.respond);

  const handleRespond = async (
    requestId: any,
    response: "accepted" | "rejected",
  ) => {
    try {
      await respondToOversight({ requestId, response });
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Something went wrong.");
    }
  };

  const handleSignOut = () => {
    if (typeof window !== "undefined" && window.confirm) {
      if (window.confirm("Are you sure you want to sign out?")) {
        signOut();
      }
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: signOut },
      ]);
    }
  };

  const isAdmin = role === "admin";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Pressable
            style={styles.themeToggle}
            onPress={toggleTheme}
            accessibilityRole="button"
            accessibilityLabel={
              isDark ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            <FontAwesome
              name={isDark ? "sun-o" : "moon-o"}
              size={18}
              color={colors.primary}
            />
          </Pressable>
        </View>

        {/* User card */}
        <View style={[styles.userCard, shadows.md]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name ?? "U").charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name ?? "User"}</Text>
            <Text style={styles.userEmail}>{user?.email ?? ""}</Text>
          </View>
          {/* Role badge */}
          <View style={[styles.roleBadge, isAdmin && styles.roleBadgeAdmin]}>
            <FontAwesome
              name={isAdmin ? "shield" : "user"}
              size={10}
              color={isAdmin ? colors.accent : colors.primary}
            />
            <Text
              style={[
                styles.roleBadgeText,
                isAdmin && styles.roleBadgeTextAdmin,
              ]}
            >
              {isAdmin ? "Admin" : "Patient"}
            </Text>
          </View>
        </View>

        {/* Admin panel shortcut */}
        {isAdmin && (
          <Pressable
            style={({ pressed }) => [
              styles.adminBtn,
              shadows.sm,
              pressed && styles.adminBtnPressed,
            ]}
            onPress={() => router.push("/admin")}
            accessibilityRole="button"
          >
            <View style={styles.adminBtnLeft}>
              <View style={styles.adminBtnIcon}>
                <FontAwesome name="shield" size={16} color={colors.accent} />
              </View>
              <View>
                <Text style={styles.adminBtnTitle}>Admin Panel</Text>
                <Text style={styles.adminBtnSub}>
                  Manage role requests &amp; patient oversight
                </Text>
              </View>
            </View>
            <FontAwesome
              name="chevron-right"
              size={13}
              color={colors.textTertiary}
            />
          </Pressable>
        )}

        {/* Oversight requests (patients only) */}
        {role === "patient" && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Oversight Requests</Text>
              {(pendingOversight?.length ?? 0) > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {pendingOversight!.length}
                  </Text>
                </View>
              )}
            </View>

            {!pendingOversight || pendingOversight.length === 0 ? (
              <View style={[styles.emptyCard, shadows.sm]}>
                <FontAwesome
                  name="bell-slash-o"
                  size={20}
                  color={colors.textTertiary}
                />
                <Text style={styles.emptyText}>No pending requests</Text>
              </View>
            ) : (
              <FlatList
                data={pendingOversight}
                keyExtractor={(item: any) => item._id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
                renderItem={({ item }: any) => (
                  <View style={[styles.oversightCard, shadows.sm]}>
                    <View style={styles.oversightTop}>
                      <View style={styles.oversightAvatar}>
                        <FontAwesome
                          name="shield"
                          size={16}
                          color={colors.accent}
                        />
                      </View>
                      <View style={styles.oversightInfo}>
                        <Text style={styles.oversightName}>
                          {item.adminName}
                        </Text>
                        <Text style={styles.oversightLabel}>
                          Medical Administrator
                        </Text>
                      </View>
                    </View>
                    {item.note && (
                      <View style={styles.noteBox}>
                        <Text style={styles.noteText}>{item.note}</Text>
                      </View>
                    )}
                    <View style={styles.oversightActions}>
                      <TouchableOpacity
                        style={[styles.declineBtn, shadows.sm]}
                        onPress={() => handleRespond(item._id, "rejected")}
                        activeOpacity={0.7}
                      >
                        <FontAwesome
                          name="times"
                          size={13}
                          color={colors.danger}
                        />
                        <Text style={styles.declineBtnText}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.acceptBtn, shadows.sm]}
                        onPress={() => handleRespond(item._id, "accepted")}
                        activeOpacity={0.7}
                      >
                        <FontAwesome
                          name="check"
                          size={13}
                          color={colors.textInverse}
                        />
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        )}

        {/* Sign out */}
        <Pressable
          style={({ pressed }) => [
            styles.signOutBtn,
            shadows.sm,
            pressed && styles.signOutBtnPressed,
          ]}
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <FontAwesome name="sign-out" size={16} color={colors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors, shadows: AppShadows) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingBottom: 40 },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 20,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.8,
    },
    themeToggle: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.surfaceHover,
      justifyContent: "center",
      alignItems: "center",
    },
    userCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 18,
      marginHorizontal: 20,
      marginBottom: 16,
      gap: 14,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.primarySoft,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.primary,
    },
    userInfo: { flex: 1 },
    userName: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.3,
    },
    userEmail: { fontSize: 13, color: colors.textTertiary, marginTop: 2 },
    roleBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.primarySoft,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    roleBadgeAdmin: { backgroundColor: colors.accentSoft },
    roleBadgeText: { fontSize: 11, fontWeight: "700", color: colors.primary },
    roleBadgeTextAdmin: { color: colors.accent },
    adminBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 20,
      marginBottom: 16,
    },
    adminBtnPressed: { opacity: 0.85 },
    adminBtnLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
    adminBtnIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.accentSoft,
      justifyContent: "center",
      alignItems: "center",
    },
    adminBtnTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
    },
    adminBtnSub: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    section: { marginHorizontal: 20, marginBottom: 16 },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    countBadge: {
      backgroundColor: colors.danger,
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    countBadgeText: { fontSize: 11, fontWeight: "800", color: "#fff" },
    emptyCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 18,
    },
    emptyText: { fontSize: 14, color: colors.textTertiary },
    oversightCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      gap: 12,
    },
    oversightTop: { flexDirection: "row", alignItems: "center", gap: 12 },
    oversightAvatar: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: colors.accentSoft,
      justifyContent: "center",
      alignItems: "center",
    },
    oversightInfo: { flex: 1 },
    oversightName: { fontSize: 15, fontWeight: "700", color: colors.text },
    oversightLabel: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    noteBox: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 12,
    },
    noteText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    oversightActions: { flexDirection: "row", gap: 10 },
    declineBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor: colors.dangerSoft,
    },
    declineBtnText: { fontSize: 14, fontWeight: "700", color: colors.danger },
    acceptBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    acceptBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textInverse,
    },
    signOutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingVertical: 15,
      marginHorizontal: 20,
      marginTop: 8,
    },
    signOutBtnPressed: { opacity: 0.75 },
    signOutText: { fontSize: 15, fontWeight: "700", color: colors.danger },
  });
}
