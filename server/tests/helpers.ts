import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { modules } from "./setup/modules";

export const makeT = () => convexTest(schema, modules);

type Role = "admin" | "user";

// Inserts a user row and returns { id, as } where `as` is a client
// acting as that signed-in user.
export async function createUser(
  t: ReturnType<typeof makeT>,
  clerkId: string,
  role: Role = "user",
) {
  const id = await t.run((ctx) =>
    ctx.db.insert("users", {
      clerkId,
      name: `Name ${clerkId}`,
      email: `${clerkId}@example.com`,
      role,
      isTrustedLender: false,
    }),
  );
  return { id, as: t.withIdentity({ subject: clerkId }) };
}

export const DAY = 86_400_000;
export const today = () => Math.floor(Date.now() / DAY) * DAY;