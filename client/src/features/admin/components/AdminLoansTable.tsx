"use client";

import { useQuery } from "convex/react";
import { api } from "@server/_generated/api";
import { formatDate, timeAgo } from "@/lib/dates";

export function AdminLoansTable() {
  const loans = useQuery(api.loans.queries.listAll);
  if (loans === undefined)
    return <div className="h-24 animate-pulse rounded-xl bg-stone-200" />;
  if (loans.length === 0)
    return <p className="text-stone-500">No loans yet.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-stone-50 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-2">Tool</th>
            <th className="px-4 py-2">Lender</th>
            <th className="px-4 py-2">Borrower</th>
            <th className="px-4 py-2">Due</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Automation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200 text-stone-700">
          {loans.map((l) => (
            <tr key={l._id}>
              <td className="px-4 py-2 font-medium">{l.toolName}</td>
              <td className="px-4 py-2">{l.lenderName}</td>
              <td className="px-4 py-2">{l.borrowerName}</td>
              <td className="px-4 py-2">{formatDate(l.dueDate)}</td>
              <td className="px-4 py-2">
                {l.status === "returned" ? (
                  "Returned"
                ) : l.overdue ? (
                  <span className="font-medium text-red-700">Overdue</span>
                ) : (
                  "On loan"
                )}
              </td>
              <td className="px-4 py-2 text-xs text-sky-700">
                {l.lastReminderAt
                  ? `Reminder sent ${timeAgo(l.lastReminderAt)}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
