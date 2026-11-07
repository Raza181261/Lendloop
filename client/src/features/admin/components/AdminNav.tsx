"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin", text: "Overview" },
  { href: "/admin/listings", text: "Listings" },
  { href: "/admin/loans", text: "Loans" },
  { href: "/admin/users", text: "Users" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-2 border-b border-stone-200 pb-3">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            pathname === t.href ? "bg-emerald-700 text-white" : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          {t.text}
        </Link>
      ))}
    </div>
  );
}