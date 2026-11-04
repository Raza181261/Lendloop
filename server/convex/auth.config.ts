import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      // Read from the Convex dashboard env, never hard-coded
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;