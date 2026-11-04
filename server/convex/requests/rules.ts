import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { conflict, invalid } from "../lib/errors";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_LOAN_DAYS = 14;
export const MAX_ADVANCE_DAYS = 90;
export const MESSAGE_MAX = 300;

type Status = Doc<"requests">["status"];

export const startOfUtcDay = (ts: number) => Math.floor(ts / DAY_MS) * DAY_MS;

// Both ends are inclusive days (UTC). Returns normalized timestamps.
export function validateDateRange(startDate: number, endDate: number) {
  if (!Number.isFinite(startDate) || !Number.isFinite(endDate)) {
    throw invalid("Invalid dates.");
  }
  const start = startOfUtcDay(startDate);
  const end = startOfUtcDay(endDate);
  const today = startOfUtcDay(Date.now());

  if (start < today) throw invalid("Start date can't be in the past.");
  if (end < start) throw invalid("End date must be on or after the start date.");
  if ((end - start) / DAY_MS + 1 > MAX_LOAN_DAYS) {
    throw invalid(`A loan can be at most ${MAX_LOAN_DAYS} days.`);
  }
  if (start - today > MAX_ADVANCE_DAYS * DAY_MS) {
    throw invalid(`You can request at most ${MAX_ADVANCE_DAYS} days ahead.`);
  }
  return { startDate: start, endDate: end };
}

export function validateMessage(message?: string) {
  const clean = message?.trim();
  if (!clean) return undefined;
  if (clean.length > MESSAGE_MAX) {
    throw invalid(`Message must be at most ${MESSAGE_MAX} characters.`);
  }
  return clean;
}

export const rangesOverlap = (
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
) => aStart <= bEnd && bStart <= aEnd;

// Throws if an active loan for this tool overlaps the given dates.
export async function assertToolFree(
  ctx: QueryCtx | MutationCtx,
  toolId: Id<"tools">,
  startDate: number,
  endDate: number,
) {
  const activeLoans = await ctx.db
    .query("loans")
    .withIndex("by_tool_status", (q) =>
      q.eq("toolId", toolId).eq("status", "active"),
    )
    .collect();

  const clash = activeLoans.some((l) =>
    rangesOverlap(startDate, endDate, l.startDate, l.dueDate),
  );
  if (clash) throw conflict("This tool is already booked for those dates.");
}

// State machine: only pending requests can change, everything else is final.
const TRANSITIONS: Record<Status, Status[]> = {
  pending: ["approved", "declined", "cancelled"],
  approved: [],
  declined: [],
  cancelled: [],
};

export function assertTransition(from: Status, to: Status) {
  if (!TRANSITIONS[from].includes(to)) {
    throw conflict(`A ${from} request can't become ${to}.`);
  }
}