import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("medications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const listActive = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("medications")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", userId).eq("isActive", true),
      )
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("medications") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const add = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    dosage: v.string(),
    frequency: v.string(),
    instructions: v.optional(v.string()),
    purpose: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("medications", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("medications"),
    name: v.optional(v.string()),
    dosage: v.optional(v.string()),
    frequency: v.optional(v.string()),
    instructions: v.optional(v.string()),
    purpose: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...fields }) => {
    // Filter out undefined fields
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }
    await ctx.db.patch(id, updates);
  },
});

export const toggleActive = mutation({
  args: { id: v.id("medications") },
  handler: async (ctx, { id }) => {
    const medication = await ctx.db.get(id);
    if (!medication) throw new Error("Medication not found");
    await ctx.db.patch(id, { isActive: !medication.isActive });
  },
});

export const remove = mutation({
  args: { id: v.id("medications") },
  handler: async (ctx, { id }) => {
    // Delete associated reminders
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_medication", (q) => q.eq("medicationId", id))
      .collect();
    for (const reminder of reminders) {
      await ctx.db.delete(reminder._id);
    }
    // Delete associated schedule entries
    const entries = await ctx.db
      .query("scheduleEntries")
      .withIndex("by_medication_date", (q) => q.eq("medicationId", id))
      .collect();
    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }
    await ctx.db.delete(id);
  },
});
