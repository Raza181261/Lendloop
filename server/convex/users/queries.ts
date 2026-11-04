import { query } from "../_generated/server";
import { getCurrentUserOrNull, requireAdmin } from "../lib/auth";

// Returns the signed-in user's profile, or null if signed out / not stored yet.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return null;

    // Return only what the UI needs (no clerkId)
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isTrustedLender: user.isTrustedLender,
    };
  },
});

// Admin only: list all users for the admin panel.
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      isTrustedLender: u.isTrustedLender,
    }));
  },
});