const styles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  declined: "bg-red-100 text-red-800",
  cancelled: "bg-stone-200 text-stone-700",
};

export function RequestStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${styles[status] ?? styles.cancelled}`}
    >
      {status}
    </span>
  );
}
