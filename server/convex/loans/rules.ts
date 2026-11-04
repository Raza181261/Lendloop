import { DAY_MS, startOfUtcDay } from "../requests/rules";

// dueDate is stored as the start of the last day (UTC).
// A loan is overdue only once that whole day has ended.
export const overdueCutoff = (now: number) => startOfUtcDay(now);

export const isOverdue = (
  loan: { status: "active" | "returned"; dueDate: number },
  now: number,
) => loan.status === "active" && loan.dueDate < overdueCutoff(now);

export const daysOverdue = (dueDate: number, now: number) =>
  Math.max(0, Math.floor((startOfUtcDay(now) - dueDate) / DAY_MS));