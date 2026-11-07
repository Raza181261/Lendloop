"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@server/_generated/api";
import type { Id } from "@server/_generated/dataModel";
import { LoanCard } from "@/features/loans/components/LoanCard";
import { MarkReturnedButton } from "@/features/loans/components/MarkReturnedButton";
import { useRun } from "@/hooks/useRun";
import { formatDate } from "@/lib/dates";

function ApproveDeclineButtons({ requestId }: { requestId: Id<"requests"> }) {
  const approve = useMutation(api.requests.mutations.approve);
  const decline = useMutation(api.requests.mutations.decline);
  const { busy, error, run } = useRun();
  return (
    <div className="text-right">
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={() => run(() => approve({ requestId }))}
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          Approve
        </button>
        <button
          disabled={busy}
          onClick={() => run(() => decline({ requestId }))}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
        >
          Decline
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

export function IncomingRequests() {
  const requests = useQuery(api.requests.queries.listIncoming, {});
  const loans = useQuery(api.loans.queries.listMine);
  const lending = loans?.lending.filter((l) => l.status === "active") ?? [];

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold">Incoming requests</h1>
        {requests === undefined && (
          <div className="h-20 animate-pulse rounded-xl bg-stone-200" />
        )}
        {requests && requests.length === 0 && (
          <p className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
            No pending requests.
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
                    {r.borrowerName} · {formatDate(r.startDate)} to{" "}
                    {formatDate(r.endDate)}
                  </p>
                  {r.message && (
                    <p className="mt-1 text-xs text-stone-600">"{r.message}"</p>
                  )}
                </div>
                <ApproveDeclineButtons requestId={r._id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {lending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Tools I've lent out</h2>
          <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
            {lending.map((l) => (
              <LoanCard
                key={l._id}
                loan={l}
                perspective="lender"
                action={<MarkReturnedButton loanId={l._id} />}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
