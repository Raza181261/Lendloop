"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@server/_generated/api";
import { errorMessage } from "@/lib/errors";
import { CATEGORIES, CONDITIONS, LIMITS, label } from "../constants";

// const field =
//   "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600";

const field =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-stone-350 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600";

export function ToolForm() {
  const router = useRouter();
  const create = useMutation(api.tools.mutations.create);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [condition, setCondition] = useState<string>("good");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);



  async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError(null);

  const trimmed = name.trim();
  if (trimmed.length < LIMITS.nameMin || trimmed.length > LIMITS.nameMax) {
    setError(`Name must be ${LIMITS.nameMin}-${LIMITS.nameMax} characters.`);
    return;
  }

  setSaving(true);
  try {
    await create({ name: trimmed, category, condition, description });
    // Reset the form so it never looks stuck
    setName("");
    setDescription("");
    setCategory(CATEGORIES[0]);
    setCondition("good");
    setSaving(false);
    router.push("/tools");
  } catch (err) {
    setError(errorMessage(err));
    setSaving(false);
  }
}

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-xl border border-stone-200 bg-white p-6"
    >
      <label className="block text-sm text-stone-700 font-medium">
        Tool name
        <input
          className={field}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={LIMITS.nameMax}
          placeholder="e.g. Cordless drill"
          required
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm text-stone-700 font-medium">
          Category
          <select
            className={field}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {label(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-stone-700 font-medium">
          Condition
          <select
            className={field}
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {label(c)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm text-stone-700 font-medium">
        Short description
        <textarea
          className={field}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={LIMITS.descriptionMax}
          placeholder="Anything a borrower should know"
        />
        <span className="text-xs text-stone-500">
          {description.length}/{LIMITS.descriptionMax}
        </span>
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
        disabled={saving}
        className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {saving ? "Saving…" : "List this tool"}
      </button>
    </form>
  );
}
