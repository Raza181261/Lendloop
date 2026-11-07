"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@server/_generated/api";
import type { Id } from "@server/_generated/dataModel";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useRun } from "@/hooks/useRun";

function UserActions({
  userId,
  trusted,
  role,
  isMe,
}: {
  userId: Id<"users">;
  trusted: boolean;
  role: "admin" | "user";
  isMe: boolean;
}) {
  const setTrusted = useMutation(api.users.mutations.setTrustedLender);
  const setRole = useMutation(api.users.mutations.setRole);
  const { busy, error, run } = useRun();

  return (
    <div className="text-right">
      <div className="flex justify-end gap-4 text-sm">
        <button
          disabled={busy}
          onClick={() =>
            run(() => setTrusted({ userId, isTrustedLender: !trusted }))
          }
          className="text-sky-700 hover:underline disabled:opacity-60"
        >
          {trusted ? "Remove trusted" : "Make trusted lender"}
        </button>
        {!isMe && (
          <button
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  `Change role to ${role === "admin" ? "user" : "admin"}?`,
                )
              )
                void run(() =>
                  setRole({
                    userId,
                    role: role === "admin" ? "user" : "admin",
                  }),
                );
            }}
            className="text-stone-600 hover:underline disabled:opacity-60"
          >
            {role === "admin" ? "Make user" : "Make admin"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

export function UsersTable() {
  const me = useCurrentUser();
  const users = useQuery(api.users.queries.listUsers);
  if (users === undefined)
    return <div className="h-24 animate-pulse rounded-xl bg-stone-200" />;

  return (
    <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
      {users.map((u) => (
        <li
          key={u._id}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <div>
            <p className="font-medium text-stone-700">
              {u.name}
              {u.role === "admin" && (
                <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800">
                  Admin
                </span>
              )}
              {u.isTrustedLender && (
                <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">
                  ✓ Trusted lender
                </span>
              )}
            </p>
            <p className="text-xs text-stone-500">{u.email}</p>
          </div>
          <UserActions
            userId={u._id}
            trusted={u.isTrustedLender}
            role={u.role}
            isMe={me?._id === u._id}
          />
        </li>
      ))}
    </ul>
  );
}
