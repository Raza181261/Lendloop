import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { signPayload } from "./hmac";

const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MS = [30_000, 120_000, 600_000, 3_600_000]; // 30s, 2m, 10m, 1h
const REQUEST_TIMEOUT_MS = 10_000;

const isoDay = (ts: number) => new Date(ts).toISOString().slice(0, 10);

// Builds the MINIMAL payload n8n needs: the recipient, the tool, the dates,
// the status and the other party's first-name-level info. No ids of users,
// no clerkId, no roles, no descriptions.
export const buildPayload = internalQuery({
  args: { eventId: v.id("automationEvents") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    const req = await ctx.db.get(event.requestId);
    if (!req) return null;

    const [tool, borrower, owner] = await Promise.all([
      ctx.db.get(req.toolId),
      ctx.db.get(req.borrowerId),
      ctx.db.get(req.ownerId),
    ]);
    if (!borrower || !owner) return null;

    // Who should be told?
    //  - new request            -> the lender (owner)
    //  - approved / declined    -> the borrower
    //  - cancelled              -> the lender (owner)
    //  - loan returned          -> the borrower
    let recipient = owner;
    let otherParty = borrower;
    const notifyBorrower =
      event.type === "loan.returned" ||
      (event.type === "request.status_changed" &&
        (req.status === "approved" || req.status === "declined"));
    if (notifyBorrower) {
      recipient = borrower;
      otherParty = owner;
    }

    return {
      eventId: event.eventKey, // n8n uses this as its idempotency key
      type: event.type,
      occurredAt: new Date(event._creationTime).toISOString(),
      recipient: { name: recipient.name, email: recipient.email },
      otherPartyName: otherParty.name,
      toolName: tool?.name ?? "a tool",
      startDate: isoDay(req.startDate),
      endDate: isoDay(req.endDate),
      status: event.type === "loan.returned" ? "returned" : req.status,
    };
  },
});

// Marks an attempt. Returns null if the event should NOT be sent
// (already sent, or out of attempts).
export const claim = internalMutation({
  args: { eventId: v.id("automationEvents") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || event.status === "sent" || event.attempts >= MAX_ATTEMPTS) {
      return null;
    }
    await ctx.db.patch(event._id, { attempts: event.attempts + 1 });
    return { eventKey: event.eventKey, attempts: event.attempts + 1 };
  },
});

export const markSent = internalMutation({
  args: { eventId: v.id("automationEvents") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      status: "sent",
      sentAt: Date.now(),
      lastError: undefined,
    });
  },
});

// Records the failure and schedules the next retry (or gives up visibly).
export const markFailed = internalMutation({
  args: {
    eventId: v.id("automationEvents"),
    error: v.string(),
    final: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return;

    const attempts = args.final ? MAX_ATTEMPTS : event.attempts;
    await ctx.db.patch(event._id, {
      status: "failed",
      attempts,
      lastError: args.error.slice(0, 300),
    });

    if (attempts < MAX_ATTEMPTS) {
      const delay =
        RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)];
      await ctx.scheduler.runAfter(delay, internal.automation.dispatch.sendEvent, {
        eventId: event._id,
      });
    }
    // attempts >= MAX: stays "failed" in the table = visible, never silent.
  },
});

export const sendEvent = internalAction({
  args: { eventId: v.id("automationEvents") },
  handler: async (ctx, args): Promise<void> => {
    const claimed = await ctx.runMutation(internal.automation.dispatch.claim, {
      eventId: args.eventId,
    });
    if (!claimed) return;

    const url = process.env.N8N_WEBHOOK_URL;
    const secret = process.env.N8N_HMAC_SECRET;
    if (!url || !secret) {
      await ctx.runMutation(internal.automation.dispatch.markFailed, {
        eventId: args.eventId,
        error: "N8N_WEBHOOK_URL or N8N_HMAC_SECRET is not set",
      });
      return;
    }

    const payload = await ctx.runQuery(internal.automation.dispatch.buildPayload, {
      eventId: args.eventId,
    });
    if (!payload) {
      // Related data is gone; retrying can never succeed.
      await ctx.runMutation(internal.automation.dispatch.markFailed, {
        eventId: args.eventId,
        error: "Related request or users no longer exist",
        final: true,
      });
      return;
    }

    const body = JSON.stringify(payload);
    const timestamp = Date.now();
    const signature = await signPayload(secret, timestamp, body);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-LendLoop-Timestamp": String(timestamp),
          "X-LendLoop-Signature": `sha256=${signature}`,
          "X-LendLoop-Event-Id": claimed.eventKey,
        },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!res.ok) throw new Error(`n8n responded with HTTP ${res.status}`);

      await ctx.runMutation(internal.automation.dispatch.markSent, {
        eventId: args.eventId,
      });
    } catch (err) {
      await ctx.runMutation(internal.automation.dispatch.markFailed, {
        eventId: args.eventId,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  },
});

// Safety net (called by cron): events that were saved but never picked up.
export const retryPending = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 2 * 60 * 1000; // skip brand-new events
    const stale = await ctx.db
      .query("automationEvents")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(50);

    for (const e of stale) {
      if (e._creationTime < cutoff && e.attempts < MAX_ATTEMPTS) {
        await ctx.scheduler.runAfter(0, internal.automation.dispatch.sendEvent, {
          eventId: e._id,
        });
      }
    }
  },
});