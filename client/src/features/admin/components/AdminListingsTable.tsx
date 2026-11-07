"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@server/_generated/api";
import type { Id } from "@server/_generated/dataModel";
import { useRun } from "@/hooks/useRun";
import { label } from "@/features/tools/constants";
import { AvailabilityBadge } from "@/features/tools/components/AvailabilityBadge";

function RemoveButton({ toolId }: { toolId: Id<"tools"> }) {
  const remove = useMutation(api.tools.mutations.remove);
  const { busy, error, run } = useRun();
  return (
    <div className="text-right">
      <button
        disabled={busy}
        onClick={() => {
          if (window.confirm("Remove this listing?"))
            void run(() => remove({ toolId }));
        }}
        className="text-sm text-red-700 hover:underline disabled:opacity-60"
      >
        {busy ? "Removing…" : "Remove"}
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

export function AdminListingsTable() {
  const tools = useQuery(api.tools.queries.listAll, {});
  if (tools === undefined)
    return <div className="h-24 animate-pulse rounded-xl bg-stone-200" />;
  if (tools.length === 0) return <p className="text-stone-500">No listings.</p>;

  return (
    <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
      {tools.map((t) => (
        <li
          key={t._id}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <div>
            <p className="font-medium text-emerald-700">{t.name}</p>
            <p className="text-xs text-stone-500">
              {label(t.category)} · Lender: {t.ownerName}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <AvailabilityBadge available={t.available} />
            <RemoveButton toolId={t._id} />
          </div>
        </li>
      ))}
    </ul>
  );
}
