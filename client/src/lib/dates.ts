// Dates are stored as UTC day-start timestamps.
export const formatDate = (ts: number) =>
  new Date(ts).toISOString().slice(0, 10);

export const todayInput = () => new Date().toISOString().slice(0, 10);

// "2026-11-10" -> UTC midnight in ms (what the server expects)
export const inputToUtc = (value: string) => Date.parse(`${value}T00:00:00Z`);

export function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}
