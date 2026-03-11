import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getOrCreate = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, { name }) => {
    const userId = await ctx.db.insert("users", {
      name: name ?? "Anonymous",
      role: "patient",
      createdAt: Date.now(),
    });
    return userId;
  },
});

export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Safe version: accepts any string ID, returns null if not a valid user document.
// Used by UserContext to recover from a stale/corrupt stored ID.
export const safeGet = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    try {
      const doc = await ctx.db.get(id as any);
      // Reject if null or if the doc belongs to another table (has userId field)
      if (!doc || "userId" in doc) return null;
      return doc as any;
    } catch {
      return null;
    }
  },
});

export const updatePushToken = mutation({
  args: {
    id: v.id("users"),
    pushToken: v.string(),
  },
  handler: async (ctx, { id, pushToken }) => {
    await ctx.db.patch(id, { pushToken });
  },
});

export const setRole = mutation({
  args: {
    id: v.id("users"),
    role: v.string(),
  },
  handler: async (ctx, { id, role }) => {
    await ctx.db.patch(id, { role });
  },
});
