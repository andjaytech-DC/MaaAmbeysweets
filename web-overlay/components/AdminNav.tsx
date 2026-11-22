"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

const LINKS = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/enquiries", label: "Bulk enquiries" },
  { href: "/admin/coupons", label: "Offers" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/hero-slides", label: "Hero slides" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/brand", label: "Logo & brand" },
  { href: "/admin/marketing", label: "Marketing & Creators" },
];

export default function AdminNav() {
  const path = usePathname();
  const router = useRouter();
  if (path.startsWith("/admin/login")) return null;
  return (
    <nav aria-label="Admin" className="no-print border-b border-ink/10 bg-ink text-paper">
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
        {LINKS.map((l) => {
          const on = path.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link href={l.href} aria-current={on ? "page" : undefined} className={`block whitespace-nowrap px-4 py-3 text-sm font-medium ${on ? "border-b-2 border-kesar text-kesar" : "hover:text-kesar"}`}>{l.label}</Link>
            </li>
          );
        })}
        <li className="ml-auto">
          <button
            onClick={() => { const t = getToken(); if (t) api("/logout", { method: "POST", token: t }).catch(() => {}); clearToken(); router.push("/admin/login"); }}
            className="whitespace-nowrap px-4 py-3 text-sm font-medium hover:text-kesar"
          >Log out</button>
        </li>
      </ul>
    </nav>
  );
}
