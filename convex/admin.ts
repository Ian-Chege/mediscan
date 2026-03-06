import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helper: verify requesting user is an admin
async function requireAdmin(ctx: any, adminId: string) {
  const user = await ctx.db.get(adminId);
  if (!user || (user.role !== "admin")) {
    throw new Error("Unauthorized: admin access required");
  }
  return user;
}

// ── Users ──

export const listUsers = query({
  args: { adminId: v.id("users") },
  handler: async (ctx, { adminId }) => {
    await requireAdmin(ctx, adminId);
    const users = await ctx.db.query("users").order("desc").collect();

    // Enrich with counts
    const enriched = await Promise.all(
      users.map(async (user) => {
        const meds = await ctx.db
          .query("medications")
          .withIndex("by_user", (q: any) => q.eq("userId", user._id))
          .collect();
        const scans = await ctx.db
          .query("scans")
          .withIndex("by_user", (q: any) => q.eq("userId", user._id))
          .collect();
        const reminders = await ctx.db
          .query("reminders")
          .withIndex("by_user", (q: any) => q.eq("userId", user._id))
          .collect();

        const lastScan = scans.sort((a, b) => b.scannedAt - a.scannedAt)[0];
        const activeMedCount = meds.filter((m) => m.isActive).length;

        return {
          ...user,
          medicationCount: meds.length,
          activeMedCount,
          scanCount: scans.length,
          reminderCount: reminders.length,
          lastActivity: lastScan?.scannedAt ?? user.createdAt,
        };
      }),
    );

    return enriched;
  },
});

export const getUserDetail = query({
  args: { adminId: v.id("users"), userId: v.id("users") },
  handler: async (ctx, { adminId, userId }) => {
    await requireAdmin(ctx, adminId);

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const medications = await ctx.db
      .query("medications")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const scans = await ctx.db
      .query("scans")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Enrich reminders with med names
    const enrichedReminders = await Promise.all(
      reminders.map(async (r) => {
        const med = await ctx.db.get(r.medicationId);
        return { ...r, medicationName: med?.name ?? "Unknown" };
      }),
    );

    return { user, medications, scans, reminders: enrichedReminders };
  },
});

// ── Stats ──

export const getStats = query({
  args: { adminId: v.id("users") },
  handler: async (ctx, { adminId }) => {
    await requireAdmin(ctx, adminId);

    const users = await ctx.db.query("users").collect();
    const medications = await ctx.db.query("medications").collect();
    const scans = await ctx.db.query("scans").collect();
    const reminders = await ctx.db.query("reminders").collect();

    const activeMeds = medications.filter((m) => m.isActive);
    const activeReminders = reminders.filter((r) => r.isActive);
    const adminCount = users.filter((u) => u.role === "admin").length;

    // Top medications (most frequently added across all users)
    const medCounts: Record<string, number> = {};
    for (const m of medications) {
      const name = m.name.toLowerCase();
      medCounts[name] = (medCounts[name] || 0) + 1;
    }
    const topMedications = Object.entries(medCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Interactions found across all scans
    let totalInteractions = 0;
    let highSeverity = 0;
    for (const scan of scans) {
      totalInteractions += scan.interactions.length;
      highSeverity += scan.interactions.filter((i) => i.severity === "high").length;
    }

    // Recent activity: last 5 scans
    const recentScans = scans
      .sort((a, b) => b.scannedAt - a.scannedAt)
      .slice(0, 5)
      .map((s) => ({
        id: s._id,
        userId: s.userId,
        medCount: s.extractedMedications.length,
        interactionCount: s.interactions.length,
        condition: s.condition ?? null,
        scannedAt: s.scannedAt,
      }));

    // Enrich recent scans with user names
    const recentScansEnriched = await Promise.all(
      recentScans.map(async (s) => {
        const user = await ctx.db.get(s.userId);
        return { ...s, userName: user?.name ?? "Anonymous" };
      }),
    );

    // Scans in last 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const scansThisWeek = scans.filter((s) => s.scannedAt > weekAgo).length;

    // Users with no scans
    const usersWithScans = new Set(scans.map((s) => s.userId.toString()));
    const inactiveUsers = users.filter((u) => !usersWithScans.has(u._id.toString())).length;

    return {
      totalUsers: users.length,
      adminCount,
      inactiveUsers,
      totalScans: scans.length,
      scansThisWeek,
      totalMedications: medications.length,
      activeMedications: activeMeds.length,
      totalReminders: reminders.length,
      activeReminders: activeReminders.length,
      totalInteractions,
      highSeverity,
      topMedications,
      recentScans: recentScansEnriched,
    };
  },
});

// ── Admin actions ──

export const deleteUser = mutation({
  args: { adminId: v.id("users"), userId: v.id("users") },
  handler: async (ctx, { adminId, userId }) => {
    await requireAdmin(ctx, adminId);
    if (adminId === userId) throw new Error("Cannot delete yourself");

    // Delete all user data
    const meds = await ctx.db
      .query("medications")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    for (const med of meds) {
      const reminders = await ctx.db
        .query("reminders")
        .withIndex("by_medication", (q: any) => q.eq("medicationId", med._id))
        .collect();
      for (const r of reminders) await ctx.db.delete(r._id);
      await ctx.db.delete(med._id);
    }

    const scans = await ctx.db
      .query("scans")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    for (const scan of scans) await ctx.db.delete(scan._id);

    const scheduleEntries = await ctx.db
      .query("scheduleEntries")
      .withIndex("by_user_date", (q: any) => q.eq("userId", userId))
      .collect();
    for (const entry of scheduleEntries) await ctx.db.delete(entry._id);

    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    for (const todo of todos) await ctx.db.delete(todo._id);

    await ctx.db.delete(userId);
  },
});

export const updateUserRole = mutation({
  args: {
    adminId: v.id("users"),
    userId: v.id("users"),
    role: v.string(),
  },
  handler: async (ctx, { adminId, userId, role }) => {
    await requireAdmin(ctx, adminId);
    if (role !== "admin" && role !== "patient") {
      throw new Error("Invalid role. Must be 'admin' or 'patient'.");
    }
    await ctx.db.patch(userId, { role });
  },
});

export const deleteMedication = mutation({
  args: { adminId: v.id("users"), medicationId: v.id("medications") },
  handler: async (ctx, { adminId, medicationId }) => {
    await requireAdmin(ctx, adminId);
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_medication", (q: any) => q.eq("medicationId", medicationId))
      .collect();
    for (const r of reminders) await ctx.db.delete(r._id);
    await ctx.db.delete(medicationId);
  },
});

export const deleteScan = mutation({
  args: { adminId: v.id("users"), scanId: v.id("scans") },
  handler: async (ctx, { adminId, scanId }) => {
    await requireAdmin(ctx, adminId);
    await ctx.db.delete(scanId);
  },
});
