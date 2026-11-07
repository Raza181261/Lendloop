"use client";

import { SignInButton, UserButton } from "@clerk/nextjs";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
import { useStoreUser } from "../hooks/useStoreUser";
import Link from "next/link";

const primary =
  "rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800";

// function SignedInArea() {
//   useStoreUser();
//   return <UserButton />;
// }

function SignedInArea() {
  useStoreUser();
  return (
    <div className="flex items-center gap-3">
      <Link href="/tools" className={primary}>Open LendLoop</Link>
      <UserButton />
    </div>
  );
}

export function AuthButtons() {
  return (
    <>
      <AuthLoading>
        <div className="h-10 w-48 animate-pulse rounded-lg bg-stone-200" />
      </AuthLoading>
      <Unauthenticated>
        <SignInButton mode="modal">
          <button className={primary}>Sign in to lend or borrow</button>
        </SignInButton>
      </Unauthenticated>
      <Authenticated>
        <SignedInArea />
      </Authenticated>
    </>
  );
}