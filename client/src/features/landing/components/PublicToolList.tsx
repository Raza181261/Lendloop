"use client";

import { useQuery } from "convex/react";
import { api } from "@server/_generated/api";

const label = (category: string) => {
  const text = category.replace(/-/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export function PublicToolList() {
  const tools = useQuery(api.tools.queries.listPublic);

  return (
    <section className="mx-auto max-w-3xl px-6 pb-20">
      <h2 className="mb-4 text-lg font-semibold">
        Available in the neighborhood
      </h2>

      {tools === undefined && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-stone-200"
            />
          ))}
        </div>
      )}

      {tools && tools.length === 0 && (
        <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-stone-500">
          No tools listed yet. Sign in and be the first to lend one.
        </p>
      )}

      {tools && tools.length > 0 && (
        <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {tools.map((tool, i) => (
            <li key={i} className="flex items-center text-stone-700 justify-between px-4 py-3">
              <span className="font-medium">{tool.name}</span>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
                {label(tool.category)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
