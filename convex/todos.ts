import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("todos")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .order("desc")
      .collect();
  },
});

export const add = mutation({
  args: {
    userId: v.id("users"),
    task: v.string(),
    medicationName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("todos", {
      userId: args.userId,
      task: args.task,
      medicationName: args.medicationName,
      completed: false,
      createdAt: Date.now(),
    });
  },
});

export const toggleComplete = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) return;
    await ctx.db.patch(args.id, { completed: !todo.completed });
  },
});

export const remove = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const addScheduled = mutation({
  args: {
    userId: v.id("users"),
    task: v.string(),
    medicationName: v.optional(v.string()),
    scheduledTime: v.optional(v.string()),
    scheduledDate: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("todos", {
      userId: args.userId,
      task: args.task,
      medicationName: args.medicationName,
      completed: false,
      scheduledTime: args.scheduledTime,
      scheduledDate: args.scheduledDate,
      status: args.status ?? "pending",
      createdAt: Date.now(),
    });
  },
});

export const toggleScheduled = mutation({
  args: {
    id: v.id("todos"),
    newStatus: v.string(),
    isMissed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) return;

    // Block marking "done" if the client says it's already missed
    if (args.newStatus === "done" && args.isMissed) {
      throw new Error("Cannot mark as done — more than 2 hours past scheduled time");
    }

    await ctx.db.patch(args.id, {
      status: args.newStatus,
      completed: args.newStatus === "done",
    });
  },
});

export const listByDate = query({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("scheduledDate", args.date),
      )
      .collect();

    return todos;
  },
});