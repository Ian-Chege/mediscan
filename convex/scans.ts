// Updated: scan logic refactored for better error handling
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
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
    return await ctx.db.get(id);
  },
});

export const save = mutation({
  args: {
    userId: v.id("users"),
    extractedMedications: v.array(
      v.object({
        name: v.string(),
        dosage: v.string(),
        frequency: v.string(),
        confidence: v.optional(v.string()),
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("scans", {
      ...args,
      scannedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("scans") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
