import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireUser } from "../lib/auth";
import { requestStatusValidator } from "../schema";

// My requests (as a borrower)
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .order("desc")
      .take(100);

    return await Promise.all(
      requests.map(async (r) => {
        const tool = await ctx.db.get(r.toolId);
        const owner = await ctx.db.get(r.ownerId);
        return {
          _id: r._id,
          toolName: tool?.name ?? "Removed tool",
          lenderName: owner?.name ?? "Neighbor",
          startDate: r.startDate,
          endDate: r.endDate,
          message: r.message,
          status: r.status,
        };
      }),
    );
  },
});

// Incoming requests (as a lender). Defaults to pending.
export const listIncoming = query({
  args: { status: v.optional(requestStatusValidator) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const status = args.status ?? "pending";

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_owner_status", (q) =>
        q.eq("ownerId", user._id).eq("status", status),
      )
      .order("desc")
      .take(100);

    return await Promise.all(
      requests.map(async (r) => {
        const tool = await ctx.db.get(r.toolId);
        const borrower = await ctx.db.get(r.borrowerId);
        return {
          _id: r._id,
          toolName: tool?.name ?? "Removed tool",
          borrowerName: borrower?.name ?? "Neighbor", // name only, no email
          startDate: r.startDate,
          endDate: r.endDate,
          message: r.message,
          status: r.status,
        };
      }),
    );
  },
});