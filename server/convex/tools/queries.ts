import { query } from "../_generated/server";
import { v } from "convex/values";
import { QueryCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { requireUser } from "../lib/auth";
import { forbidden, notFound } from "../lib/errors";
import { isAdmin } from "../lib/permissions";

// Is the tool out on an active loan right now?
async function isOnLoan(ctx: QueryCtx, tool: Doc<"tools">) {
  const loan = await ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) =>
      q.eq("toolId", tool._id).eq("status", "active"),
    )
    .first();
  return loan !== null;
}

// PUBLIC (no sign-in): name + category only. No owner, no ids, no description.
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const tools = await ctx.db.query("tools").order("desc").take(100);
    return tools.map((t) => ({ name: t.name, category: t.category }));
  },
});

// SIGNED-IN: all tools with availability, optional category filter.
export const listAll = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireUser(ctx);

    const category = args.category;
    const tools = category
      ? await ctx.db
          .query("tools")
          .withIndex("by_category", (q) => q.eq("category", category))
          .take(200)
      : await ctx.db.query("tools").order("desc").take(200);

    return await Promise.all(
      tools.map(async (t) => {
        const owner = await ctx.db.get(t.ownerId);
        return {
          _id: t._id,
          name: t.name,
          category: t.category,
          condition: t.condition,
          description: t.description,
          available: !(await isOnLoan(ctx, t)),
          ownerId: t.ownerId,
          ownerName: owner?.name ?? "Neighbor",
          ownerIsTrusted: owner?.isTrustedLender ?? false,
        };
      }),
    );
  },
});

// SIGNED-IN: only my own listings.
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .take(200);

    return await Promise.all(
      tools.map(async (t) => ({
        _id: t._id,
        name: t.name,
        category: t.category,
        condition: t.condition,
        description: t.description,
        available: !(await isOnLoan(ctx, t)),
      })),
    );
  },
});

// SIGNED-IN: one tool (edit page). Owner or admin only.
export const getById = query({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw notFound("Tool not found.");

    if (tool.ownerId !== user._id && !isAdmin(user)) {
      throw forbidden();
    }

    return {
      _id: tool._id,
      name: tool.name,
      category: tool.category,
      condition: tool.condition,
      description: tool.description,
    };
  },
});