"use client";

import { useEffect } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@server/_generated/api";

// Runs once after sign-in. Calls users.store, which creates the user
// (role "user") on first login and syncs name/email afterwards.
export function useStoreUser() {
  const { isAuthenticated } = useConvexAuth();
  const store = useMutation(api.users.mutations.store);

  useEffect(() => {
    if (isAuthenticated) void store();
  }, [isAuthenticated, store]);
}