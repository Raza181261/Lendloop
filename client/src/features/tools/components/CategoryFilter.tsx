"use client";

import { CATEGORIES, label } from "../constants";

type Props = { value: string | null; onChange: (v: string | null) => void };

export function CategoryFilter({ value, onChange }: Props) {
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm transition ${
      active
        ? "border-emerald-700 bg-emerald-700 text-white"
        : "border-stone-300 bg-white text-stone-700 hover:border-stone-400"
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      <button className={chip(value === null)} onClick={() => onChange(null)}>
        All
      </button>
      {CATEGORIES.map((c) => (
        <button key={c} className={chip(value === c)} onClick={() => onChange(c)}>
          {label(c)}
        </button>
      ))}
    </div>
  );
}