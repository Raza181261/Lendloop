import { ToolCard, ToolView } from "./ToolCard";

export function ToolGrid({ tools }: { tools: ToolView[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((t) => (
        <ToolCard key={t._id} tool={t} />
      ))}
    </ul>
  );
}