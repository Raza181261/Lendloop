import { internalQuery, query, QueryCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { requireAdmin, requireUser } from "../lib/auth";
import { daysOverdue, isOverdue, overdueCutoff } from "./rules";

// Bonus: last successful reminder for a loan (powers "Reminder sent 2 days ago")
async function lastReminderAt(ctx: QueryCtx, loan: Doc<"loans">) {
  const reminders = await ctx.db
    .query("reminders")
    .withIndex("by_loan", (q) => q.eq("loanId", loan._id))
    .order("desc")
    .take(20);
  const sent = reminders.filter((r) => r.status === "sent");
  return sent.length ? Math.max(...sent.map((r) => r.sentAt)) : undefined;
}

async function toView(ctx: QueryCtx, loan: Doc<"loans">, now: number) {
  const [tool, borrower, owner] = await Promise.all([
    ctx.db.get(loan.toolId),
    ctx.db.get(loan.borrowerId),
    ctx.db.get(loan.ownerId),
  ]);
  return {
    _id: loan._id,
    toolName: tool?.name ?? "Removed tool",
    borrowerName: borrower?.name ?? "Neighbor", // names only, no emails
    lenderName: owner?.name ?? "Neighbor",
    startDate: loan.startDate,
    dueDate: loan.dueDate,
    status: loan.status,
    returnedAt: loan.returnedAt,
    overdue: isOverdue(loan, now),
    lastReminderAt: await lastReminderAt(ctx, loan),
  };
}

// My loans, split by role
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    const [borrowing, lending] = await Promise.all([
      ctx.db.query("loans").withIndex("by_borrower", (q) => q.eq("borrowerId", user._id)).order("desc").take(100),
      ctx.db.query("loans").withIndex("by_owner", (q) => q.eq("ownerId", user._id)).order("desc").take(100),
    ]);

    return {
      borrowing: await Promise.all(borrowing.map((l) => toView(ctx, l, now))),
      lending: await Promise.all(lending.map((l) => toView(ctx, l, now))),
    };
  },
});

// Admin only: every loan
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const loans = await ctx.db.query("loans").order("desc").take(200);
    return await Promise.all(loans.map((l) => toView(ctx, l, now)));
  },
});

// INTERNAL: not callable from browsers. Our HTTP endpoint for n8n
// (built later) will call this after checking the API key.
// Returns only what a reminder needs.
export const listOverdue = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_status_due", (q) =>
        q.eq("status", "active").lt("dueDate", overdueCutoff(now)),
      )
      .take(200);

    const today = new Date(now).toISOString().slice(0, 10);

    return await Promise.all(
      loans.map(async (loan) => {
        const [tool, borrower] = await Promise.all([
          ctx.db.get(loan.toolId),
          ctx.db.get(loan.borrowerId),
        ]);
        return {
          loanId: loan._id,
          reminderKey: `${loan._id}:${today}`, // one reminder per loan per day
          toolName: tool?.name ?? "a tool",
          borrowerName: borrower?.name ?? "Neighbor",
          borrowerEmail: borrower?.email ?? "",
          dueDate: loan.dueDate,
          daysOverdue: daysOverdue(loan.dueDate, now),
        };
      }),
    );
  },
});