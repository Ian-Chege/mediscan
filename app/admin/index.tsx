import type { AppShadows } from "@/constants/Colors";
import { useAuth } from "@/contexts/UserContext";
import { api } from "@/convex/_generated/api";
import { AppColors, useTheme } from "@/hooks/useTheme";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Tab = "patients" | "oversight";

export default function AdminScreen() {
  const { user } = useAuth();
  const { colors, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, shadows),
    [colors, shadows],
  );

  const [tab, setTab] = useState<Tab>("patients");
  const [search, setSearch] = useState("");

  const allPatients = useQuery(api.users.listPatients);
  const myOversightPatients = useQuery(api.oversightRequests.myPatients);

  const sendOversight = useMutation(api.oversightRequests.send);
  const revokeOversight = useMutation(api.oversightRequests.revoke);

  const handleSendOversight = async (patientId: any, name: string) => {
    try {
      await sendOversight({ patientId });
      Alert.alert("Sent", `Oversight request sent to ${name}.`);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Something went wrong.");
    }
  };

  const handleRevoke = (requestId: any, name: string) => {
    Alert.alert("Revoke Oversight", `Remove oversight of ${name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke",
        style: "destructive",
        onPress: async () => {
          try {
            await revokeOversight({ requestId });
          } catch (err: any) {
            Alert.alert("Error", err?.message ?? "Something went wrong.");
          }
        },
      },
    ]);
  };

  const oversightPatientIds = new Set(
    (myOversightPatients ?? []).map((p: any) => p.patientId),
  );

  const filteredPatients = (allPatients ?? []).filter(
    (p: any) =>
      (p.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "patients", label: "Patients", icon: "users" },
    { key: "oversight", label: "My Patients", icon: "eye" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={[styles.backBtn, shadows.sm]}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={16} color={colors.text} />
        </Pressable>
        <View>
          <Text style={styles.title}>Admin Panel</Text>
          <Text style={styles.subtitle}>{user?.name}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <FontAwesome
              name={t.icon as any}
              size={14}
              color={tab === t.key ? colors.primary : colors.textTertiary}
            />
            <Text
              style={[styles.tabText, tab === t.key && styles.tabTextActive]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── All Patients ── */}
      {tab === "patients" && (
        <>
          <View style={styles.searchWrap}>
            <View style={[styles.searchBox, shadows.sm]}>
              <FontAwesome
                name="search"
                size={13}
                color={colors.textTertiary}
                style={{ marginRight: 10 }}
              />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search patients..."
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>
          <FlatList
            data={filteredPatients}
            keyExtractor={(item: any) => item._id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <FontAwesome
                  name="users"
                  size={28}
                  color={colors.textTertiary}
                />
                <Text style={styles.emptyText}>No patients found</Text>
              </View>
            }
            renderItem={({ item }: any) => {
              const isOverseen = oversightPatientIds.has(item._id);
              return (
                <View style={[styles.patientCard, shadows.sm]}>
                  <View style={styles.patientAvatar}>
                    <Text style={styles.patientAvatarText}>
                      {(item.name ?? "U").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>
                      {item.name ?? "Unknown"}
                    </Text>
                    <Text style={styles.patientEmail}>{item.email ?? ""}</Text>
                  </View>
                  {isOverseen ? (
                    <View style={styles.overseeingBadge}>
                      <FontAwesome
                        name="eye"
                        size={10}
                        color={colors.primary}
                      />
                      <Text style={styles.overseeingText}>Overseeing</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.oversightBtn}
                      onPress={() =>
                        handleSendOversight(item._id, item.name ?? "Patient")
                      }
                      activeOpacity={0.7}
                    >
                      <FontAwesome
                        name="eye"
                        size={11}
                        color={colors.primary}
                      />
                      <Text style={styles.oversightBtnText}>Oversee</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />
        </>
      )}

      {/* ── My Oversight Patients ── */}
      {tab === "oversight" && (
        <FlatList
          data={myOversightPatients ?? []}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <FontAwesome
                name="eye-slash"
                size={28}
                color={colors.textTertiary}
              />
              <Text style={styles.emptyText}>
                Not overseeing any patients yet.{"\n"}
                Go to Patients tab to send requests.
              </Text>
            </View>
          }
          renderItem={({ item }: any) => (
            <TouchableOpacity
              style={[styles.patientCard, shadows.sm]}
              onPress={() => router.push(`/admin/${item.patientId}`)}
              activeOpacity={0.8}
            >
              <View style={styles.patientAvatar}>
                <Text style={styles.patientAvatarText}>
                  {(item.patientName ?? "U").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{item.patientName}</Text>
                <Text style={styles.patientEmail}>{item.patientEmail}</Text>
              </View>
              <TouchableOpacity
                style={styles.revokeBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  handleRevoke(item._id, item.patientName);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.revokeBtnText}>Revoke</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors, shadows: AppShadows) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
      gap: 14,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    subtitle: { fontSize: 13, color: colors.textSecondary },
    tabRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 16,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.card,
    },
    tabActive: { backgroundColor: colors.primarySoft },
    tabText: { fontSize: 11, fontWeight: "600", color: colors.textTertiary },
    tabTextActive: { color: colors.primary },
    tabBadge: {
      backgroundColor: colors.danger,
      borderRadius: 7,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    tabBadgeText: { fontSize: 9, fontWeight: "800", color: "#fff" },
    list: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
    empty: { alignItems: "center", paddingTop: 60, gap: 12 },
    emptyText: {
      fontSize: 14,
      color: colors.textTertiary,
      textAlign: "center",
      lineHeight: 20,
    },
    searchWrap: { paddingHorizontal: 16, marginBottom: 12 },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 14,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    patientCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      gap: 12,
    },
    patientAvatar: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      justifyContent: "center",
      alignItems: "center",
    },
    patientAvatarText: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.primary,
    },
    patientInfo: { flex: 1 },
    patientName: { fontSize: 14, fontWeight: "700", color: colors.text },
    patientEmail: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    oversightBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.primarySoft,
      borderRadius: 10,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    oversightBtnText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.primary,
    },
    overseeingBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.primarySoft,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    overseeingText: { fontSize: 11, fontWeight: "700", color: colors.primary },
    revokeBtn: {
      backgroundColor: colors.dangerSoft,
      borderRadius: 10,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    revokeBtnText: { fontSize: 12, fontWeight: "700", color: colors.danger },
  });
}
