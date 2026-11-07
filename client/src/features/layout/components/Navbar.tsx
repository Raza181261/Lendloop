"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { siteConfig } from "@/config/site";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

const links = [
  { href: "/tools", text: "Browse" },
  { href: "/my-listings", text: "My listings" },
  { href: "/my-requests", text: "My requests" },
  { href: "/incoming-requests", text: "Incoming" },
  { href: "/tools/new", text: "List a tool" },
];

export function Navbar() {
  const pathname = usePathname();
  const me = useCurrentUser();
  const isAdmin = me?.role === "admin";

  const item = (href: string, text: string) => {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        className={`rounded-md px-3 py-2 text-sm font-medium transition ${
          active
            ? "bg-emerald-50 text-emerald-800"
            : "text-stone-600 hover:text-stone-900"
        }`}
      >
        {text}
      </Link>
    );
  };

  return (
    <nav className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-bold text-emerald-700">
            {siteConfig.name}
          </Link>
          <div className="flex gap-1">
            {links.map((l) => item(l.href, l.text))}
            {isAdmin && item("/admin", "Admin")}
          </div>
        </div>
        <UserButton />
      </div>
    </nav>
  );
}
