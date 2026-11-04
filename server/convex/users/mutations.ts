import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin, requireUser, assertCan } from "../lib/auth";
import { canManageUsers } from "../lib/permissions";
import { notFound, unauthenticated, invalid } from "../lib/errors";
import { roleValidator } from "../schema";

// Called by the client right after sign-in. Creates the user on first
// login (always with role "user") and keeps name/email in sync after that.
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw unauthenticated();

    const name = identity.name ?? identity.nickname ?? "Neighbor";
    const email = identity.email ?? "";

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      // Never touch role or isTrustedLender here
      if (existing.name !== name || existing.email !== email) {
        await ctx.db.patch(existing._id, { name, email });
      }
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name,
      email,
      role: "user", // everyone starts as a normal user
      isTrustedLender: false,
    });
  },
});

// Admin only: mark or unmark a lender as Trusted Lender.
export const setTrustedLender = mutation({
  args: { userId: v.id("users"), isTrustedLender: v.boolean() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    assertCan(canManageUsers(admin));

    const target = await ctx.db.get(args.userId);
    if (!target) throw notFound("User not found.");

    await ctx.db.patch(args.userId, { isTrustedLender: args.isTrustedLender });
  },
});

// Admin only: promote or demote a user.
export const setRole = mutation({
  args: { userId: v.id("users"), role: roleValidator },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    assertCan(canManageUsers(admin));

    // Prevent an admin from locking themselves (and possibly everyone) out
    if (admin._id === args.userId) {
      throw invalid("You can't change your own role.");
    }

    const target = await ctx.db.get(args.userId);
    if (!target) throw notFound("User not found.");

    await ctx.db.patch(args.userId, { role: args.role });
  },
});