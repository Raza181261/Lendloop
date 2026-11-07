"use client";

import { useQuery } from "convex/react";
import { api } from "@server/_generated/api";

// undefined = loading, null = signed out or not stored yet
export function useCurrentUser() {
  return useQuery(api.users.queries.getCurrentUser);
}