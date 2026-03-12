import type { AppShadows } from "@/constants/Colors";
import { useUser } from "@/contexts/UserContext";
import { AppColors, useTheme } from "@/hooks/useTheme";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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

  const [task, setTask] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  const todos =
    api && useQuery
      ? useQuery(api.todos.list, userId ? { userId: userId as any } : "skip")
      : undefined;

  const addTodo = api && useMutation ? useMutation(api.todos.add) : null;
  const toggleComplete =
    api && useMutation ? useMutation(api.todos.toggleComplete) : null;
  const removeTodo = api && useMutation ? useMutation(api.todos.remove) : null;

  const handleAdd = useCallback(async () => {
    if (!task.trim() || !userId || !addTodo) return;
    try {
      await addTodo({ userId: userId as any, task: task.trim() });
      setTask("");
    } catch {
      Alert.alert("Error", "Failed to add task.");
    }
  }, [task, userId, addTodo]);

  const handleDelete = useCallback(
    (id: any, taskName: string) => {
      Alert.alert("Remove Task", `Remove "${taskName}"?`, [
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

  const handleToggle = useCallback(
    async (id: any) => {
      try {
        await toggleComplete?.({ id });
      } catch {
        Alert.alert("Error", "Failed to update task.");
      }
    },
    [toggleComplete],
  );

  const filtered = (todos ?? []).filter((t: any) => {
    if (filter === "pending") return !t.completed;
    if (filter === "done") return t.completed;
    return true;
  });

  const pending = (todos ?? []).filter((t: any) => !t.completed).length;
  const done = (todos ?? []).filter((t: any) => t.completed).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>To-Do List</Text>
        <Text style={styles.headerSub}>
          {pending} pending · {done} done
        </Text>
      </View>

      {/* Input Row */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a task e.g. Take Amoxicillin after lunch"
          placeholderTextColor={colors.textTertiary}
          value={task}
          onChangeText={setTask}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
          onPress={handleAdd}
          accessibilityRole="button"
          accessibilityLabel="Add task"
        >
          <FontAwesome name="plus" size={20} color={colors.textInverse} />
        </Pressable>
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
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <FontAwesome
            name="check-square-o"
            size={48}
            color={colors.textTertiary}
            style={{ marginBottom: 16 }}
          />
          <Text style={styles.emptyTitle}>
            {filter === "done" ? "No completed tasks yet" : "No tasks yet"}
          </Text>
          <Text style={styles.emptyMessage}>
            {filter === "done"
              ? "Complete a task and it will appear here"
              : "Add a task above to get started 💊"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: any) => (
            <View style={styles.todoItem}>
              <Pressable
                style={({ pressed }) => [
                  styles.checkbox,
                  item.completed && styles.checkboxDone,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => handleToggle(item._id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.completed }}
              >
                {item.completed && (
                  <FontAwesome
                    name="check"
                    size={12}
                    color={colors.textInverse}
                  />
                )}
              </Pressable>

              <View style={styles.taskTextContainer}>
                <Text
                  style={[
                    styles.taskText,
                    item.completed && styles.taskTextDone,
                  ]}
                >
                  {item.task}
                </Text>
                {item.medicationName && (
                  <Text style={styles.medBadge}>💊 {item.medicationName}</Text>
                )}
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
          )}
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
      paddingBottom: 4,
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
      marginBottom: 16,
    },
    inputRow: {
      flexDirection: "row",
      paddingHorizontal: 20,
      gap: 10,
      marginBottom: 12,
    },
    input: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: colors.text,
      ...shadows.sm,
    },
    addButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      width: 50,
      alignItems: "center",
      justifyContent: "center",
      ...shadows.md,
    },
    addButtonPressed: {
      backgroundColor: colors.primaryDark,
      transform: [{ scale: 0.95 }],
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
    taskTextContainer: {
      flex: 1,
    },
    taskText: {
      fontSize: 15,
      color: colors.text,
      fontWeight: "500",
    },
    taskTextDone: {
      textDecorationLine: "line-through",
      color: colors.textTertiary,
    },
    medBadge: {
      fontSize: 12,
      color: colors.primary,
      marginTop: 3,
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
