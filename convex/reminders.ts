import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Enrich with medication data
    const enriched = await Promise.all(
      reminders.map(async (reminder) => {
        const medication = await ctx.db.get(reminder.medicationId);
        return {
          ...reminder,
          medicationName: medication?.name ?? "Unknown",
          medicationDosage: medication?.dosage ?? "",
        };
      }),
    );

    return enriched;
  },
});

export const add = mutation({
  args: {
    userId: v.id("users"),
    medicationId: v.id("medications"),
    time: v.string(),
    days: v.array(v.string()),
    notificationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reminders", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("reminders"),
    time: v.optional(v.string()),
    days: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
    notificationId: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
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
  args: { id: v.id("reminders") },
  handler: async (ctx, { id }) => {
    const reminder = await ctx.db.get(id);
    if (!reminder) throw new Error("Reminder not found");
    await ctx.db.patch(id, { isActive: !reminder.isActive });
  },
});

export const remove = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});
