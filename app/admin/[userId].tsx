import { useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme, AppColors } from '@/hooks/useTheme';
import type { AppShadows } from '@/constants/Colors';
import { useUser, useUserRole } from '@/contexts/UserContext';
import { formatDateTime } from '@/lib/utils';
import { LoadingSpinner } from '@/components/LoadingSpinner';

let useQuery: any, useMutation: any, api: any;
try {
  const convexReact = require('convex/react');
  useQuery = convexReact.useQuery;
  useMutation = convexReact.useMutation;
  api = require('@/convex/_generated/api').api;
} catch {}

export default function AdminUserDetail() {
  const { userId: targetUserId } = useLocalSearchParams<{ userId: string }>();
  const adminId = useUser();
  const role = useUserRole();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const detail = api && useQuery
    ? useQuery(api.admin.getUserDetail, adminId ? { adminId: adminId as any, userId: targetUserId as any } : "skip")
    : undefined;

  const deleteMed = api && useMutation ? useMutation(api.admin.deleteMedication) : null;
  const deleteScan = api && useMutation ? useMutation(api.admin.deleteScan) : null;

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
                  <View style={[styles.statusDot, med.isActive ? styles.activeDot : styles.inactiveDot]} />
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
            <View key={scan._id} style={styles.itemCard}>
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
            </View>
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
                  <View style={[styles.statusDot, r.isActive ? styles.activeDot : styles.inactiveDot]} />
                </View>
                <Text style={styles.itemMeta}>
                  {r.time} | {r.days.join(', ')}
                </Text>
              </View>
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
      marginBottom: 24,
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
  });
}
