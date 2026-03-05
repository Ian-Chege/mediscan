import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    pushToken: v.optional(v.string()),
    createdAt: v.number(),
  }),
  medications: defineTable({
    userId: v.id("users"),
    name: v.string(),
    dosage: v.string(),
    frequency: v.string(),
    instructions: v.optional(v.string()),
    purpose: v.optional(v.string()),
    isActive: v.boolean(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"]),
  reminders: defineTable({
    userId: v.id("users"),
    medicationId: v.id("medications"),
    time: v.string(),
    days: v.array(v.string()),
    isActive: v.boolean(),
    notificationId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_medication", ["medicationId"]),
  scans: defineTable({
    userId: v.id("users"),
    imageStorageId: v.optional(v.id("_storage")),
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
    scannedAt: v.number(),
  }).index("by_user", ["userId"]),
  todos: defineTable({
    userId: v.id("users"),
    task: v.string(),
    medicationName: v.optional(v.string()),
    completed: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});