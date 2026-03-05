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