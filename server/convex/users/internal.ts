import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Run manually (CLI or dashboard) to create the first admin.
export const makeAdmin = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      throw new Error(
        `No user with email ${args.email}. Sign in once through the app first.`,
      );
    }

    await ctx.db.patch(user._id, { role: "admin" });
    return `${args.email} is now an admin.`;
  },
});

// // Run manually (CLI or dashboard) to turn an admin back into a normal user.
export const makeUser = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) throw new Error(`No user with email ${args.email}.`);

    await ctx.db.patch(user._id, { role: "user" });
    return `${args.email} is now a normal user.`;
  },
});