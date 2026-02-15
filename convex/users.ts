import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getOrCreate = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, { name }) => {
    // For MVP, create a new anonymous user
    // In production, you'd check for existing user via auth
    const userId = await ctx.db.insert("users", {
      name: name ?? "Anonymous",
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

export const updatePushToken = mutation({
  args: {
    id: v.id("users"),
    pushToken: v.string(),
  },
  handler: async (ctx, { id, pushToken }) => {
    await ctx.db.patch(id, { pushToken });
  },
});
