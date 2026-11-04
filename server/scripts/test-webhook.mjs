import { createHmac } from "node:crypto";

const url = process.env.WEBHOOK_URL;
const secret = process.env.N8N_HMAC_SECRET;
const bad = process.argv.includes("--bad");
const eventId = process.argv.find((a) => a.startsWith("--id="))?.slice(5) ?? `test:${Date.now()}`;

if (!url || !secret) {
  console.error("Set WEBHOOK_URL and N8N_HMAC_SECRET");
  process.exit(1);
}

const body = JSON.stringify({
  eventId,
  type: "request.created",
  occurredAt: new Date().toISOString(),
  recipient: { name: "Test Lender", email: "lender@example.com" },
  otherPartyName: "Test Borrower",
  toolName: "Cordless Drill",
  startDate: "2026-11-10",
  endDate: "2026-11-12",
  status: "pending",
});

const timestamp = Date.now();
let signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
if (bad) signature = "0".repeat(64);

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-LendLoop-Timestamp": String(timestamp),
    "X-LendLoop-Signature": `sha256=${signature}`,
  },
  body,
});
console.log(res.status, await res.text());