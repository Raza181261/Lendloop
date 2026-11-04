import { describe, expect, it } from "vitest";
import { internal } from "../../convex/_generated/api";
import { makeT, createUser, DAY, today } from "../helpers";

describe("reminder write-back idempotency", () => {
  it("same reminderKey never creates a second row", async () => {
    const t = makeT();
    const owner = await createUser(t, "owner");
    const borrower = await createUser(t, "borrower");

    const loanId = await t.run(async (ctx) => {
      const toolId = await ctx.db.insert("tools", {
        ownerId: owner.id,
        name: "Drill",
        category: "power-tools",
        condition: "good",
        description: "",
      });
      const requestId = await ctx.db.insert("requests", {
        toolId,
        borrowerId: borrower.id,
        ownerId: owner.id,
        startDate: today() - 5 * DAY,
        endDate: today() - 2 * DAY,
        status: "approved",
      });
      return ctx.db.insert("loans", {
        requestId,
        toolId,
        borrowerId: borrower.id,
        ownerId: owner.id,
        startDate: today() - 5 * DAY,
        dueDate: today() - 2 * DAY,
        status: "active",
      });
    });

    const day = new Date().toISOString().slice(0, 10);
    const args = {
      reminderKey: `${loanId}:${day}`,
      loanId,
      status: "sent" as const,
      channel: "mock",
    };

    const first = await t.mutation(
      internal.automation.reminders.recordReminder,
      args,
    );
    const second = await t.mutation(
      internal.automation.reminders.recordReminder,
      args,
    );

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(
      await t.run((ctx) => ctx.db.query("reminders").collect()),
    ).toHaveLength(1);

    // overdue query finds it, with the minimal fields
    const overdue = await t.query(internal.loans.queries.listOverdue, {});
    expect(overdue).toHaveLength(1);
    expect(Object.keys(overdue[0]).sort()).toEqual([
      "borrowerEmail",
      "borrowerName",
      "daysOverdue",
      "dueDate",
      "loanId",
      "reminderKey",
      "toolName",
    ]);
  });

  it("rejects a reminderKey that doesn't belong to the loan", async () => {
    const t = makeT();
    await expect(
      t.mutation(internal.automation.reminders.recordReminder, {
        reminderKey: "bad:2026-01-01",
        loanId: "nope",
        status: "sent",
        channel: "mock",
      }),
    ).rejects.toThrow();
  });
});
