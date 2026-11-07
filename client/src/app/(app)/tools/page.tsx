// "use client";

// import Link from "next/link";
// import { useState } from "react";
// import { useQuery } from "convex/react";
// import { api } from "@server/_generated/api";
// import { CategoryFilter } from "@/features/tools/components/CategoryFilter";
// import { ToolGrid } from "@/features/tools/components/ToolGrid";

// export default function BrowseToolsPage() {
//   const [category, setCategory] = useState<string | null>(null);
//   const tools = useQuery(
//     api.tools.queries.listAll,
//     category ? { category } : {},
//   );

//   return (
//     <div className="space-y-6">
//       <div className="flex items-end justify-between">
//         <div>
//           <h1 className="text-2xl font-bold">Browse tools</h1>
//           <p className="text-sm text-stone-600">Everything your neighbors are lending.</p>
//         </div>
//         <Link
//           href="/tools/new"
//           className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
//         >
//           List a tool
//         </Link>
//       </div>

//       <CategoryFilter value={category} onChange={setCategory} />

//       {tools === undefined && (
//         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
//           {[0, 1, 2].map((i) => (
//             <div key={i} className="h-36 animate-pulse rounded-xl bg-stone-200" />
//           ))}
//         </div>
//       )}

//       {tools && tools.length === 0 && (
//         <p className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
//           No tools here yet.
//         </p>
//       )}

//       {tools && tools.length > 0 && <ToolGrid tools={tools} />}
//     </div>
//   );
// }


import { BrowseTools } from "@/features/tools/components/BrowseTools";

export const instant = false;

export default function BrowseToolsPage() {
  return <BrowseTools />;
}