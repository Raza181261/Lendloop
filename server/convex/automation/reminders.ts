import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { invalid, notFound } from "../lib/errors";

const CHANNELS = ["email", "slack", "discord", "mock"];
const KEY_PATTERN = /^[a-z0-9]+:\d{4}-\d{2}-\d{2}$/i; // "<loanId>:YYYY-MM-DD"

// Idempotent: the same reminderKey never creates a second row.
// A retry that arrives later is a harmless no-op.
export const recordReminder = internalMutation({
  args: {
    reminderKey: v.string(),
    loanId: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    channel: v.string(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const loanId = ctx.db.normalizeId("loans", args.loanId);
    if (!loanId) throw invalid("Invalid loanId.");

    if (
      !KEY_PATTERN.test(args.reminderKey) ||
      !args.reminderKey.startsWith(`${loanId}:`)
    ) {
      throw invalid("Invalid reminderKey.");
    }
    if (!CHANNELS.includes(args.channel)) throw invalid("Invalid channel.");

    const loan = await ctx.db.get(loanId);
    if (!loan) throw notFound("Loan not found.");

    const existing = await ctx.db
      .query("reminders")
      .withIndex("by_reminder_key", (q) => q.eq("reminderKey", args.reminderKey))
      .first();

    if (existing) {
      // A failed attempt may be upgraded to sent by a later retry.
      if (existing.status === "failed" && args.status === "sent") {
        await ctx.db.patch(existing._id, {
          status: "sent",
          channel: args.channel,
          error: undefined,
          sentAt: Date.now(),
        });
        return { created: false, updated: true };
      }
      return { created: false, updated: false };
    }

    await ctx.db.insert("reminders", {
      reminderKey: args.reminderKey,
      loanId,
      status: args.status,
      channel: args.channel,
      error: args.error?.slice(0, 300),
      sentAt: Date.now(),
    });
    return { created: true, updated: false };
  },
});