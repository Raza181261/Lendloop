"use client";

import { useMutation } from "convex/react";
import { api } from "@server/_generated/api";
import type { Id } from "@server/_generated/dataModel";
import { useRun } from "@/hooks/useRun";

export function MarkReturnedButton({ loanId }: { loanId: string }) {
  const markReturned = useMutation(api.loans.mutations.markReturned);
  const { busy, error, run } = useRun();
  return (
    <div className="text-right">
      <button
        disabled={busy}
        onClick={() =>
          run(() => markReturned({ loanId: loanId as Id<"loans"> }))
        }
        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Mark returned"}
      </button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
