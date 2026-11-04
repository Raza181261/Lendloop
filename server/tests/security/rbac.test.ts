import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { createUser, makeT, DAY, today } from "../helpers";

const toolArgs = {
  name: "Drill",
  category: "power-tools",
  condition: "good",
  description: "18V",
};

describe("RBAC", () => {
  it("anonymous cannot list tools or create one", async () => {
    const t = makeT();
    await expect(t.query(api.tools.queries.listAll, {})).rejects.toThrow();
    await expect(
      t.mutation(api.tools.mutations.create, toolArgs),
    ).rejects.toThrow();
  });

  it("public list exposes only name and category", async () => {
    const t = makeT();
    const owner = await createUser(t, "owner");
    await owner.as.mutation(api.tools.mutations.create, toolArgs);
    const list = await t.query(api.tools.queries.listPublic, {});
    expect(list).toEqual([{ name: "Drill", category: "power-tools" }]);
  });

  it("a user cannot edit or delete someone else's tool", async () => {
    const t = makeT();
    const owner = await createUser(t, "owner");
    const other = await createUser(t, "other");
    const toolId = await owner.as.mutation(
      api.tools.mutations.create,
      toolArgs,
    );

    await expect(
      other.as.mutation(api.tools.mutations.update, {
        toolId,
        ...toolArgs,
        name: "Hacked",
      }),
    ).rejects.toThrow();
    await expect(
      other.as.mutation(api.tools.mutations.remove, { toolId }),
    ).rejects.toThrow();
  });

  it("an admin can delete any tool", async () => {
    const t = makeT();
    const owner = await createUser(t, "owner");
    const admin = await createUser(t, "admin", "admin");
    const toolId = await owner.as.mutation(
      api.tools.mutations.create,
      toolArgs,
    );
    await admin.as.mutation(api.tools.mutations.remove, { toolId });
    expect(await t.run((ctx) => ctx.db.get(toolId))).toBeNull();
  });

  it("a normal user cannot call admin functions", async () => {
    const t = makeT();
    const user = await createUser(t, "user1");
    await expect(
      user.as.query(api.users.queries.listUsers, {}),
    ).rejects.toThrow();
    await expect(
      user.as.query(api.loans.queries.listAll, {}),
    ).rejects.toThrow();
    await expect(
      user.as.mutation(api.users.mutations.setTrustedLender, {
        userId: user.id,
        isTrustedLender: true,
      }),
    ).rejects.toThrow();
  });

  it("only the owner can approve; approving creates a loan and an outbox event", async () => {
    const t = makeT();
    const owner = await createUser(t, "owner");
    const borrower = await createUser(t, "borrower");
    const toolId = await owner.as.mutation(
      api.tools.mutations.create,
      toolArgs,
    );

    const requestId = await borrower.as.mutation(
      api.requests.mutations.create,
      {
        toolId,
        startDate: today() + DAY,
        endDate: today() + 3 * DAY,
      },
    );

    await expect(
      borrower.as.mutation(api.requests.mutations.approve, { requestId }),
    ).rejects.toThrow();
    await owner.as.mutation(api.requests.mutations.approve, { requestId });

    const loans = await t.run((ctx) => ctx.db.query("loans").collect());
    expect(loans).toHaveLength(1);
    const events = await t.run((ctx) =>
      ctx.db.query("automationEvents").collect(),
    );
    expect(events.map((e) => e.eventKey).sort()).toEqual([
      `request:${requestId}:approved`,
      `request:${requestId}:created`,
    ]);

    // final state: can't approve twice
    await expect(
      owner.as.mutation(api.requests.mutations.approve, { requestId }),
    ).rejects.toThrow();
  });

  it("cannot borrow your own tool", async () => {
    const t = makeT();
    const owner = await createUser(t, "owner");
    const toolId = await owner.as.mutation(
      api.tools.mutations.create,
      toolArgs,
    );
    await expect(
      owner.as.mutation(api.requests.mutations.create, {
        toolId,
        startDate: today() + DAY,
        endDate: today() + 2 * DAY,
      }),
    ).rejects.toThrow();
  });
});
