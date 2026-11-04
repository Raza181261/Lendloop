const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Signs `${timestamp}.${body}`. Including the timestamp stops replay attacks.
export async function signPayload(
  secret: string,
  timestamp: number,
  body: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${body}`),
  );
  return toHex(sig);
}

// Constant-time comparison (no early exit that leaks timing info)
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Used for signed requests coming IN (and in tests).
export async function verifySignature(opts: {
  secret: string;
  timestamp: number;
  body: string;
  signature: string; // "sha256=<hex>" or plain hex
  toleranceMs?: number;
  now?: number;
}): Promise<boolean> {
  const { secret, timestamp, body, signature } = opts;
  const tolerance = opts.toleranceMs ?? 5 * 60 * 1000;
  const now = opts.now ?? Date.now();

  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(now - timestamp) > tolerance) return false; // too old or future

  const expected = await signPayload(secret, timestamp, body);
  const given = signature.replace(/^sha256=/, "");
  return safeEqual(expected, given);
}