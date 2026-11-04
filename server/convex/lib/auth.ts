import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { forbidden, unauthenticated } from "./errors";
import { isAdmin } from "./permissions";

type Ctx = QueryCtx | MutationCtx;

// Returns the signed-in user's DB record, or null (for public queries).
export async function getCurrentUserOrNull(
  ctx: Ctx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

// Must be signed in AND have a record in our users table.
export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw unauthenticated();

  const user = await getCurrentUserOrNull(ctx);
  if (!user) throw unauthenticated("Account is not set up yet. Please retry.");
  return user;
}

// Must be signed in AND be an admin (role read from the DB, never the client).
export async function requireAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (!isAdmin(user)) throw forbidden("Admin access required.");
  return user;
}

// Generic ownership check for a resource's owner id.
export function requireOwner(user: Doc<"users">, ownerId: Id<"users">): void {
  if (user._id !== ownerId) throw forbidden("You don't own this resource.");
}

// Turns a permissions.ts check into a thrown error when it fails.
export function assertCan(allowed: boolean, message?: string): void {
  if (!allowed) throw forbidden(message);
}