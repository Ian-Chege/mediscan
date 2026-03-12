import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  users: defineTable({
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    name: v.optional(v.string()),
    pushToken: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    role: v.optional(v.string()),
    adminStatus: v.optional(v.string()),
  })
    .index("by_role", ["role"])
    .index("by_email", ["email"]),

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
    condition: v.optional(v.string()),
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

  scheduleEntries: defineTable({
    userId: v.id("users"),
    medicationId: v.id("medications"),
    reminderId: v.optional(v.id("reminders")),
    date: v.string(),
    time: v.string(),
    taken: v.boolean(),
    takenAt: v.optional(v.number()),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_medication_date", ["medicationId", "date"]),

  oversightRequests: defineTable({
    adminId: v.id("users"),
    patientId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("revoked"),
    ),
    note: v.optional(v.string()),
    requestedAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_admin", ["adminId"])
    .index("by_patient", ["patientId"])
    .index("by_admin_and_patient", ["adminId", "patientId"]),
});
