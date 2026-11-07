"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@server/_generated/api";
import type { Id } from "@server/_generated/dataModel";
import { useRun } from "@/hooks/useRun";
import { label } from "../constants";
import { AvailabilityBadge } from "./AvailabilityBadge";

function DeleteButton({ toolId }: { toolId: Id<"tools"> }) {
  const remove = useMutation(api.tools.mutations.remove);
  const { busy, error, run } = useRun();
  return (
    <div>
      <button
        disabled={busy}
        onClick={() => {
          if (window.confirm("Delete this listing?"))
            void run(() => remove({ toolId }));
        }}
        className="text-sm text-red-700 hover:underline disabled:opacity-60"
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

export function MyListings() {
  const tools = useQuery(api.tools.queries.listMine);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold">My listings</h1>
        <Link
          href="/tools/new"
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          List a tool
        </Link>
      </div>

      {tools === undefined && (
        <div className="h-20 animate-pulse rounded-xl bg-stone-200" />
      )}
      {tools && tools.length === 0 && (
        <p className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
          You haven't listed anything yet.
        </p>
      )}
      {tools && tools.length > 0 && (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {tools.map((t) => (
            <li
              key={t._id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="font-medium text-emerald-700">{t.name}</p>
                <p className="text-xs text-stone-500">
                  {label(t.category)} · {label(t.condition)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <AvailabilityBadge available={t.available} />
                <Link
                  href={`/tools/${t._id}/edit`}
                  className="text-sm text-emerald-700 hover:underline"
                >
                  Edit
                </Link>
                <DeleteButton toolId={t._id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
