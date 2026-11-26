"use client";

import { ReactNode } from "react";
import { useStoreUser } from "@/features/auth/hooks/useStoreUser";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { Navbar } from "./Navbar";
import { ChatWidget } from "@/features/chatbot";

// Waits until the Convex user record exists before rendering any page, so
// pages never run authenticated queries too early.
export function AppShell({ children }: { children: ReactNode }) {
  useStoreUser();
  const me = useCurrentUser();

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center text-stone-500">
        Loading your account…
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      <ChatWidget />
    </>
  );
}