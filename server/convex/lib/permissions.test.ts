import { describe, expect, it } from "vitest";
import {
  canDeleteTool,
  canEditTool,
  canDecideRequest,
  canMarkReturned,
  canRequestTool,
} from "./permissions";

const u = (id: string, role: "admin" | "user" = "user") =>
  ({ _id: id, role }) as any;
const tool = { ownerId: "owner" } as any;
const req = { ownerId: "owner", borrowerId: "borrower" } as any;
const loan = { ownerId: "owner", borrowerId: "borrower" } as any;

describe("permissions", () => {
  it("only the owner edits a tool; admin does not", () => {
    expect(canEditTool(u("owner"), tool)).toBe(true);
    expect(canEditTool(u("x"), tool)).toBe(false);
    expect(canEditTool(u("a", "admin"), tool)).toBe(false);
  });
  it("owner or admin deletes a tool", () => {
    expect(canDeleteTool(u("owner"), tool)).toBe(true);
    expect(canDeleteTool(u("a", "admin"), tool)).toBe(true);
    expect(canDeleteTool(u("x"), tool)).toBe(false);
  });
  it("only the owner decides a request", () => {
    expect(canDecideRequest(u("owner"), req)).toBe(true);
    expect(canDecideRequest(u("borrower"), req)).toBe(false);
    expect(canDecideRequest(u("a", "admin"), req)).toBe(false);
  });
  it("only the lender marks returned", () => {
    expect(canMarkReturned(u("owner"), loan)).toBe(true);
    expect(canMarkReturned(u("borrower"), loan)).toBe(false);
  });
  it("can't borrow your own tool", () => {
    expect(canRequestTool(u("owner"), tool)).toBe(false);
    expect(canRequestTool(u("x"), tool)).toBe(true);
  });
});
