import { query } from "../_generated/server";
import { v } from "convex/values";
import { assertCan, requireAdmin, requireUser } from "../lib/auth";
import { notFound } from "../lib/errors";
import { canViewLoan } from "../lib/permissions";

// Recent automation activity on one loan (participants and admins only)
export const forLoan = query({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw notFound("Loan not found.");
    assertCan(canViewLoan(user, loan));

    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_loan", (q) => q.eq("loanId", args.loanId))
      .order("desc")
      .take(10);

    // No error text, no keys: just what the UI shows
    return reminders.map((r) => ({
      status: r.status,
      channel: r.channel,
      at: r.sentAt,
    }));
  },
});

// Admin only: events that exhausted their retries. Failures stay visible.
export const listFailedEvents = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const failed = await ctx.db
      .query("automationEvents")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .order("desc")
      .take(50);

    return failed.map((e) => ({
      _id: e._id,
      eventKey: e.eventKey,
      type: e.type,
      attempts: e.attempts,
      lastError: e.lastError,
      createdAt: e._creationTime,
    }));
  },
});