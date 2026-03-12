import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

//  Admin sends oversight request to a patient
export const send = mutation({
  args: {
    patientId: v.id("users"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { patientId, note }) => {
    const adminId = await getAuthUserId(ctx);
    if (!adminId) throw new Error("Not authenticated");

    const admin = await ctx.db.get(adminId);
    if (admin?.role !== "admin") throw new Error("Not authorized");

    const existing = await ctx.db
      .query("oversightRequests")
      .withIndex("by_admin_and_patient", (q) =>
        q.eq("adminId", adminId).eq("patientId", patientId),
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "accepted"),
        ),
      )
      .first();
    if (existing) throw new Error("Request already exists for this patient");

    return ctx.db.insert("oversightRequests", {
      adminId,
      patientId,
      status: "pending",
      note,
      requestedAt: Date.now(),
    });
  },
});

//  Patient responds to an oversight request
export const respond = mutation({
  args: {
    requestId: v.id("oversightRequests"),
    response: v.union(v.literal("accepted"), v.literal("rejected")),
  },
  handler: async (ctx, { requestId, response }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const req = await ctx.db.get(requestId);
    if (!req) throw new Error("Not found");
    if (req.patientId !== userId) throw new Error("Not your request");
    if (req.status !== "pending") throw new Error("Already responded");

    await ctx.db.patch(requestId, {
      status: response,
      respondedAt: Date.now(),
    });
  },
});

//  Revoke oversight (either party)
export const revoke = mutation({
  args: { requestId: v.id("oversightRequests") },
  handler: async (ctx, { requestId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const req = await ctx.db.get(requestId);
    if (!req) throw new Error("Not found");
    if (req.adminId !== userId && req.patientId !== userId)
      throw new Error("Not authorized");

    await ctx.db.patch(requestId, { status: "revoked" });
  },
});

//  Patient: incoming pending oversight requests
export const myIncoming = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const requests = await ctx.db
      .query("oversightRequests")
      .withIndex("by_patient", (q) => q.eq("patientId", userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return Promise.all(
      requests.map(async (r) => {
        const admin = await ctx.db.get(r.adminId);
        return { ...r, adminName: admin?.name ?? "Unknown Admin" };
      }),
    );
  },
});

//  Admin: their accepted oversight patients
export const myPatients = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const requests = await ctx.db
      .query("oversightRequests")
      .withIndex("by_admin", (q) => q.eq("adminId", userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    return Promise.all(
      requests.map(async (r) => {
        const patient = await ctx.db.get(r.patientId);
        return {
          ...r,
          patientName: patient?.name ?? "Unknown Patient",
          patientEmail: patient?.email ?? "",
        };
      }),
    );
  },
});
