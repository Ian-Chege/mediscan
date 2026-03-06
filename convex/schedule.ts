import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getDailySchedule = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, { userId, date }) => {
    // Get all active reminders for this user
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const activeReminders = reminders.filter((r) => r.isActive);

    // Determine day of week from date string (YYYY-MM-DD)
    const dayOfWeek = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
    }).toLowerCase();

    // Filter reminders that apply to this day
    const todaysReminders = activeReminders.filter((r) => {
      if (r.days.includes("daily")) return true;
      return r.days.includes(dayOfWeek);
    });

    // Get existing schedule entries for this date
    const entries = await ctx.db
      .query("scheduleEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .collect();

    // Build schedule items by enriching reminders with medication data and taken status
    const schedule = await Promise.all(
      todaysReminders.map(async (reminder) => {
        const medication = await ctx.db.get(reminder.medicationId);
        const entry = entries.find(
          (e) => e.reminderId === reminder._id,
        );

        return {
          reminderId: reminder._id,
          medicationId: reminder.medicationId,
          medicationName: medication?.name ?? "Unknown",
          medicationDosage: medication?.dosage ?? "",
          time: reminder.time,
          taken: entry?.taken ?? false,
          takenAt: entry?.takenAt ?? null,
          entryId: entry?._id ?? null,
        };
      }),
    );

    // Sort by time
    schedule.sort((a, b) => a.time.localeCompare(b.time));

    return schedule;
  },
});

export const markTaken = mutation({
  args: {
    userId: v.id("users"),
    medicationId: v.id("medications"),
    reminderId: v.id("reminders"),
    date: v.string(),
    time: v.string(),
    taken: v.boolean(),
  },
  handler: async (ctx, { userId, medicationId, reminderId, date, time, taken }) => {
    // Check if entry already exists
    const existing = await ctx.db
      .query("scheduleEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .collect();

    const entry = existing.find((e) => e.reminderId === reminderId);

    if (entry) {
      await ctx.db.patch(entry._id, {
        taken,
        takenAt: taken ? Date.now() : undefined,
      });
    } else {
      await ctx.db.insert("scheduleEntries", {
        userId,
        medicationId,
        reminderId,
        date,
        time,
        taken,
        takenAt: taken ? Date.now() : undefined,
      });
    }
  },
});
