"use client";

import { useEffect, useRef, useState } from "react";
// import { useConvex } from "convex/react";
import { useAction } from "convex/react";
import { api } from "@server/_generated/api";
import { errorMessage } from "@/lib/errors";

type Msg = { from: "me" | "bot"; text: string; lines?: string[] };

const SUGGESTIONS = [
  "How many tools am I borrowing?",
  "How many did I return?",
  "When is each tool due back?",
  "How many tools are remaining?",
];

export function ChatWidget() {
  const chat = useAction(api.ai.agent.chat);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { from: "bot", text: "Hi! Ask me about your loans and tools." },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setInput("");
    setMessages((m) => [...m, { from: "me", text: question }]);
    setBusy(true);
    try {
      const history = messages.map((m) => ({
        role: m.from === "me" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));
      const res = await chat({ question, history });
      setMessages((m) => [...m, { from: "bot", text: res.text }]);
    } catch (e) {
      setMessages((m) => [...m, { from: "bot", text: errorMessage(e) }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between bg-emerald-700 px-4 py-3 text-white">
            <p className="text-sm font-semibold">LendLoop assistant</p>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.from === "me" ? "text-right" : ""}>
                <div
                  className={`inline-block max-w-[85%] rounded-xl px-3 py-2 text-left ${
                    m.from === "me"
                      ? "bg-emerald-700 text-white"
                      : "bg-stone-100 text-stone-900"
                  }`}
                >
                  <p>{m.text}</p>
                  {m.lines && m.lines.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                      {m.lines.map((l, j) => (
                        <li key={j}>{l}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
            {busy && <p className="text-xs text-stone-500">Thinking…</p>}
            <div ref={endRef} />
          </div>

          <div className="flex flex-wrap gap-2 border-t border-stone-200 px-3 pt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={busy}
                className="rounded-full border border-stone-300 px-2.5 py-1 text-[11px] text-stone-700 hover:bg-stone-50 disabled:opacity-60"
              >
                {s}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex gap-2 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={300}
              placeholder="Ask a question…"
              className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-black outline-none placeholder:text-stone-500 focus:border-emerald-600"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open chat"
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-700 text-2xl text-white shadow-lg hover:bg-emerald-800"
      >
        {open ? "×" : "💬"}
      </button>
    </div>
  );
}
