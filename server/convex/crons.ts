import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Safety net: re-queue events that were never sent
crons.interval(
  "retry pending automation events",
  { minutes: 5 },
  internal.automation.dispatch.retryPending,
);

export default crons;