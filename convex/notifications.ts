import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const sendPushToUser = action({
  args: {
    adminId: v.id("users"),
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { adminId, userId, title, body }) => {
    // Verify caller is admin
    const admin = await ctx.runQuery(internal.admin.getUser, { userId: adminId });
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: admin access required");
    }

    // Get patient's push token
    const user = await ctx.runQuery(internal.admin.getUser, { userId });
    if (!user?.pushToken) {
      throw new Error("Patient has no push token registered");
    }

    console.log(`Sending push to token: ${user.pushToken.substring(0, 30)}...`);

    // Send via Expo Push API
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        to: user.pushToken,
        title,
        body,
        sound: "default",
        priority: "high",
        channelId: "medication-reminders",
      }),
    });

    const result = await response.json();
    console.log("Expo push response:", JSON.stringify(result));

    if (!response.ok) {
      throw new Error(`Expo API error ${response.status}: ${JSON.stringify(result)}`);
    }

    // Expo returns 200 even on delivery failure — check the actual ticket status
    const ticket = result.data?.[0] ?? result;
    if (ticket.status === "error") {
      const detail = ticket.details?.error ?? ticket.message ?? "Unknown error";
      throw new Error(`Push failed: ${detail}`);
    }
  },
});
