import { describe, expect, it, vi } from "vitest";
import { formatDate, inputToUtc, timeAgo } from "./dates";

describe("dates", () => {
  it("round-trips input and UTC day start", () => {
    expect(formatDate(inputToUtc("2026-11-10"))).toBe("2026-11-10");
  });
  it("timeAgo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-07T12:00:00Z"));
    expect(timeAgo(Date.parse("2026-11-05T12:00:00Z"))).toBe("2 days ago");
    expect(timeAgo(Date.parse("2026-11-07T11:59:30Z"))).toBe("just now");
    vi.useRealTimers();
  });
});
