"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@server/_generated/api";
import type { Id } from "@server/_generated/dataModel";
import { useRun } from "@/hooks/useRun";
import { CATEGORIES, CONDITIONS, LIMITS, label } from "../constants";

// Copy the same `field` class string you use in ToolForm.tsx if you changed it.
const field =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-black placeholder:text-stone-500 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600";

type Tool = {
  name: string;
  category: string;
  condition: string;
  description: string;
};

function Form({ toolId, tool }: { toolId: Id<"tools">; tool: Tool }) {
  const router = useRouter();
  const update = useMutation(api.tools.mutations.update);
  const { busy, error, run } = useRun();
  // const [v, setV] = useState(tool);

  const [v, setV] = useState<Tool>({
    name: tool.name,
    category: tool.category,
    condition: tool.condition,
    description: tool.description,
  });
  const set =
    (k: keyof Tool) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setV({ ...v, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      // await update({ toolId, ...v, name: v.name.trim() });

      await update({
        toolId,
        name: v.name.trim(),
        category: v.category,
        condition: v.condition,
        description: v.description,
      });
      router.push("/my-listings");
    });
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-xl border border-stone-200 bg-white p-6"
    >
      <label className="block text-sm font-medium text-black">
        Tool name
        <input
          className={field}
          value={v.name}
          onChange={set("name")}
          maxLength={LIMITS.nameMax}
          required
        />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-black">
          Category
          <select
            className={field}
            value={v.category}
            onChange={set("category")}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {label(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-black">
          Condition
          <select
            className={field}
            value={v.condition}
            onChange={set("condition")}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {label(c)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium text-black">
        Short description
        <textarea
          className={field}
          rows={3}
          value={v.description}
          onChange={set("description")}
          maxLength={LIMITS.descriptionMax}
        />
      </label>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export function EditTool() {
  const { toolId } = useParams<{ toolId: string }>();
  const id = toolId as Id<"tools">;
  const tool = useQuery(api.tools.queries.getById, { toolId: id });

  if (tool === undefined)
    return <div className="h-40 animate-pulse rounded-xl bg-stone-200" />;
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Edit listing</h1>
      <Form toolId={id} tool={tool} />
    </div>
  );
}
