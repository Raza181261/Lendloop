import { RequestToolButton } from "@/features/requests/components/RequestToolButton";
import { label } from "../constants";
import { AvailabilityBadge } from "./AvailabilityBadge";
import { TrustedLenderBadge } from "./TrustedLenderBadge";
import type { Id } from "@server/_generated/dataModel";

export type ToolView = {
  _id: Id<"tools">;
  name: string;
  category: string;
  condition: string;
  description: string;
  available: boolean;
  ownerName: string;
  ownerId: Id<"users">;
  ownerIsTrusted: boolean;
};

export function ToolCard({ tool }: { tool: ToolView }) {
  return (
    <li className="flex flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-emerald-700">{tool.name}</h3>
        <AvailabilityBadge available={tool.available} />
      </div>
      <p className="mt-1 text-xs text-stone-500">
        {label(tool.category)} · Condition: {label(tool.condition)}
      </p>
      {tool.description && (
        <p className="mt-3 text-sm text-stone-700">{tool.description}</p>
      )}
      <div className="mt-4 flex items-center gap-2 text-xs text-stone-500">
        <span>Lender: {tool.ownerName}</span>
        {tool.ownerIsTrusted && <TrustedLenderBadge />}
      </div>
      <RequestToolButton toolId={tool._id} ownerId={tool.ownerId} />
    </li>
  );
}