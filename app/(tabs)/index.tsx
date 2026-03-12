import { CameraCapture } from "@/components/CameraCapture";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import type { AppShadows } from "@/constants/Colors";
import { useUser, useUserRole } from "@/contexts/UserContext";
import { AppColors, useTheme } from "@/hooks/useTheme";
import { formatDateTime } from "@/lib/utils";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Convex hooks — imported conditionally once Convex is configured
let useAction: any, useMutation: any, useQuery: any, api: any;
try {
  const convexReact = require("convex/react");
  useAction = convexReact.useAction;
  useMutation = convexReact.useMutation;
  useQuery = convexReact.useQuery;
  api = require("@/convex/_generated/api").api;
} catch {
  // Convex not yet set up
}

export default function ScanScreen() {
  const userId = useUser();
  const role = useUserRole();
  const { colors, shadows, isDark, toggleTheme } = useTheme();
  const styles = useMemo(
    () => createStyles(colors, shadows),
    [colors, shadows],
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [prescriptionText, setPrescriptionText] = useState("");
  const [conditionText, setConditionText] = useState("");
  const [ageText, setAgeText] = useState("");
  const [allergiesText, setAllergiesText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 5000);
  }, []);

  const extractMedications =
    api && useAction ? useAction(api.ai.extractMedications) : null;
  const extractFromText =
    api && useAction ? useAction(api.ai.extractFromText) : null;
  const suggestForCondition =
    api && useAction ? useAction(api.ai.suggestForCondition) : null;
  const checkInteractions =
    api && useAction ? useAction(api.drugApi.checkInteractions) : null;
  const checkConditionSafety =
    api && useAction ? useAction(api.drugApi.checkConditionSafety) : null;
  const generateExplanation =
    api && useAction ? useAction(api.ai.generateExplanation) : null;
  const saveScan = api && useMutation ? useMutation(api.scans.save) : null;
  const scans =
    api && useQuery
      ? useQuery(api.scans.list, userId ? { userId: userId as any } : "skip")
      : undefined;
  const activeMeds =
    api && useQuery
      ? useQuery(
          api.medications.listActive,
          userId ? { userId: userId as any } : "skip",
        )
      : undefined;

  const processExtracted = useCallback(
    async (extracted: any, overrideCondition?: string) => {
      if (extracted.error) {
        showError(extracted.error);
        return;
      }

      if (!extracted.medications || extracted.medications.length === 0) {
        showError(
          "Could not identify any medications. Try again with more detail.",
        );
        return;
      }

      setProcessingStep("Checking for interactions...");
      const newMedNames = extracted.medications.map((m: any) => m.name);
      const existingMedNames = (activeMeds ?? []).map((m: any) => m.name);
      const interactions = checkInteractions
        ? await checkInteractions({
            medications: newMedNames,
            existingMedications: existingMedNames,
          })
        : [];

      const condition = overrideCondition ?? conditionText.trim();
      let conditionData = null;
      if (condition && checkConditionSafety) {
        setProcessingStep("Checking medication safety for your condition...");
        conditionData = await checkConditionSafety({
          medications: newMedNames,
          condition,
        });
      }

      setProcessingStep("Preparing explanation...");
      const explanationArgs: any = {
        medications: extracted.medications.map((m: any) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
        })),
        interactions,
      };
      if (condition) explanationArgs.condition = condition;
      if (conditionData) explanationArgs.conditionData = conditionData;
      if (ageText.trim()) explanationArgs.age = ageText.trim();
      if (allergiesText.trim())
        explanationArgs.allergies = allergiesText.trim();

      const explanation = generateExplanation
        ? await generateExplanation(explanationArgs)
        : null;

      if (userId && saveScan) {
        setProcessingStep("Saving results...");
        const saveArgs: any = {
          userId: userId as any,
          extractedMedications: extracted.medications,
          interactions,
          explanation: explanation ?? "No explanation available.",
        };
        if (condition) saveArgs.condition = condition;
        const scanId = await saveScan(saveArgs);
        router.push(`/results/${scanId}`);
      } else {
        router.push({
          pathname: "/results/[id]",
          params: {
            id: "local",
            data: JSON.stringify({
              extractedMedications: extracted.medications,
              interactions,
              explanation: explanation ?? "No explanation available.",
              condition: condition || undefined,
              scannedAt: Date.now(),
            }),
          },
        });
      }
      setConditionText("");
    },
    [
      userId,
      checkInteractions,
      checkConditionSafety,
      generateExplanation,
      saveScan,
      activeMeds,
      conditionText,
      ageText,
      allergiesText,
      showError,
    ],
  );

  const handleImageCaptured = useCallback(
    async (base64: string) => {
      if (!extractMedications) {
        showError(
          "Setup required: Connect Convex and set your OpenAI API key to enable scanning.",
        );
        return;
      }
      setIsProcessing(true);
      try {
        setProcessingStep("Reading prescription...");
        const extracted = await extractMedications({ imageBase64: base64 });
        await processExtracted(extracted);
      } catch (error) {
        console.error("Scan error:", error);
        showError("Scan failed. Please try again.");
      } finally {
        setIsProcessing(false);
        setProcessingStep("");
      }
    },
    [extractMedications, processExtracted, showError],
  );

  const handleTextLookup = useCallback(async () => {
    const text = prescriptionText.trim();
    if (!text) {
      showError('Type a medication first, e.g. "Bruffen 1x3"');
      return;
    }
    if (!extractFromText) {
      showError("Setup required: Connect Convex and set your OpenAI API key.");
      return;
    }

    Keyboard.dismiss();
    setIsProcessing(true);
    try {
      setProcessingStep("Analyzing prescription...");
      const extracted = await extractFromText({ prescriptionText: text });
      await processExtracted(extracted);
      setPrescriptionText("");
    } catch (error) {
      console.error("Lookup error:", error);
      showError(
        `Lookup failed: ${error instanceof Error ? error.message : "Please try again."}`,
      );
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  }, [prescriptionText, extractFromText, processExtracted, showError]);

  const handleConditionSuggest = useCallback(async () => {
    const condition = conditionText.trim();
    if (!condition) {
      showError('Describe your condition first, e.g. "headache" or "flu"');
      return;
    }
    if (!suggestForCondition) {
      showError("Setup required: Connect Convex and set your OpenAI API key.");
      return;
    }

    Keyboard.dismiss();
    setIsProcessing(true);
    try {
      setProcessingStep("Finding medications for your condition...");
      const extracted = await suggestForCondition({ condition });
      await processExtracted(extracted, condition);
    } catch (error) {
      console.error("Suggestion error:", error);
      showError(
        `Suggestion failed: ${error instanceof Error ? error.message : "Please try again."}`,
      );
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  }, [conditionText, suggestForCondition, processExtracted, showError]);

  if (isProcessing) {
    return <LoadingSpinner message={processingStep} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome to</Text>
            <Text style={styles.brand}>DrugScan</Text>
          </View>
          <View style={styles.headerActions}>
            {role === "admin" && (
              <Pressable
                onPress={() => router.push("/admin")}
                style={styles.themeToggle}
                accessibilityRole="button"
                accessibilityLabel="Admin panel"
              >
                <FontAwesome name="shield" size={18} color={colors.accent} />
              </Pressable>
            )}
            <Pressable
              onPress={toggleTheme}
              style={styles.themeToggle}
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
            <View style={styles.brandIcon}>
              <FontAwesome
                name="plus-square"
                size={20}
                color={colors.primary}
              />
            </View>
          </View>
        </View>

        {/* Inline error banner */}
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <FontAwesome
              name="exclamation-circle"
              size={14}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Scan options */}
        <Text style={styles.sectionLabel}>Scan a Prescription</Text>
        <CameraCapture onImageCaptured={handleImageCaptured} />

        {/* Patient profile — condition, age, allergies */}
        <View style={styles.conditionSection}>
          <Text style={styles.conditionLabel}>Your Profile</Text>

          {/* Condition */}
          <Text style={styles.profileFieldLabel}>Condition / Symptoms</Text>
          <View style={styles.conditionInputRow}>
            <View style={styles.conditionInputContainer}>
              <FontAwesome
                name="heartbeat"
                size={14}
                color={colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.conditionInput}
                value={conditionText}
                onChangeText={setConditionText}
                placeholder='e.g. "Headache", "Flu", "Chest pain"'
                placeholderTextColor={colors.textTertiary}
                returnKeyType="search"
                onSubmitEditing={handleConditionSuggest}
                accessibilityLabel="Enter your condition or disease"
              />
              {conditionText.length > 0 && (
                <Pressable onPress={() => setConditionText("")} hitSlop={8}>
                  <FontAwesome
                    name="times-circle"
                    size={16}
                    color={colors.textTertiary}
                  />
                </Pressable>
              )}
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.suggestButton,
                !conditionText.trim() && styles.suggestButtonDisabled,
                pressed && styles.suggestButtonPressed,
              ]}
              onPress={handleConditionSuggest}
              accessibilityRole="button"
              accessibilityLabel="Get drug suggestions"
            >
              <FontAwesome name="search" size={16} color={colors.textInverse} />
            </Pressable>
          </View>

          {/* Age */}
          <Text style={styles.profileFieldLabel}>Age</Text>
          <View style={styles.profileInputContainer}>
            <FontAwesome
              name="user"
              size={14}
              color={colors.textTertiary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.conditionInput}
              value={ageText}
              onChangeText={setAgeText}
              placeholder='e.g. "15 years old", "45"'
              placeholderTextColor={colors.textTertiary}
              returnKeyType="done"
              accessibilityLabel="Enter your age"
            />
            {ageText.length > 0 && (
              <Pressable onPress={() => setAgeText("")} hitSlop={8}>
                <FontAwesome
                  name="times-circle"
                  size={16}
                  color={colors.textTertiary}
                />
              </Pressable>
            )}
          </View>

          {/* Allergies */}
          <Text style={styles.profileFieldLabel}>Known Allergies</Text>
          <View style={styles.profileInputContainer}>
            <FontAwesome
              name="exclamation-triangle"
              size={13}
              color={colors.textTertiary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.conditionInput}
              value={allergiesText}
              onChangeText={setAllergiesText}
              placeholder='e.g. "Penicillin, dairy, peanuts"'
              placeholderTextColor={colors.textTertiary}
              returnKeyType="done"
              accessibilityLabel="Enter your known allergies"
            />
            {allergiesText.length > 0 && (
              <Pressable onPress={() => setAllergiesText("")} hitSlop={8}>
                <FontAwesome
                  name="times-circle"
                  size={16}
                  color={colors.textTertiary}
                />
              </Pressable>
            )}
          </View>

          <Text style={styles.conditionHint}>
            Fill in your profile to get personalised safety warnings when
            scanning
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or type it</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Text input */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <FontAwesome
              name="pencil"
              size={14}
              color={colors.textTertiary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              value={prescriptionText}
              onChangeText={setPrescriptionText}
              placeholder='e.g. "Bruffen 1x3" or "Amoxicillin 500mg"'
              placeholderTextColor={colors.textTertiary}
              returnKeyType="search"
              onSubmitEditing={handleTextLookup}
              accessibilityLabel="Type a prescription"
            />
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.searchButton,
              !prescriptionText.trim() && styles.searchButtonDisabled,
              pressed && styles.searchButtonPressed,
            ]}
            onPress={handleTextLookup}
            accessibilityRole="button"
            accessibilityLabel="Search prescription"
          >
            <FontAwesome
              name="arrow-right"
              size={16}
              color={colors.textInverse}
            />
          </Pressable>
        </View>

        {/* Recent Scans */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionLabel}>Recent Scans</Text>
          {!scans || scans.length === 0 ? (
            <View style={styles.recentEmpty}>
              <View style={styles.recentEmptyIcon}>
                <FontAwesome
                  name="file-text-o"
                  size={20}
                  color={colors.textTertiary}
                />
              </View>
              <Text style={styles.recentEmptyText}>
                Your scan history will appear here
              </Text>
            </View>
          ) : (
            <FlatList
              data={scans}
              horizontal
              scrollEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item: any) => item._id}
              renderItem={({ item }: any) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.scanCard,
                    pressed && styles.scanCardPressed,
                  ]}
                  onPress={() => router.push(`/results/${item._id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`View scan with ${item.extractedMedications.length} medications`}
                >
                  <View style={styles.scanCardHeader}>
                    <FontAwesome
                      name="file-text"
                      size={16}
                      color={colors.primary}
                    />
                    {item.interactions.length > 0 && (
                      <FontAwesome
                        name="exclamation-circle"
                        size={12}
                        color={colors.danger}
                      />
                    )}
                  </View>
                  <Text style={styles.scanCardMeds}>
                    {item.extractedMedications.length} med
                    {item.extractedMedications.length !== 1 ? "s" : ""}
                  </Text>
                  <Text style={styles.scanCardDate}>
                    {formatDateTime(item.scannedAt)}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          For informational purposes only. Not a substitute for professional
          medical advice.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors, shadows: AppShadows) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: 32 },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 24,
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.danger,
      marginHorizontal: 20,
      marginBottom: 12,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    errorBannerText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "500",
      flex: 1,
    },
    greeting: { fontSize: 14, color: colors.textSecondary, fontWeight: "500" },
    brand: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.8,
    },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
    themeToggle: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.surfaceHover,
      justifyContent: "center",
      alignItems: "center",
    },
    brandIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.primarySoft,
      justifyContent: "center",
      alignItems: "center",
    },
    sectionLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textSecondary,
      paddingHorizontal: 20,
      marginBottom: 12,
      letterSpacing: -0.2,
    },
    conditionSection: { paddingHorizontal: 20, marginTop: 20 },
    conditionLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 12,
    },
    profileFieldLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 10,
    },
    profileInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingHorizontal: 14,
      ...shadows.sm,
    },
    conditionInputRow: { flexDirection: "row", gap: 10 },
    conditionInputContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingHorizontal: 14,
      ...shadows.sm,
    },
    conditionInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.text,
    },
    suggestButton: {
      width: 50,
      height: 50,
      borderRadius: 14,
      backgroundColor: colors.accent,
      justifyContent: "center",
      alignItems: "center",
      ...shadows.md,
    },
    suggestButtonDisabled: {
      backgroundColor: colors.textTertiary,
      ...shadows.sm,
    },
    suggestButtonPressed: { opacity: 0.85, transform: [{ scale: 0.95 }] },
    conditionHint: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 6,
      paddingHorizontal: 4,
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      marginVertical: 20,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: {
      marginHorizontal: 14,
      fontSize: 13,
      color: colors.textTertiary,
      fontWeight: "500",
    },
    inputWrapper: { flexDirection: "row", gap: 10, paddingHorizontal: 20 },
    inputContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingHorizontal: 14,
      ...shadows.sm,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, paddingVertical: 14, fontSize: 15, color: colors.text },
    searchButton: {
      width: 50,
      height: 50,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      ...shadows.md,
    },
    searchButtonDisabled: {
      backgroundColor: colors.textTertiary,
      ...shadows.sm,
    },
    searchButtonPressed: {
      backgroundColor: colors.primaryDark,
      transform: [{ scale: 0.95 }],
    },
    recentSection: { marginTop: 28 },
    recentEmpty: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginHorizontal: 20,
      backgroundColor: colors.card,
      padding: 20,
      borderRadius: 16,
      ...shadows.sm,
    },
    recentEmptyIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
    },
    recentEmptyText: { fontSize: 14, color: colors.textTertiary, flex: 1 },
    scanCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginLeft: 20,
      width: 120,
      gap: 6,
      ...shadows.sm,
    },
    scanCardPressed: {
      backgroundColor: colors.surfaceHover,
      transform: [{ scale: 0.97 }],
    },
    scanCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    scanCardMeds: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.3,
    },
    scanCardDate: { fontSize: 11, color: colors.textTertiary },
    disclaimer: {
      textAlign: "center",
      color: colors.textTertiary,
      fontSize: 11,
      paddingHorizontal: 40,
      paddingTop: 24,
      paddingBottom: 8,
    },
  });
}
