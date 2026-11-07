export function AvailabilityBadge({ available }: { available: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        available ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      {available ? "Available" : "On loan"}
    </span>
  );
}