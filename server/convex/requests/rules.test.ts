import { describe, expect, it } from "vitest";
import {
  assertTransition,
  rangesOverlap,
  validateDateRange,
  DAY_MS,
} from "./rules";

describe("request rules", () => {
  it("detects overlapping ranges", () => {
    expect(rangesOverlap(1, 5, 5, 9)).toBe(true);
    expect(rangesOverlap(1, 4, 5, 9)).toBe(false);
  });
  it("final states cannot change", () => {
    expect(() => assertTransition("pending", "approved")).not.toThrow();
    expect(() => assertTransition("approved", "declined")).toThrow();
    expect(() => assertTransition("cancelled", "approved")).toThrow();
  });
  it("rejects past, reversed, and too-long ranges", () => {
    const now = Date.now();
    expect(() => validateDateRange(now - 3 * DAY_MS, now)).toThrow();
    expect(() => validateDateRange(now + 3 * DAY_MS, now + DAY_MS)).toThrow();
    expect(() => validateDateRange(now + DAY_MS, now + 30 * DAY_MS)).toThrow();
    expect(() =>
      validateDateRange(now + DAY_MS, now + 3 * DAY_MS),
    ).not.toThrow();
  });
});
