import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { assertCan, requireUser } from "../lib/auth";
import { canMarkReturned } from "../lib/permissions";
import { conflict, notFound } from "../lib/errors";
import { enqueueEvent } from "../automation/outbox";

// Lender confirms the tool is back.
export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const loan = await ctx.db.get(args.loanId);
    if (!loan) throw notFound("Loan not found.");

    assertCan(canMarkReturned(user, loan), "Only the lender can mark a loan as returned.");

    if (loan.status !== "active") {
      throw conflict("This loan is already marked as returned.");
    }

    await ctx.db.patch(loan._id, { status: "returned", returnedAt: Date.now() });

    await enqueueEvent(ctx, {
      eventKey: `loan:${loan._id}:returned`,
      type: "loan.returned",
      requestId: loan.requestId,
    });
  },
});