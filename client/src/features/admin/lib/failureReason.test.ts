import { describe, expect, it } from "vitest";
import { eventTypeLabel, explainFailure } from "./failureReason";

describe("explainFailure", () => {
  it.each([
    ["error sending request for url (https://x)", "n8n unreachable"],
    ["n8n responded with HTTP 404", "Workflow not published"],
    ["n8n responded with HTTP 401", "Signature rejected"],
    ["n8n responded with HTTP 502", "n8n server error"],
    ["N8N_WEBHOOK_URL or N8N_HMAC_SECRET is not set", "Missing configuration"],
    ["Related request or users no longer exist", "Data was deleted"],
    ["???", "Unknown error"],
  ])("%s -> %s", (raw, reason) => {
    expect(explainFailure(raw).reason).toBe(reason);
  });

  it("handles undefined", () => {
    expect(explainFailure(undefined).reason).toBe("Unknown error");
  });

  it("labels event types", () => {
    expect(eventTypeLabel("loan.returned")).toBe("Loan returned");
  });
});
