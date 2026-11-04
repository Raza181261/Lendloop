import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { assertCan, requireUser } from "../lib/auth";
import {
  canCancelRequest,
  canDecideRequest,
  canRequestTool,
} from "../lib/permissions";
import { conflict, notFound } from "../lib/errors";
import { enqueueEvent } from "../automation/outbox";
import {
  assertToolFree,
  assertTransition,
  validateDateRange,
  validateMessage,
} from "./rules";

const MAX_PENDING_PER_USER = 10;

export const create = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.number(),
    endDate: v.number(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const tool = await ctx.db.get(args.toolId);
    if (!tool) throw notFound("Tool not found.");
    assertCan(canRequestTool(user, tool), "You can't borrow your own tool.");

    const { startDate, endDate } = validateDateRange(
      args.startDate,
      args.endDate,
    );
    const message = validateMessage(args.message);

    await assertToolFree(ctx, tool._id, startDate, endDate);

    // No duplicate pending request for the same tool
    const pendingForTool = await ctx.db
      .query("requests")
      .withIndex("by_tool_status", (q) =>
        q.eq("toolId", tool._id).eq("status", "pending"),
      )
      .collect();
    if (pendingForTool.some((r) => r.borrowerId === user._id)) {
      throw conflict("You already have a pending request for this tool.");
    }

    // Abuse guard
    const myPending = await ctx.db
      .query("requests")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .take(MAX_PENDING_PER_USER + 1);
    if (myPending.length > MAX_PENDING_PER_USER) {
      throw conflict(`You can have at most ${MAX_PENDING_PER_USER} pending requests.`);
    }

    // borrowerId and ownerId come from the server, never from the client
    const requestId = await ctx.db.insert("requests", {
      toolId: tool._id,
      borrowerId: user._id,
      ownerId: tool.ownerId,
      startDate,
      endDate,
      message,
      status: "pending",
    });

    await enqueueEvent(ctx, {
      eventKey: `request:${requestId}:created`,
      type: "request.created",
      requestId,
    });

    return requestId;
  },
});

// Owner approves: request becomes "approved" and a loan is created.
export const approve = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw notFound("Request not found.");

    assertCan(canDecideRequest(user, req), "Only the tool owner can approve.");
    assertTransition(req.status, "approved");

    // Re-check: another request may have been approved in the meantime
    await assertToolFree(ctx, req.toolId, req.startDate, req.endDate);

    await ctx.db.patch(req._id, { status: "approved" });

    await ctx.db.insert("loans", {
      requestId: req._id,
      toolId: req.toolId,
      borrowerId: req.borrowerId,
      ownerId: req.ownerId,
      startDate: req.startDate,
      dueDate: req.endDate,
      status: "active",
    });

    await enqueueEvent(ctx, {
      eventKey: `request:${req._id}:approved`,
      type: "request.status_changed",
      requestId: req._id,
    });
  },
});

export const decline = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw notFound("Request not found.");

    assertCan(canDecideRequest(user, req), "Only the tool owner can decline.");
    assertTransition(req.status, "declined");

    await ctx.db.patch(req._id, { status: "declined" });

    await enqueueEvent(ctx, {
      eventKey: `request:${req._id}:declined`,
      type: "request.status_changed",
      requestId: req._id,
    });
  },
});

// Borrower withdraws their own pending request.
export const cancel = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw notFound("Request not found.");

    assertCan(canCancelRequest(user, req), "Only the borrower can cancel.");
    assertTransition(req.status, "cancelled");

    await ctx.db.patch(req._id, { status: "cancelled" });

    await enqueueEvent(ctx, {
      eventKey: `request:${req._id}:cancelled`,
      type: "request.status_changed",
      requestId: req._id,
    });
  },
});