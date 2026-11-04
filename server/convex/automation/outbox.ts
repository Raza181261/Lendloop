import { Id } from "../_generated/dataModel";
import { MutationCtx } from "../_generated/server";
import { internal } from "../_generated/api";

type EnqueueArgs = {
  eventKey: string; // unique, e.g. "request:<id>:approved"
  type: "request.created" | "request.status_changed" | "loan.returned";
  requestId: Id<"requests">;
};

// Saved in the SAME transaction as the business change. The send is scheduled
// in that transaction too, so it only runs if the change was committed.
export async function enqueueEvent(ctx: MutationCtx, args: EnqueueArgs) {
  const existing = await ctx.db
    .query("automationEvents")
    .withIndex("by_event_key", (q) => q.eq("eventKey", args.eventKey))
    .first();
  if (existing) return existing._id;

  const eventId = await ctx.db.insert("automationEvents", {
    eventKey: args.eventKey,
    type: args.type,
    requestId: args.requestId,
    status: "pending",
    attempts: 0,
  });

  await ctx.scheduler.runAfter(0, internal.automation.dispatch.sendEvent, {
    eventId,
  });
  return eventId;
}