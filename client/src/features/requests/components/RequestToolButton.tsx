"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@server/_generated/api";
import type { Id } from "@server/_generated/dataModel";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useRun } from "@/hooks/useRun";
import { inputToUtc, todayInput } from "@/lib/dates";

const input =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-emerald-600";

export function RequestToolButton({
  toolId,
  ownerId,
}: {
  toolId: Id<"tools">;
  ownerId: Id<"users">;
}) {
  const me = useCurrentUser();
  const create = useMutation(api.requests.mutations.create);
  const { busy, error, run } = useRun();

  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [message, setMessage] = useState("");

  if (me && me._id === ownerId) {
    return <p className="mt-4 text-xs text-stone-500">Your listing</p>;
  }
  if (sent) {
    return (
      <p className="mt-4 text-sm font-medium text-emerald-700">
        Request sent ✓
      </p>
    );
  }
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 rounded-lg border border-emerald-700 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
      >
        Request to borrow
      </button>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!start || !end) return;
    await run(async () => {
      await create({
        toolId,
        startDate: inputToUtc(start),
        endDate: inputToUtc(end),
        message: message || undefined,
      });
      setSent(true);
    });
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 space-y-3 border-t border-stone-200 pt-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-medium text-black">
          From
          <input
            type="date"
            required
            min={todayInput()}
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              if (end && e.target.value > end) setEnd("");
            }}
            className={input}
          />
        </label>
        <label className="text-xs font-medium text-black">
          To
          <input
            type="date"
            required
            min={start || todayInput()}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={input}
          />
        </label>
      </div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={300}
        placeholder="Message to the lender (optional)"
        className={`${input} placeholder:text-stone-500`}
      />
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send request"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-2 text-sm text-stone-600 hover:text-stone-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
