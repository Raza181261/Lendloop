import { describe, expect, it } from "vitest";
import { signPayload, verifySignature } from "./hmac";

const secret = "test-secret";
const body = '{"a":1}';

describe("hmac", () => {
  it("accepts a valid signature", async () => {
    const ts = Date.now();
    const sig = await signPayload(secret, ts, body);
    expect(
      await verifySignature({
        secret,
        timestamp: ts,
        body,
        signature: `sha256=${sig}`,
      }),
    ).toBe(true);
  });
  it("rejects a tampered body", async () => {
    const ts = Date.now();
    const sig = await signPayload(secret, ts, body);
    expect(
      await verifySignature({
        secret,
        timestamp: ts,
        body: '{"a":2}',
        signature: sig,
      }),
    ).toBe(false);
  });
  it("rejects a wrong secret", async () => {
    const ts = Date.now();
    const sig = await signPayload("other", ts, body);
    expect(
      await verifySignature({ secret, timestamp: ts, body, signature: sig }),
    ).toBe(false);
  });
  it("rejects an old timestamp (replay)", async () => {
    const ts = Date.now() - 10 * 60 * 1000;
    const sig = await signPayload(secret, ts, body);
    expect(
      await verifySignature({ secret, timestamp: ts, body, signature: sig }),
    ).toBe(false);
  });
});
