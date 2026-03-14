import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme, AppColors } from '@/hooks/useTheme';
import type { AppShadows } from '@/constants/Colors';
import { useUser, useUserRole } from '@/contexts/UserContext';
import { formatDateTime } from '@/lib/utils';
import { parseDosesPerDay, computeDoseTimes, formatTime12h } from '@/lib/scheduleCalculator';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DoseTimePickerModal } from '@/components/DoseTimePickerModal';

let useQuery: any, useMutation: any, useAction: any, api: any;
try {
  const convexReact = require('convex/react');
  useQuery = convexReact.useQuery;
  useMutation = convexReact.useMutation;
  useAction = convexReact.useAction;
  api = require('@/convex/_generated/api').api;
} catch {}

export default function AdminUserDetail() {
  const { userId: targetUserId } = useLocalSearchParams<{ userId: string }>();
  const adminId = useUser();
  const role = useUserRole();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const today = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const detail = api && useQuery
    ? useQuery(api.admin.getUserDetail, adminId ? { adminId: adminId as any, userId: targetUserId as any } : "skip")
    : undefined;

  const adherence = api && useQuery
    ? useQuery(api.admin.getPatientAdherence, adminId ? { adminId: adminId as any, userId: targetUserId as any, date: today } : "skip")
    : undefined;

  const deleteMed = api && useMutation ? useMutation(api.admin.deleteMedication) : null;
  const deleteScan = api && useMutation ? useMutation(api.admin.deleteScan) : null;
  const toggleMedActive = api && useMutation ? useMutation(api.medications.toggleActive) : null;
  const toggleReminderActive = api && useMutation ? useMutation(api.reminders.toggleActive) : null;
  const deleteReminder = api && useMutation ? useMutation(api.reminders.remove) : null;
  const sendPush = api && useAction ? useAction(api.notifications.sendPushToUser) : null;
  const prescribeTreatment = api && useMutation ? useMutation(api.admin.prescribeTreatment) : null;

  // Notification state
  const patientName = detail?.user?.name ?? 'there';
  const [notifMessage, setNotifMessage] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  // Initialize default message once detail loads
  const defaultMessage = `Hi ${patientName}, please remember to take your medications on time.`;

  // Prescribe form state
  const [showPrescribeForm, setShowPrescribeForm] = useState(false);
  const [rxName, setRxName] = useState('');
  const [rxDosage, setRxDosage] = useState('');
  const [rxFrequency, setRxFrequency] = useState('');
  const [rxPurpose, setRxPurpose] = useState('');
  const [rxInstructions, setRxInstructions] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [rxStartHour, setRxStartHour] = useState(8);
  const [rxStartMinute, setRxStartMinute] = useState(0);
  const [prescribing, setPrescribing] = useState(false);

  // Client-side missed computation (same logic as patient's My Day screen)
  const computeIsMissed = useCallback((todo: any): boolean => {
    if (!todo.scheduledTime || !todo.scheduledDate || todo.status !== 'pending')
      return false;
    const [h, m] = todo.scheduledTime.split(':').map(Number);
    const scheduled = new Date(
      parseInt(todo.scheduledDate.slice(0, 4)),
      parseInt(todo.scheduledDate.slice(5, 7)) - 1,
      parseInt(todo.scheduledDate.slice(8, 10)),
      h, m,
    );
    return Date.now() - scheduled.getTime() > 2 * 60 * 60 * 1000;
  }, []);

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <FontAwesome name="lock" size={40} color={colors.danger} />
          <Text style={styles.centerTitle}>Access Denied</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (detail === undefined) {
    return <LoadingSpinner message="Loading user data..." />;
  }

  if (detail === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.centerTitle}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { user, medications, scans, reminders } = detail;
  const hasPushToken = !!user.pushToken;

  const handleDeleteMed = (medId: string, name: string) => {
    Alert.alert('Delete Medication', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMed?.({ adminId: adminId as any, medicationId: medId as any }),
      },
    ]);
  };

  const handleDeleteScan = (scanId: string) => {
    Alert.alert('Delete Scan', 'Remove this scan and its results?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteScan?.({ adminId: adminId as any, scanId: scanId as any }),
      },
    ]);
  };

  const handleDeleteReminder = (reminderId: string, medName: string) => {
    Alert.alert('Delete Reminder', `Remove reminder for "${medName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteReminder?.({ id: reminderId as any }),
      },
    ]);
  };

  const handlePrescribe = async () => {
    if (!rxName.trim() || !rxDosage.trim() || !rxFrequency.trim()) {
      Alert.alert('Missing fields', 'Name, dosage, and frequency are required.');
      return;
    }

    const dosesPerDay = parseDosesPerDay(rxFrequency);
    if (dosesPerDay === 0) {
      Alert.alert(
        'Unrecognized frequency',
        `Could not determine a schedule from "${rxFrequency}". Use formats like "twice daily", "3 times a day", or "every 8 hours".`,
      );
      return;
    }

    const doseTimes = computeDoseTimes(dosesPerDay, rxStartHour, rxStartMinute);
    if (doseTimes.length === 0) {
      Alert.alert('No schedule', 'Could not compute dose times for this frequency.');
      return;
    }

    const dosePreview = doseTimes.map(formatTime12h).join(', ');
    Alert.alert(
      'Confirm Prescription',
      `${rxName} ${rxDosage}\n${rxFrequency}\n\nDose times: ${dosePreview}\n\nThis will appear on the patient's My Day screen.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Prescribe',
          onPress: async () => {
            setPrescribing(true);
            try {
              await prescribeTreatment?.({
                adminId: adminId as any,
                userId: targetUserId as any,
                name: rxName.trim(),
                dosage: rxDosage.trim(),
                frequency: rxFrequency.trim(),
                purpose: rxPurpose.trim() || undefined,
                instructions: rxInstructions.trim() || undefined,
                doseTimes,
                today,
              });
              Alert.alert('Prescribed', `${rxName} added to ${patientName}'s treatment plan.`);
              // Reset form
              setRxName('');
              setRxDosage('');
              setRxFrequency('');
              setRxPurpose('');
              setRxInstructions('');
              setShowPrescribeForm(false);
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed to prescribe treatment.');
            } finally {
              setPrescribing(false);
            }
          },
        },
      ],
    );
  };

  const handleSendNotification = async () => {
    const message = notifMessage.trim() || defaultMessage;
    setSendingNotif(true);
    try {
      await sendPush?.({
        adminId: adminId as any,
        userId: targetUserId as any,
        title: 'Medication Reminder',
        body: message,
      });
      Alert.alert('Sent', 'Push notification delivered successfully.');
      setNotifMessage('');
    } catch (err: any) {
      Alert.alert('Failed', err?.message ?? 'Could not send notification.');
    } finally {
      setSendingNotif(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backArrow}>
            <FontAwesome name="arrow-left" size={18} color={colors.primary} />
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{user.name ?? 'Anonymous'}</Text>
            <Text style={styles.headerSubtitle}>
              {user.role === 'admin' ? 'Admin' : 'Patient'} | Joined {formatDateTime(user.createdAt)}
            </Text>
          </View>
        </View>

        {/* Prescribe Treatment */}
        <Pressable
          style={styles.prescribeToggle}
          onPress={() => setShowPrescribeForm(!showPrescribeForm)}
        >
          <View style={styles.prescribeToggleLeft}>
            <FontAwesome name="plus-circle" size={16} color={colors.primary} />
            <Text style={styles.prescribeToggleText}>Prescribe Treatment</Text>
          </View>
          <FontAwesome
            name={showPrescribeForm ? 'chevron-up' : 'chevron-down'}
            size={12}
            color={colors.textTertiary}
          />
        </Pressable>

        {showPrescribeForm && (
          <View style={styles.prescribeForm}>
            <TextInput
              style={styles.formInput}
              placeholder="Medication name *"
              placeholderTextColor={colors.textTertiary}
              value={rxName}
              onChangeText={setRxName}
            />
            <TextInput
              style={styles.formInput}
              placeholder="Dosage (e.g. 500mg) *"
              placeholderTextColor={colors.textTertiary}
              value={rxDosage}
              onChangeText={setRxDosage}
            />
            <TextInput
              style={styles.formInput}
              placeholder="Frequency (e.g. twice daily) *"
              placeholderTextColor={colors.textTertiary}
              value={rxFrequency}
              onChangeText={setRxFrequency}
            />
            <TextInput
              style={styles.formInput}
              placeholder="Purpose (optional)"
              placeholderTextColor={colors.textTertiary}
              value={rxPurpose}
              onChangeText={setRxPurpose}
            />
            <TextInput
              style={styles.formInput}
              placeholder="Instructions (optional)"
              placeholderTextColor={colors.textTertiary}
              value={rxInstructions}
              onChangeText={setRxInstructions}
            />

            {/* Start time */}
            <Pressable style={styles.timeRow} onPress={() => setShowTimePicker(true)}>
              <FontAwesome name="clock-o" size={14} color={colors.primary} />
              <Text style={styles.timeRowText}>
                First dose: {formatTime12h(`${String(rxStartHour).padStart(2, '0')}:${String(rxStartMinute).padStart(2, '0')}`)}
              </Text>
              <Text style={[styles.timeRowText, { color: colors.textTertiary, fontSize: 12 }]}>Change</Text>
            </Pressable>

            {/* Frequency preview */}
            {rxFrequency.trim() !== '' && (() => {
              const n = parseDosesPerDay(rxFrequency);
              if (n === 0) return (
                <Text style={[styles.itemMeta, { color: colors.danger, marginTop: 4 }]}>
                  Could not parse frequency. Try "twice daily" or "every 8 hours".
                </Text>
              );
              const times = computeDoseTimes(n, rxStartHour, rxStartMinute);
              return (
                <Text style={[styles.itemMeta, { marginTop: 4 }]}>
                  {n}x daily: {times.map(formatTime12h).join(', ')}
                </Text>
              );
            })()}

            <Pressable
              style={[styles.prescribeButton, prescribing && { opacity: 0.6 }]}
              onPress={handlePrescribe}
              disabled={prescribing}
            >
              <FontAwesome name="check" size={14} color="#fff" />
              <Text style={styles.prescribeButtonText}>
                {prescribing ? 'Prescribing...' : 'Prescribe'}
              </Text>
            </Pressable>
          </View>
        )}

        <DoseTimePickerModal
          visible={showTimePicker}
          initialHour={rxStartHour}
          initialMinute={rxStartMinute}
          onConfirm={(h, m) => {
            setRxStartHour(h);
            setRxStartMinute(m);
            setShowTimePicker(false);
          }}
          onCancel={() => setShowTimePicker(false)}
        />

        {/* Today's Adherence */}
        {adherence && adherence.length > 0 && (() => {
          const doses = adherence.map((t: any) => ({
            ...t,
            isMissed: computeIsMissed(t),
          }));
          const doneCount = doses.filter((d: any) => d.status === 'done').length;
          const missedCount = doses.filter((d: any) => d.isMissed).length;
          const skippedCount = doses.filter((d: any) => d.status === 'skipped').length;
          const pendingCount = doses.filter((d: any) => d.status === 'pending' && !d.isMissed).length;

          return (
            <>
              <Text style={styles.sectionTitle}>
                <FontAwesome name="calendar-check-o" size={14} color={colors.primary} />
                {'  '}Today's Adherence
              </Text>

              {/* Summary bar */}
              <View style={styles.adherenceSummary}>
                {doneCount > 0 && (
                  <View style={styles.adherenceStat}>
                    <View style={[styles.adherenceDot, { backgroundColor: colors.secondary }]} />
                    <Text style={styles.adherenceStatText}>{doneCount} taken</Text>
                  </View>
                )}
                {pendingCount > 0 && (
                  <View style={styles.adherenceStat}>
                    <View style={[styles.adherenceDot, { backgroundColor: colors.primary }]} />
                    <Text style={styles.adherenceStatText}>{pendingCount} upcoming</Text>
                  </View>
                )}
                {missedCount > 0 && (
                  <View style={styles.adherenceStat}>
                    <View style={[styles.adherenceDot, { backgroundColor: colors.danger }]} />
                    <Text style={styles.adherenceStatText}>{missedCount} missed</Text>
                  </View>
                )}
                {skippedCount > 0 && (
                  <View style={styles.adherenceStat}>
                    <View style={[styles.adherenceDot, { backgroundColor: colors.textTertiary }]} />
                    <Text style={styles.adherenceStatText}>{skippedCount} skipped</Text>
                  </View>
                )}
              </View>

              {/* Dose list */}
              {doses.map((dose: any) => {
                const isMissed = dose.isMissed;
                const isDone = dose.status === 'done';
                const isSkipped = dose.status === 'skipped';

                return (
                  <View
                    key={dose._id}
                    style={[
                      styles.itemCard,
                      isMissed && { borderWidth: 1, borderColor: colors.danger + '30' },
                    ]}
                  >
                    <View style={[
                      styles.doseStatusIcon,
                      isDone && { backgroundColor: colors.secondary },
                      isMissed && { backgroundColor: colors.danger },
                      isSkipped && { backgroundColor: colors.textTertiary },
                      !isDone && !isMissed && !isSkipped && { backgroundColor: colors.primary + '30' },
                    ]}>
                      <FontAwesome
                        name={isDone ? 'check' : isMissed ? 'times' : isSkipped ? 'forward' : 'clock-o'}
                        size={10}
                        color={isDone || isMissed || isSkipped ? '#fff' : colors.primary}
                      />
                    </View>
                    <View style={styles.itemContent}>
                      <Text style={[
                        styles.itemTitle,
                        isMissed && { color: colors.danger },
                        isDone && { color: colors.textTertiary, textDecorationLine: 'line-through' },
                      ]}>
                        {dose.task}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <Text style={[styles.itemMeta, { fontWeight: '600', color: colors.secondary }]}>
                          {dose.scheduledTime ? formatTime12h(dose.scheduledTime) : ''}
                        </Text>
                        {isMissed && <Text style={[styles.itemMeta, { color: colors.danger, fontWeight: '700', fontSize: 10 }]}>MISSED</Text>}
                        {isSkipped && <Text style={[styles.itemMeta, { color: colors.textTertiary, fontWeight: '700', fontSize: 10 }]}>SKIPPED</Text>}
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Send Notification */}
              <View style={styles.notifSection}>
                <Text style={styles.notifLabel}>
                  <FontAwesome name="send" size={12} color={colors.primary} />
                  {'  '}Send Notification
                </Text>
                {hasPushToken ? (
                  <>
                    <TextInput
                      style={styles.notifInput}
                      placeholder={defaultMessage}
                      placeholderTextColor={colors.textTertiary}
                      value={notifMessage}
                      onChangeText={setNotifMessage}
                      multiline
                    />
                    <Pressable
                      style={[styles.notifButton, sendingNotif && { opacity: 0.6 }]}
                      onPress={handleSendNotification}
                      disabled={sendingNotif}
                    >
                      <FontAwesome name="send" size={13} color="#fff" />
                      <Text style={styles.notifButtonText}>
                        {sendingNotif ? 'Sending...' : 'Send'}
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.notifDisabled}>
                    <FontAwesome name="bell-slash-o" size={14} color={colors.textTertiary} />
                    <Text style={styles.notifDisabledText}>
                      Patient hasn't enabled notifications
                    </Text>
                  </View>
                )}
              </View>
            </>
          );
        })()}

        {/* Medications */}
        <Text style={styles.sectionTitle}>
          <FontAwesome name="medkit" size={14} color={colors.primary} />
          {'  '}Medications ({medications.length})
        </Text>
        {medications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No medications</Text>
          </View>
        ) : (
          medications.map((med: any) => (
            <View key={med._id} style={styles.itemCard}>
              <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{med.name}</Text>
                  <Pressable
                    onPress={() => toggleMedActive?.({ id: med._id })}
                    hitSlop={10}
                  >
                    <View style={[styles.statusDot, med.isActive ? styles.activeDot : styles.inactiveDot]} />
                  </Pressable>
                </View>
                <Text style={styles.itemMeta}>
                  {med.dosage} | {med.frequency}
                </Text>
                {med.purpose && <Text style={styles.itemMeta}>Purpose: {med.purpose}</Text>}
              </View>
              <Pressable
                onPress={() => handleDeleteMed(med._id, med.name)}
                hitSlop={8}
                style={styles.deleteIcon}
              >
                <FontAwesome name="trash-o" size={16} color={colors.danger} />
              </Pressable>
            </View>
          ))
        )}

        {/* Scans */}
        <Text style={styles.sectionTitle}>
          <FontAwesome name="file-text" size={14} color={colors.primary} />
          {'  '}Scans ({scans.length})
        </Text>
        {scans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No scans</Text>
          </View>
        ) : (
          scans.map((scan: any) => (
            <Pressable
              key={scan._id}
              style={styles.itemCard}
              onPress={() => router.push(`/results/${scan._id}`)}
            >
              <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>
                  {scan.extractedMedications.length} medication{scan.extractedMedications.length !== 1 ? 's' : ''} found
                </Text>
                <Text style={styles.itemMeta}>
                  {scan.extractedMedications.map((m: any) => m.name).join(', ')}
                </Text>
                {scan.condition && (
                  <Text style={styles.itemMeta}>Condition: {scan.condition}</Text>
                )}
                {scan.interactions.length > 0 && (
                  <Text style={[styles.itemMeta, { color: colors.danger }]}>
                    {scan.interactions.length} interaction{scan.interactions.length !== 1 ? 's' : ''} found
                  </Text>
                )}
                <Text style={styles.itemDate}>{formatDateTime(scan.scannedAt)}</Text>
              </View>
              <Pressable
                onPress={() => handleDeleteScan(scan._id)}
                hitSlop={8}
                style={styles.deleteIcon}
              >
                <FontAwesome name="trash-o" size={16} color={colors.danger} />
              </Pressable>
            </Pressable>
          ))
        )}

        {/* Reminders */}
        <Text style={styles.sectionTitle}>
          <FontAwesome name="bell" size={14} color={colors.primary} />
          {'  '}Reminders ({reminders.length})
        </Text>
        {reminders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No reminders</Text>
          </View>
        ) : (
          reminders.map((r: any) => (
            <View key={r._id} style={styles.itemCard}>
              <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{r.medicationName}</Text>
                  <Pressable
                    onPress={() => toggleReminderActive?.({ id: r._id })}
                    hitSlop={10}
                  >
                    <View style={[styles.statusDot, r.isActive ? styles.activeDot : styles.inactiveDot]} />
                  </Pressable>
                </View>
                <Text style={styles.itemMeta}>
                  {formatTime12h(r.time)} | {r.days.join(', ')}
                </Text>
              </View>
              <Pressable
                onPress={() => handleDeleteReminder(r._id, r.medicationName)}
                hitSlop={8}
                style={styles.deleteIcon}
              >
                <FontAwesome name="trash-o" size={16} color={colors.danger} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors, shadows: AppShadows) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingBottom: 40,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
    },
    centerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 32,
    },
    backArrow: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.sm,
    },
    headerInfo: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginTop: 20,
      marginBottom: 10,
      letterSpacing: -0.2,
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      ...shadows.sm,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textTertiary,
    },
    itemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      ...shadows.sm,
    },
    itemContent: {
      flex: 1,
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.2,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    activeDot: {
      backgroundColor: colors.secondary,
    },
    inactiveDot: {
      backgroundColor: colors.textTertiary,
    },
    itemMeta: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    itemDate: {
      fontSize: 11,
      color: colors.textTertiary,
      marginTop: 4,
    },
    deleteIcon: {
      padding: 8,
    },
    adherenceSummary: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      ...shadows.sm,
    },
    adherenceStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    adherenceDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    adherenceStatText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    doseStatusIcon: {
      width: 24,
      height: 24,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },
    prescribeToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      ...shadows.sm,
    },
    prescribeToggleLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    prescribeToggleText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.primary,
    },
    prescribeForm: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      gap: 10,
      ...shadows.sm,
    },
    formInput: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: colors.text,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
    },
    timeRowText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    prescribeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.secondary,
      borderRadius: 10,
      paddingVertical: 12,
      marginTop: 4,
    },
    prescribeButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
    notifSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginTop: 12,
      ...shadows.sm,
    },
    notifLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 10,
    },
    notifInput: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: colors.text,
      minHeight: 60,
      textAlignVertical: 'top',
      marginBottom: 10,
    },
    notifButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 20,
      alignSelf: 'flex-end',
    },
    notifButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    notifDisabled: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    notifDisabledText: {
      fontSize: 13,
      color: colors.textTertiary,
    },
  });
}
