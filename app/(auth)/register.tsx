import type { AppShadows } from "@/constants/Colors";
import { useAuth } from "@/contexts/UserContext";
import { AppColors, useTheme } from "@/hooks/useTheme";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type RoleOption = "patient" | "admin";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { colors, shadows } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, shadows),
    [colors, shadows],
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<RoleOption>("patient");
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Name", "Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Weak Password", "Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password, name.trim(), role);
    } catch (err: any) {
      Alert.alert(
        "Registration Failed",
        err?.message ?? "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <FontAwesome name="arrow-left" size={16} color={colors.text} />
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Join DrugScan today</Text>
          </View>

          {/* Role picker */}
          <Text style={styles.sectionLabel}>I AM A</Text>
          <View style={styles.roleRow}>
            {(["patient", "admin"] as RoleOption[]).map((r) => (
              <Pressable
                key={r}
                style={[
                  styles.roleCard,
                  role === r && styles.roleCardActive,
                  shadows.sm,
                ]}
                onPress={() => setRole(r)}
                accessibilityRole="radio"
                accessibilityState={{ checked: role === r }}
              >
                <View
                  style={[styles.roleIcon, role === r && styles.roleIconActive]}
                >
                  <FontAwesome
                    name={r === "patient" ? "user" : "shield"}
                    size={20}
                    color={role === r ? colors.primary : colors.textTertiary}
                  />
                </View>
                <Text
                  style={[
                    styles.roleLabel,
                    role === r && styles.roleLabelActive,
                  ]}
                >
                  {r === "patient" ? "Patient" : "Medical Admin"}
                </Text>
                <Text style={styles.roleDesc}>
                  {r === "patient"
                    ? "Track my own prescriptions"
                    : "Request oversight of patients"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Fields */}
          <View style={[styles.card, shadows.md]}>
            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <View style={[styles.inputRow, shadows.sm]}>
                <FontAwesome
                  name="user-o"
                  size={14}
                  color={colors.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Jane Doe"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  accessibilityLabel="Full name"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EMAIL</Text>
              <View style={[styles.inputRow, shadows.sm]}>
                <FontAwesome
                  name="envelope-o"
                  size={14}
                  color={colors.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  accessibilityLabel="Email address"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={[styles.inputRow, shadows.sm]}>
                <FontAwesome
                  name="lock"
                  size={14}
                  color={colors.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  accessibilityLabel="Password"
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                >
                  <FontAwesome
                    name={showPassword ? "eye-slash" : "eye"}
                    size={14}
                    color={colors.textTertiary}
                  />
                </Pressable>
              </View>
            </View>

            {/* Confirm password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <View style={[styles.inputRow, shadows.sm]}>
                <FontAwesome
                  name="lock"
                  size={14}
                  color={colors.textTertiary}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={confirmRef}
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat password"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                  accessibilityLabel="Confirm password"
                />
              </View>
            </View>

            {/* Submit */}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && styles.submitBtnPressed,
                loading && styles.submitBtnDisabled,
              ]}
              onPress={handleRegister}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Create account"
            >
              {loading ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Create Account</Text>
              )}
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable onPress={() => router.replace("/(auth)/login")}>
              <Text style={styles.footerLink}> Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors, shadows: AppShadows) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingVertical: 32,
    },
    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.card,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 24,
      ...shadows.sm,
    },
    header: { marginBottom: 28 },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.8,
    },
    subtitle: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 10,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    roleRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
    roleCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 2,
      borderColor: "transparent",
      gap: 6,
    },
    roleCardActive: { borderColor: colors.primary },
    roleIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 4,
    },
    roleIconActive: { backgroundColor: colors.primarySoft },
    roleLabel: { fontSize: 15, fontWeight: "700", color: colors.textSecondary },
    roleLabelActive: { color: colors.primary },
    roleDesc: { fontSize: 12, color: colors.textTertiary, lineHeight: 17 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 24,
    },
    fieldGroup: { marginBottom: 20 },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: 14,
    },
    textareaRow: { alignItems: "flex-start", paddingTop: 14 },
    inputIcon: { marginRight: 10 },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.text,
    },
    textarea: {
      paddingVertical: 0,
      minHeight: 80,
      textAlignVertical: "top",
    },
    hint: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 6,
      paddingHorizontal: 2,
    },
    submitBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 8,
      ...shadows.md,
    },
    submitBtnPressed: {
      backgroundColor: colors.primaryDark,
      transform: [{ scale: 0.98 }],
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: {
      color: colors.textInverse,
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 28,
      marginBottom: 16,
    },
    footerText: { fontSize: 14, color: colors.textSecondary },
    footerLink: { fontSize: 14, color: colors.primary, fontWeight: "700" },
  });
}
