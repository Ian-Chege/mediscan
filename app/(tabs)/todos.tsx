import type { AppShadows } from "@/constants/Colors";
import { useUser } from "@/contexts/UserContext";
import { AppColors, useTheme } from "@/hooks/useTheme";
import { formatTime12h } from "@/lib/scheduleCalculator";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cancelReminder } from "@/lib/notifications";
import { SafeAreaView } from "react-native-safe-area-context";

let useMutation: any, useQuery: any, api: any;
try {
  const convexReact = require("convex/react");
  useMutation = convexReact.useMutation;
  useQuery = convexReact.useQuery;
  api = require("@/convex/_generated/api").api;
} catch {
  // Convex not yet set up
}

export default function TodosScreen() {
  const userId = useUser();
  const { colors, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, shadows),
    [colors, shadows],
  );

  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  const today = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const scheduledTodos =
    api && useQuery
      ? useQuery(
          api.todos.listByDate,
          userId ? { userId: userId as any, date: today } : "skip",
        )
      : undefined;

  const toggleScheduled =
    api && useMutation ? useMutation(api.todos.toggleScheduled) : null;
  const removeTodo = api && useMutation ? useMutation(api.todos.remove) : null;

  const handleDelete = useCallback(
    (id: any, taskName: string) => {
      Alert.alert("Remove", `Remove "${taskName}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeTodo?.({ id });
            } catch {
              Alert.alert("Error", "Failed to delete task.");
            }
          },
        },
      ]);
    },
    [removeTodo],
  );

  // Compute isMissed client-side using local time
  const computeIsMissed = useCallback((todo: any): boolean => {
    if (!todo.scheduledTime || !todo.scheduledDate || todo.status !== "pending")
      return false;
    const [h, m] = todo.scheduledTime.split(":").map(Number);
    const scheduled = new Date(
      parseInt(todo.scheduledDate.slice(0, 4)),
      parseInt(todo.scheduledDate.slice(5, 7)) - 1,
      parseInt(todo.scheduledDate.slice(8, 10)),
      h,
      m,
    );
    return Date.now() - scheduled.getTime() > 2 * 60 * 60 * 1000;
  }, []);

  const handleScheduledToggle = useCallback(
    async (item: any) => {
      const missed = computeIsMissed(item);
      if (missed) return;
      try {
        const nextStatus =
          item.status === "pending"
            ? "done"
            : item.status === "done"
              ? "skipped"
              : "pending";
        await toggleScheduled?.({
          id: item._id,
          newStatus: nextStatus,
          isMissed: missed,
        });

        // Cancel pending follow-up notification when dose is marked done
        if (nextStatus === "done" && item.medicationName) {
          const key = `followup:${item.medicationName}`;
          const followUpId = await AsyncStorage.getItem(key);
          if (followUpId) {
            await cancelReminder(followUpId);
            await AsyncStorage.removeItem(key);
          }
        }
      } catch (err: any) {
        Alert.alert("Error", err?.message || "Failed to update task.");
      }
    },
    [toggleScheduled, computeIsMissed],
  );

  // Enrich with client-side isMissed, then filter
  const displayList = useMemo(() => {
    const enriched = (scheduledTodos ?? [])
      .map((t: any) => ({
        ...t,
        isMissed: computeIsMissed(t),
      }))
      .sort((a: any, b: any) =>
        (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? ""),
      );

    if (filter === "pending")
      return enriched.filter((t: any) => !t.completed && !t.isMissed);
    if (filter === "done")
      return enriched.filter((t: any) => t.completed || t.status === "skipped");
    return enriched;
  }, [filter, scheduledTodos, computeIsMissed]);

  const pending = displayList.filter(
    (t: any) => t.status === "pending" && !t.isMissed,
  ).length;
  const done = displayList.filter(
    (t: any) => t.status === "done" || t.status === "skipped",
  ).length;
  const missed = displayList.filter((t: any) => t.isMissed).length;

  // Build subtitle
  const subtitleParts: string[] = [];
  if (pending > 0) subtitleParts.push(`${pending} pending`);
  if (done > 0) subtitleParts.push(`${done} done`);
  if (missed > 0) subtitleParts.push(`${missed} missed`);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Day</Text>
        <Text style={styles.headerSub}>
          {subtitleParts.length > 0
            ? subtitleParts.join(" · ")
            : "No doses scheduled"}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(["all", "pending", "done"] as const).map((f) => (
          <Pressable
            key={f}
            style={({ pressed }) => [
              styles.filterChip,
              filter === f && styles.filterChipActive,
              pressed && styles.filterChipPressed,
            ]}
            onPress={() => setFilter(f)}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f }}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      {displayList.length === 0 ? (
        <View style={styles.empty}>
          <FontAwesome
            name="calendar-check-o"
            size={48}
            color={colors.textTertiary}
            style={{ marginBottom: 16 }}
          />
          <Text style={styles.emptyTitle}>
            {filter === "done"
              ? "No completed doses yet"
              : "No doses scheduled today"}
          </Text>
          <Text style={styles.emptyMessage}>
            {filter === "done"
              ? "Mark a dose as done and it will appear here"
              : "Scan a prescription and save with a schedule to see your doses here"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayList}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: any) => {
            const isMissed = item.isMissed;
            const isSkipped = item.status === "skipped";
            const isDone = item.status === "done";

            return (
              <View
                style={[styles.todoItem, isMissed && styles.todoItemMissed]}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.checkbox,
                    isDone && styles.checkboxDone,
                    isSkipped && styles.checkboxSkipped,
                    isMissed && styles.checkboxMissed,
                    pressed && !isMissed && { opacity: 0.7 },
                  ]}
                  onPress={() => handleScheduledToggle(item)}
                  disabled={isMissed}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isDone }}
                >
                  {isDone && (
                    <FontAwesome
                      name="check"
                      size={12}
                      color={colors.textInverse}
                    />
                  )}
                  {isSkipped && (
                    <FontAwesome
                      name="forward"
                      size={10}
                      color={colors.textInverse}
                    />
                  )}
                </Pressable>

                <View style={styles.taskTextContainer}>
                  <View style={styles.taskTopRow}>
                    <Text
                      style={[
                        styles.taskText,
                        isDone && styles.taskTextDone,
                        isMissed && styles.taskTextMissed,
                      ]}
                    >
                      {item.task}
                    </Text>
                    {isMissed && (
                      <View style={styles.missedBadge}>
                        <Text style={styles.missedBadgeText}>MISSED</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.taskMeta}>
                    {item.scheduledTime && (
                      <Text style={styles.timeBadge}>
                        {formatTime12h(item.scheduledTime)}
                      </Text>
                    )}
                    {item.medicationName && (
                      <Text style={styles.medBadge}>
                        {item.medicationName}
                      </Text>
                    )}
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && { opacity: 0.6 },
                  ]}
                  onPress={() => handleDelete(item._id, item.task)}
                  accessibilityRole="button"
                  accessibilityLabel="Delete task"
                >
                  <FontAwesome name="trash" size={18} color="#ef4444" />
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors, shadows: AppShadows) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.8,
      marginBottom: 4,
    },
    headerSub: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    filterRow: {
      flexDirection: "row",
      paddingHorizontal: 20,
      gap: 8,
      marginBottom: 8,
    },
    filterChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.card,
      alignItems: "center",
      ...shadows.sm,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
    },
    filterChipPressed: {
      transform: [{ scale: 0.96 }],
    },
    filterText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    filterTextActive: {
      color: colors.textInverse,
    },
    list: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 100,
    },
    todoItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      gap: 12,
      ...shadows.sm,
    },
    todoItemMissed: {
      borderWidth: 1,
      borderColor: colors.danger + "30",
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxDone: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkboxSkipped: {
      backgroundColor: colors.textTertiary,
      borderColor: colors.textTertiary,
    },
    checkboxMissed: {
      borderColor: colors.danger,
      opacity: 0.5,
    },
    taskTextContainer: {
      flex: 1,
      gap: 3,
    },
    taskTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    taskText: {
      fontSize: 15,
      color: colors.text,
      fontWeight: "500",
      flexShrink: 1,
    },
    taskTextDone: {
      textDecorationLine: "line-through",
      color: colors.textTertiary,
    },
    taskTextMissed: {
      color: colors.danger,
    },
    taskMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    timeBadge: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.secondary,
    },
    medBadge: {
      fontSize: 12,
      color: colors.primary,
    },
    missedBadge: {
      backgroundColor: colors.dangerSoft,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    missedBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.danger,
    },
    deleteButton: {
      padding: 6,
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    emptyMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
  });
}
