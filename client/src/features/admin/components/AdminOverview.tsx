"use client";

import { useQuery } from "convex/react";
import { api } from "@server/_generated/api";
import { timeAgo } from "@/lib/dates";

export function AdminOverview() {
  const tools = useQuery(api.tools.queries.listAll, {});
  const loans = useQuery(api.loans.queries.listAll);
  const users = useQuery(api.users.queries.listUsers);
  const failed = useQuery(api.automation.activity.listFailedEvents);

  const stat = (title: string, value: number | undefined) => (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <p className="text-xs uppercase tracking-wide text-stone-500">{title}</p>
      <p className="mt-1 text-3xl font-bold text-emerald-700">{value ?? "…"}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-4">
        {stat("Users", users?.length)}
        {stat("Tools", tools?.length)}
        {stat(
          "Active loans",
          loans?.filter((l) => l.status === "active").length,
        )}
        {stat("Overdue", loans?.filter((l) => l.overdue).length)}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Failed automation events</h2>
        {failed === undefined && (
          <div className="h-16 animate-pulse rounded-xl bg-stone-200" />
        )}
        {failed && failed.length === 0 && (
          <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-stone-500">
            No failed events. Everything was delivered to n8n.
          </p>
        )}
        {failed && failed.length > 0 && (
          <ul className="divide-y divide-stone-200 rounded-xl border border-red-200 bg-white">
            {failed.map((e) => (
              <li key={e._id} className="px-4 py-3 text-sm">
                <p className="font-medium text-stone-800">
                  {e.type}{" "}
                  <span className="text-stone-500">
                    · {e.attempts} attempts · {timeAgo(e.createdAt)}
                  </span>
                </p>
                <p className="text-xs text-red-700">
                  {e.lastError ?? "Unknown error"}
                </p>
                <p className="text-xs text-stone-500">{e.eventKey}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}


