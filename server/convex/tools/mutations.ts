import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { assertCan, requireUser } from "../lib/auth";
import { canDeleteTool, canEditTool } from "../lib/permissions";
import { conflict, notFound } from "../lib/errors";
import { toolFieldsValidator, validateToolInput } from "./validators";

const MAX_LISTINGS_PER_USER = 50;

export const create = mutation({
  args: toolFieldsValidator,
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const clean = validateToolInput(args);

    // Basic abuse guard
    const mine = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .take(MAX_LISTINGS_PER_USER + 1);
    if (mine.length > MAX_LISTINGS_PER_USER) {
      throw conflict(`You can list at most ${MAX_LISTINGS_PER_USER} tools.`);
    }

    // ownerId comes from the server-side identity, never from the client
    return await ctx.db.insert("tools", { ...clean, ownerId: user._id });
  },
});

export const update = mutation({
  args: { toolId: v.id("tools"), ...toolFieldsValidator },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw notFound("Tool not found.");

    assertCan(canEditTool(user, tool), "Only the owner can edit this listing.");

    const { toolId, ...fields } = args;
    await ctx.db.patch(toolId, validateToolInput(fields));
  },
});

export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw notFound("Tool not found.");

    // Owner or admin
    assertCan(canDeleteTool(user, tool));

    // Can't delete a tool that is currently lent out
    const activeLoan = await ctx.db
      .query("loans")
      .withIndex("by_tool_status", (q) =>
        q.eq("toolId", args.toolId).eq("status", "active"),
      )
      .first();
    if (activeLoan) {
      throw conflict("This tool is currently on loan and can't be removed.");
    }

    // Close any pending requests so nothing is left dangling
    const pending = await ctx.db
      .query("requests")
      .withIndex("by_tool_status", (q) =>
        q.eq("toolId", args.toolId).eq("status", "pending"),
      )
      .collect();
    for (const r of pending) {
      await ctx.db.patch(r._id, { status: "cancelled" });
    }

    await ctx.db.delete(args.toolId);
  },
});
