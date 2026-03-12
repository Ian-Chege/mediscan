import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// get (existing API — used by UserContext useQuery)
export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

// getMe — returns the currently authenticated user
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return ctx.db.get(userId);
  },
});

// updatePushToken
export const updatePushToken = mutation({
  args: { pushToken: v.string() },
  handler: async (ctx, { pushToken }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, { pushToken });
  },
});

// listPatients — only accessible by admins
export const listPatients = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const caller = await ctx.db.get(userId);
    if (caller?.role !== "admin") return [];

    return ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "patient"))
      .collect();
  },
});
