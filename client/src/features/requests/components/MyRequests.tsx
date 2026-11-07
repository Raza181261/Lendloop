"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@server/_generated/api";
import type { Id } from "@server/_generated/dataModel";
import { LoanCard } from "@/features/loans/components/LoanCard";
import { useRun } from "@/hooks/useRun";
import { formatDate } from "@/lib/dates";
import { RequestStatusBadge } from "./RequestStatusBadge";

function CancelButton({ requestId }: { requestId: Id<"requests"> }) {
  const cancel = useMutation(api.requests.mutations.cancel);
  const { busy, error, run } = useRun();
  return (
    <div>
      <button
        disabled={busy}
        onClick={() => run(() => cancel({ requestId }))}
        className="text-sm text-red-700 hover:underline disabled:opacity-60"
      >
        {busy ? "Cancelling…" : "Cancel"}
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

export function MyRequests() {
  const requests = useQuery(api.requests.queries.listMine);
  const loans = useQuery(api.loans.queries.listMine);
  const borrowing = loans?.borrowing.filter((l) => l.status === "active") ?? [];

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold">My requests</h1>
        {requests === undefined && (
          <div className="h-20 animate-pulse rounded-xl bg-stone-200" />
        )}
        {requests && requests.length === 0 && (
          <p className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
            You haven't requested anything yet. Browse tools to get started.
          </p>
        )}
        {requests && requests.length > 0 && (
          <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
            {requests.map((r) => (
              <li
                key={r._id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-emerald-700">{r.toolName}</p>
                  <p className="text-xs text-stone-500">
                    Lender: {r.lenderName} · {formatDate(r.startDate)} to{" "}
                    {formatDate(r.endDate)}
                  </p>
                  {r.message && (
                    <p className="mt-1 text-xs text-stone-600">"{r.message}"</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <RequestStatusBadge status={r.status} />
                  {r.status === "pending" && <CancelButton requestId={r._id} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {borrowing.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Tools I'm borrowing</h2>
          <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
            {borrowing.map((l) => (
              <LoanCard key={l._id} loan={l} perspective="borrower" />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
