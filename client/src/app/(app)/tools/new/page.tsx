import { ToolForm } from "@/features/tools/components/ToolForm";

export default function NewToolPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">List a tool</h1>
        <p className="text-sm text-stone-600">Share something you don't use every day.</p>
      </div>
      <ToolForm />
    </div>
  );
}