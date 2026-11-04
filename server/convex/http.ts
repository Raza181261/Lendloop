import { httpRouter } from "convex/server";
import { ConvexError } from "convex/values";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { safeEqual, verifySignature } from "./automation/hmac";

const http = httpRouter();

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

// Authorization: Bearer <N8N_API_KEY>, compared in constant time
function hasValidApiKey(req: Request): boolean {
  const expected = process.env.N8N_API_KEY;
  if (!expected) return false; // fail closed if not configured
  const header = req.headers.get("Authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  return safeEqual(given, expected);
}

// n8n fetches overdue loans (minimal fields only)
http.route({
  path: "/n8n/overdue-loans",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!hasValidApiKey(req)) return json({ error: "Unauthorized" }, 401);

    const loans = await ctx.runQuery(internal.loans.queries.listOverdue, {});
    return json({ loans });
  }),
});

// n8n writes back the reminder result (idempotent)
http.route({
  path: "/n8n/reminders",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    // 1) API key
    if (!hasValidApiKey(req)) return json({ error: "Unauthorized" }, 401);

    // 2) HMAC signature over `${timestamp}.${rawBody}`
    const secret = process.env.N8N_HMAC_SECRET;
    if (!secret) return json({ error: "Server not configured" }, 500);

    const rawBody = await req.text();
    const timestamp = Number(req.headers.get("X-LendLoop-Timestamp"));
    const signature = req.headers.get("X-LendLoop-Signature") ?? "";

    const ok = await verifySignature({
      secret,
      timestamp,
      body: rawBody,
      signature,
    });
    if (!ok) return json({ error: "Invalid signature" }, 401);

    // 3) Parse and validate the shape
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawBody);
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const { reminderKey, loanId, status, channel, error } = data;
    if (
      typeof reminderKey !== "string" ||
      typeof loanId !== "string" ||
      typeof channel !== "string" ||
      (status !== "sent" && status !== "failed") ||
      (error !== undefined && typeof error !== "string")
    ) {
      return json({ error: "Invalid payload" }, 400);
    }

    // 4) Idempotent write
    try {
      const result = await ctx.runMutation(
        internal.automation.reminders.recordReminder,
        { reminderKey, loanId, status, channel, error },
      );
      return json({ ok: true, ...result });
    } catch (err) {
      if (err instanceof ConvexError) {
        return json({ error: "Rejected" }, 400);
      }
      return json({ error: "Server error" }, 500);
    }
  }),
});

export default http;