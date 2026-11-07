"use client";

import { ReactNode } from "react";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

// UI convenience only. The real protection is requireAdmin in Convex:
// a non-admin calling these functions directly is rejected there.
export function AdminGate({ children }: { children: ReactNode }) {
  const me = useCurrentUser();

  if (me === undefined) return <div className="h-40 animate-pulse rounded-xl bg-stone-200" />;
  if (!me || me.role !== "admin") {
    return (
      <p className="rounded-xl border border-stone-200 bg-white p-10 text-center text-stone-600">
        You don't have access to this area.
      </p>
    );
  }
  return <>{children}</>;
}