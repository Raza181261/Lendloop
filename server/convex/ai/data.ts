import { internalQuery, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { forbidden } from "../lib/errors";
import { daysOverdue, isOverdue } from "../loans/rules";

const day = (ts: number) => new Date(ts).toISOString().slice(0, 10);

async function loadUser(ctx: QueryCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) throw forbidden("Unknown user.");
  return user;
}

async function requireAdminId(ctx: QueryCtx, userId: Id<"users">) {
  const user = await loadUser(ctx, userId);
  if (user.role !== "admin") throw forbidden("Admin access required.");
  return user;
}

// Action calls this with identity.subject (from the verified JWT)
export const userByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const u = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    return u ? { id: u._id, name: u.name, role: u.role } : null;
  },
});

async function loanRow(ctx: QueryCtx, l: Doc<"loans">, now: number) {
  const [tool, borrower, owner] = await Promise.all([
    ctx.db.get(l.toolId),
    ctx.db.get(l.borrowerId),
    ctx.db.get(l.ownerId),
  ]);
  const late = isOverdue(l, now);
  return {
    tool: tool?.name ?? "Removed tool",
    borrower: borrower?.name ?? "Neighbor", // names only, never emails
    lender: owner?.name ?? "Neighbor",
    startDate: day(l.startDate),
    dueDate: day(l.dueDate), // the agreed return date
    status: l.status,
    returnedOn: l.returnedAt ? day(l.returnedAt) : null,
    overdue: late,
    daysOverdue: late ? daysOverdue(l.dueDate, now) : 0,
  };
}

// role: "borrowing" and "lending" are always about the caller.
// "all" needs admin, checked here again (not only in the agent).
export const loans = internalQuery({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("borrowing"),
      v.literal("lending"),
      v.literal("all"),
    ),
    status: v.union(
      v.literal("active"),
      v.literal("returned"),
      v.literal("overdue"),
      v.literal("any"),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let rows: Doc<"loans">[];

    if (args.role === "all") {
      await requireAdminId(ctx, args.userId);
      rows = await ctx.db.query("loans").order("desc").take(200);
    } else {
      await loadUser(ctx, args.userId);
      rows = await ctx.db
        .query("loans")
        .withIndex(
          args.role === "borrowing" ? "by_borrower" : "by_owner",
          (q) =>
            q.eq(
              args.role === "borrowing" ? "borrowerId" : "ownerId",
              args.userId,
            ),
        )
        .order("desc")
        .take(200);
    }

    const views = await Promise.all(rows.map((l) => loanRow(ctx, l, now)));
    const filtered = views.filter((l) =>
      args.status === "any"
        ? true
        : args.status === "overdue"
          ? l.overdue
          : l.status === args.status,
    );
    return { total: filtered.length, loans: filtered.slice(0, 25) };
  },
});

// Same numbers every signed-in user already sees in Browse
export const toolStats = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await loadUser(ctx, args.userId);
    const active = await ctx.db
      .query("loans")
      .withIndex("by_status_due", (q) => q.eq("status", "active"))
      .take(500);
    const busy = new Set(active.map((l) => l.toolId));
    const tools = await ctx.db.query("tools").take(1000);

    const byCategory: Record<string, { total: number; available: number }> = {};
    for (const t of tools) {
      const c = (byCategory[t.category] ??= { total: 0, available: 0 });
      c.total++;
      if (!busy.has(t._id)) c.available++;
    }
    return {
      totalTools: tools.length,
      availableTools: tools.filter((t) => !busy.has(t._id)).length,
      onLoanTools: tools.filter((t) => busy.has(t._id)).length,
      byCategory,
    };
  },
});

export const myListings = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await loadUser(ctx, args.userId);
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .take(100);
    const active = await ctx.db
      .query("loans")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .take(100);
    const busy = new Set(active.map((l) => l.toolId));
    return tools.map((t) => ({
      name: t.name,
      category: t.category,
      condition: t.condition,
      available: !busy.has(t._id),
    }));
  },
});

export const adminSummary = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdminId(ctx, args.userId);
    const now = Date.now();
    const loans = await ctx.db.query("loans").take(1000);
    const failed = await ctx.db
      .query("automationEvents")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .take(100);
    return {
      users: (await ctx.db.query("users").take(1000)).length,
      loansActive: loans.filter((l) => l.status === "active").length,
      loansReturned: loans.filter((l) => l.status === "returned").length,
      loansOverdue: loans.filter((l) => isOverdue(l, now)).length,
      failedAutomationEvents: failed.length,
    };
  },
});
