import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const roleValidator = v.union(v.literal("admin"), v.literal("user"));

export const requestStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("cancelled"),
);

export const loanStatusValidator = v.union(
  v.literal("active"),
  v.literal("returned"),
);

export default defineSchema({
  // Mirror of Clerk users. Role lives HERE, not in the client.
  users: defineTable({
    clerkId: v.string(), // identity.subject from Clerk JWT
    name: v.string(),
    email: v.string(),
    role: roleValidator,
    isTrustedLender: v.boolean(),
  }).index("by_clerk_id", ["clerkId"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category: v.string(), // power-tools, garden, kitchen, camping, ...
    condition: v.string(), // new, good, fair, worn
    description: v.string(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_category", ["category"]),

  // Borrow requests (dates are UTC timestamps in ms)
  requests: defineTable({
    toolId: v.id("tools"),
    borrowerId: v.id("users"),
    ownerId: v.id("users"), // denormalized so "incoming" is one indexed query
    startDate: v.number(),
    endDate: v.number(),
    message: v.optional(v.string()),
    status: requestStatusValidator,
  })
    .index("by_borrower", ["borrowerId"])
    .index("by_owner_status", ["ownerId", "status"])
    .index("by_tool_status", ["toolId", "status"]),

  // Created when a request is approved
  loans: defineTable({
    requestId: v.id("requests"),
    toolId: v.id("tools"),
    borrowerId: v.id("users"),
    ownerId: v.id("users"),
    startDate: v.number(),
    dueDate: v.number(),
    status: loanStatusValidator,
    returnedAt: v.optional(v.number()),
  })
    .index("by_request", ["requestId"])
    .index("by_tool_status", ["toolId", "status"])
    .index("by_borrower", ["borrowerId"])
    .index("by_owner", ["ownerId"])
    .index("by_status_due", ["status", "dueDate"]), // overdue query

  // Outbox: every event Convex must send to n8n
  automationEvents: defineTable({
    eventKey: v.string(), // unique, e.g. "request:<id>:approved"
    type: v.string(), // request.created | request.status_changed
    requestId: v.id("requests"),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    attempts: v.number(),
    lastError: v.optional(v.string()),
    sentAt: v.optional(v.number()),
  })
    .index("by_event_key", ["eventKey"])
    .index("by_status", ["status"]),

  // Reminder write-backs from n8n (idempotent)
  reminders: defineTable({
    reminderKey: v.string(), // unique, e.g. "<loanId>:2026-11-04"
    loanId: v.id("loans"),
    status: v.union(v.literal("sent"), v.literal("failed")),
    channel: v.string(), // email, slack, mock
    error: v.optional(v.string()),
    sentAt: v.number(),
  })
    .index("by_reminder_key", ["reminderKey"])
    .index("by_loan", ["loanId"]),
});
