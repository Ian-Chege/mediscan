import { useMemo } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme, AppColors } from '@/hooks/useTheme';
import type { AppShadows } from '@/constants/Colors';
import { useUser, useUserRole } from '@/contexts/UserContext';
import { formatDateTime } from '@/lib/utils';

let useQuery: any, useMutation: any, api: any;
try {
  const convexReact = require('convex/react');
  useQuery = convexReact.useQuery;
  useMutation = convexReact.useMutation;
  api = require('@/convex/_generated/api').api;
} catch {}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateTime(ts);
}

export default function AdminDashboard() {
  const userId = useUser();
  const role = useUserRole();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const stats = api && useQuery
    ? useQuery(api.admin.getStats, userId ? { adminId: userId as any } : "skip")
    : undefined;

  const users = api && useQuery
    ? useQuery(api.admin.listUsers, userId ? { adminId: userId as any } : "skip")
    : undefined;

  const deleteUser = api && useMutation ? useMutation(api.admin.deleteUser) : null;
  const updateRole = api && useMutation ? useMutation(api.admin.updateUserRole) : null;

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconCircle}>
            <FontAwesome name="lock" size={28} color={colors.danger} />
          </View>
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorText}>You need admin privileges to view this page.</Text>
          <Pressable style={styles.backButtonLarge} onPress={() => router.back()}>
            <Text style={styles.backButtonLargeText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleDeleteUser = (targetId: string, name: string) => {
    if (targetId === userId) {
      Alert.alert('Error', 'You cannot delete your own account.');
      return;
    }
    Alert.alert(
      'Delete User',
      `Delete "${name}" and all their data? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteUser?.({ adminId: userId as any, userId: targetId as any }),
        },
      ],
    );
  };

  const handleToggleRole = (targetId: string, currentRole: string, name: string) => {
    if (targetId === userId) {
      Alert.alert('Error', 'You cannot change your own role.');
      return;
    }
    const newRole = currentRole === 'admin' ? 'patient' : 'admin';
    Alert.alert(
      'Change Role',
      `Make "${name}" ${newRole === 'admin' ? 'an admin' : 'a patient'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => updateRole?.({ adminId: userId as any, userId: targetId as any, role: newRole }),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={users ?? []}
        keyExtractor={(item: any) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backArrow}>
                <FontAwesome name="arrow-left" size={16} color={colors.primary} />
              </Pressable>
              <View style={styles.headerTextGroup}>
                <Text style={styles.headerTitle}>Admin Panel</Text>
                <Text style={styles.headerSubtitle}>Overview & user management</Text>
              </View>
            </View>

            {/* Hero stat cards — 2x2 grid */}
            {stats && (
              <>
                <View style={styles.heroRow}>
                  <View style={[styles.heroCard, { backgroundColor: colors.primarySoft }]}>
                    <View style={[styles.heroIconCircle, { backgroundColor: colors.primary + '22' }]}>
                      <FontAwesome name="users" size={16} color={colors.primary} />
                    </View>
                    <Text style={[styles.heroNumber, { color: colors.primary }]}>{stats.totalUsers}</Text>
                    <Text style={styles.heroLabel}>Total Users</Text>
                    <Text style={styles.heroDetail}>
                      {stats.adminCount} admin{stats.adminCount !== 1 ? 's' : ''} | {stats.inactiveUsers} inactive
                    </Text>
                  </View>
                  <View style={[styles.heroCard, { backgroundColor: colors.accentSoft }]}>
                    <View style={[styles.heroIconCircle, { backgroundColor: colors.accent + '22' }]}>
                      <FontAwesome name="file-text" size={16} color={colors.accent} />
                    </View>
                    <Text style={[styles.heroNumber, { color: colors.accent }]}>{stats.totalScans}</Text>
                    <Text style={styles.heroLabel}>Total Scans</Text>
                    <Text style={styles.heroDetail}>
                      {stats.scansThisWeek} this week
                    </Text>
                  </View>
                </View>
                <View style={styles.heroRow}>
                  <View style={[styles.heroCard, { backgroundColor: colors.secondarySoft }]}>
                    <View style={[styles.heroIconCircle, { backgroundColor: colors.secondary + '22' }]}>
                      <FontAwesome name="medkit" size={16} color={colors.secondary} />
                    </View>
                    <Text style={[styles.heroNumber, { color: colors.secondary }]}>{stats.activeMedications}</Text>
                    <Text style={styles.heroLabel}>Active Meds</Text>
                    <Text style={styles.heroDetail}>
                      {stats.totalMedications} total tracked
                    </Text>
                  </View>
                  <View style={[styles.heroCard, { backgroundColor: colors.dangerSoft }]}>
                    <View style={[styles.heroIconCircle, { backgroundColor: colors.danger + '22' }]}>
                      <FontAwesome name="exclamation-triangle" size={16} color={colors.danger} />
                    </View>
                    <Text style={[styles.heroNumber, { color: colors.danger }]}>{stats.totalInteractions}</Text>
                    <Text style={styles.heroLabel}>Interactions</Text>
                    <Text style={styles.heroDetail}>
                      {stats.highSeverity} high severity
                    </Text>
                  </View>
                </View>

                {/* Top Medications */}
                {stats.topMedications.length > 0 && (
                  <View style={styles.insightCard}>
                    <View style={styles.insightHeader}>
                      <FontAwesome name="bar-chart" size={14} color={colors.accent} />
                      <Text style={styles.insightTitle}>Top Medications</Text>
                    </View>
                    {stats.topMedications.map((med: any, i: number) => (
                      <View key={med.name} style={styles.topMedRow}>
                        <View style={[styles.rankBadge, i === 0 && { backgroundColor: colors.warningSoft }]}>
                          <Text style={[styles.rankText, i === 0 && { color: colors.warning }]}>
                            {i + 1}
                          </Text>
                        </View>
                        <Text style={styles.topMedName}>{med.name}</Text>
                        <View style={styles.topMedCountBadge}>
                          <Text style={styles.topMedCount}>{med.count}x</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Recent Activity */}
                {stats.recentScans.length > 0 && (
                  <View style={styles.insightCard}>
                    <View style={styles.insightHeader}>
                      <FontAwesome name="clock-o" size={14} color={colors.primary} />
                      <Text style={styles.insightTitle}>Recent Scans</Text>
                    </View>
                    {stats.recentScans.map((scan: any) => (
                      <View key={scan.id} style={styles.activityRow}>
                        <View style={styles.activityDot} />
                        <View style={styles.activityInfo}>
                          <Text style={styles.activityText}>
                            <Text style={styles.activityBold}>{scan.userName}</Text>
                            {' scanned '}
                            <Text style={styles.activityBold}>{scan.medCount} med{scan.medCount !== 1 ? 's' : ''}</Text>
                            {scan.interactionCount > 0 && (
                              <Text style={{ color: colors.danger }}>
                                {' '}({scan.interactionCount} interaction{scan.interactionCount !== 1 ? 's' : ''})
                              </Text>
                            )}
                          </Text>
                          {scan.condition && (
                            <Text style={styles.activityCondition}>
                              Condition: {scan.condition}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.activityTime}>{timeAgo(scan.scannedAt)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Reminders stat */}
                <View style={styles.reminderStatBar}>
                  <FontAwesome name="bell" size={13} color={colors.primary} />
                  <Text style={styles.reminderStatText}>
                    <Text style={styles.reminderStatBold}>{stats.activeReminders}</Text> active reminders out of {stats.totalReminders} total
                  </Text>
                </View>
              </>
            )}

            {/* Users section header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Users</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{users?.length ?? 0}</Text>
              </View>
            </View>
          </>
        }
        renderItem={({ item, index }: any) => {
          const isSelf = item._id === userId;
          const isAdmin = item.role === 'admin';

          return (
            <Pressable
              style={({ pressed }) => [styles.userCard, pressed && styles.userCardPressed]}
              onPress={() => router.push(`/admin/${item._id}`)}
            >
              {/* Top section */}
              <View style={styles.userCardTop}>
                <View style={[styles.avatar, isAdmin && styles.avatarAdmin]}>
                  <FontAwesome
                    name={isAdmin ? 'shield' : 'user'}
                    size={15}
                    color={isAdmin ? colors.accent : colors.textInverse}
                  />
                </View>
                <View style={styles.userInfo}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {item.name ?? 'Anonymous'}
                    </Text>
                    {isAdmin && (
                      <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>Admin</Text>
                      </View>
                    )}
                    {isSelf && (
                      <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>You</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.userLastActive}>
                    Active {timeAgo(item.lastActivity)}
                  </Text>
                </View>
              </View>

              {/* Stats row */}
              <View style={styles.userStatsRow}>
                <View style={styles.userStat}>
                  <FontAwesome name="file-text-o" size={11} color={colors.textTertiary} />
                  <Text style={styles.userStatValue}>{item.scanCount}</Text>
                  <Text style={styles.userStatLabel}>scans</Text>
                </View>
                <View style={styles.userStatDivider} />
                <View style={styles.userStat}>
                  <FontAwesome name="medkit" size={11} color={colors.textTertiary} />
                  <Text style={styles.userStatValue}>{item.activeMedCount}</Text>
                  <Text style={styles.userStatLabel}>active meds</Text>
                </View>
                <View style={styles.userStatDivider} />
                <View style={styles.userStat}>
                  <FontAwesome name="bell-o" size={11} color={colors.textTertiary} />
                  <Text style={styles.userStatValue}>{item.reminderCount}</Text>
                  <Text style={styles.userStatLabel}>reminders</Text>
                </View>
              </View>

              {/* Action row */}
              <View style={styles.userActions}>
                <Pressable
                  style={({ pressed }) => [styles.actionChip, pressed && styles.actionChipPressed]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleToggleRole(item._id, item.role ?? 'patient', item.name);
                  }}
                >
                  <FontAwesome name="exchange" size={10} color={colors.accent} />
                  <Text style={[styles.actionChipText, { color: colors.accent }]}>
                    {isAdmin ? 'Demote' : 'Promote'}
                  </Text>
                </Pressable>
                {!isSelf && (
                  <Pressable
                    style={({ pressed }) => [styles.actionChip, styles.deleteChip, pressed && styles.actionChipPressed]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteUser(item._id, item.name);
                    }}
                  >
                    <FontAwesome name="trash-o" size={10} color={colors.danger} />
                    <Text style={[styles.actionChipText, { color: colors.danger }]}>Remove</Text>
                  </Pressable>
                )}
                <View style={{ flex: 1 }} />
                <FontAwesome name="chevron-right" size={11} color={colors.textTertiary} />
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors, shadows: AppShadows) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      padding: 20,
      paddingTop: 36,
      paddingBottom: 40,
    },

    // ── Header ──
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 22,
    },
    backArrow: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.sm,
    },
    headerTextGroup: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.7,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 1,
    },

    // ── Hero stat cards ──
    heroRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    heroCard: {
      flex: 1,
      borderRadius: 16,
      padding: 16,
      ...shadows.sm,
    },
    heroIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    heroNumber: {
      fontSize: 26,
      fontWeight: '800',
      letterSpacing: -0.8,
    },
    heroLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      marginTop: 2,
    },
    heroDetail: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 3,
    },

    // ── Insight cards ──
    insightCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginTop: 10,
      ...shadows.sm,
    },
    insightHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
    },
    insightTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.2,
    },

    // ── Top medications ──
    topMedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    rankBadge: {
      width: 24,
      height: 24,
      borderRadius: 8,
      backgroundColor: colors.surfaceHover,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rankText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    topMedName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      textTransform: 'capitalize',
    },
    topMedCountBadge: {
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    topMedCount: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },

    // ── Recent activity ──
    activityRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    activityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginTop: 5,
    },
    activityInfo: {
      flex: 1,
    },
    activityText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    activityBold: {
      fontWeight: '700',
      color: colors.text,
    },
    activityCondition: {
      fontSize: 11,
      color: colors.textTertiary,
      fontStyle: 'italic',
      marginTop: 2,
    },
    activityTime: {
      fontSize: 11,
      color: colors.textTertiary,
      fontWeight: '500',
      minWidth: 50,
      textAlign: 'right',
    },

    // ── Reminders stat bar ──
    reminderStatBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginTop: 10,
      marginBottom: 6,
      ...shadows.sm,
    },
    reminderStatText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    reminderStatBold: {
      fontWeight: '700',
      color: colors.text,
    },

    // ── Section header ──
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 22,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    sectionBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
    },
    sectionBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textInverse,
    },

    // ── User card ──
    userCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
      ...shadows.sm,
    },
    userCardPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    userCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarAdmin: {
      backgroundColor: colors.accentSoft,
      borderWidth: 2,
      borderColor: colors.accent,
    },
    userInfo: {
      flex: 1,
    },
    userNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    userName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.3,
    },
    roleBadge: {
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 5,
    },
    roleBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.accent,
    },
    youBadge: {
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 5,
    },
    youBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
    },
    userLastActive: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 2,
    },

    // ── User stats row ──
    userStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceHover,
      borderRadius: 10,
      padding: 10,
      marginTop: 12,
    },
    userStat: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },
    userStatValue: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
    },
    userStatLabel: {
      fontSize: 11,
      color: colors.textTertiary,
      fontWeight: '500',
    },
    userStatDivider: {
      width: 1,
      height: 16,
      backgroundColor: colors.border,
    },

    // ── User action chips ──
    userActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
    },
    actionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: colors.accentSoft,
    },
    deleteChip: {
      backgroundColor: colors.dangerSoft,
    },
    actionChipPressed: {
      opacity: 0.7,
    },
    actionChipText: {
      fontSize: 12,
      fontWeight: '600',
    },

    // ── Error screen ──
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
      padding: 40,
    },
    errorIconCircle: {
      width: 70,
      height: 70,
      borderRadius: 22,
      backgroundColor: colors.dangerSoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    errorText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    backButtonLarge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 14,
      marginTop: 14,
      ...shadows.md,
    },
    backButtonLargeText: {
      color: colors.textInverse,
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
