import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId || callerId !== userId) return [];

    return await ctx.db
      .query("scans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("scans") },
  handler: async (ctx, { id }) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) return null;

    const scan = await ctx.db.get(id);
    if (!scan) return null;

    // Allow the owner or an admin with accepted oversight
    if (scan.userId === callerId) return scan;

    const caller = await ctx.db.get(callerId);
    if (caller?.role === "admin") {
      const oversight = await ctx.db
        .query("oversightRequests")
        .withIndex("by_admin_and_patient", (q) =>
          q.eq("adminId", callerId).eq("patientId", scan.userId),
        )
        .filter((q) => q.eq(q.field("status"), "accepted"))
        .first();
      if (oversight) return scan;
    }

    return null;
  },
});

export const save = mutation({
  args: {
    userId: v.id("users"),
    condition: v.optional(v.string()),
    extractedMedications: v.array(
      v.object({
        name: v.string(),
        dosage: v.string(),
        frequency: v.string(),
        confidence: v.optional(v.string()),
        purpose: v.optional(v.string()),
      }),
    ),
    interactions: v.array(
      v.object({
        drug1: v.string(),
        drug2: v.string(),
        severity: v.string(),
        description: v.string(),
      }),
    ),
    explanation: v.string(),
    imageStorageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId || callerId !== args.userId) {
      throw new Error("Unauthorized");
    }

    // Deduplicate medications by name before saving
    const seen = new Set<string>();
    const uniqueMedications = args.extractedMedications.filter((med) => {
      const key = med.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return await ctx.db.insert("scans", {
      ...args,
      extractedMedications: uniqueMedications,
      scannedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("scans") },
  handler: async (ctx, { id }) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Unauthorized");

    const scan = await ctx.db.get(id);
    if (!scan) return;

    if (scan.userId !== callerId) throw new Error("Unauthorized");

    await ctx.db.delete(id);
  },
});
