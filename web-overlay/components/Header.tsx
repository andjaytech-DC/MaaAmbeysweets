"use client";
import BrandLogo from "@/components/BrandLogo";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import { SITE } from "@/lib/site";
import SocialLinks from "@/components/SocialLinks";
import { BTN_GOLD, GLASS_HEADER } from "@/lib/glass";

const LINKS = [
  { href: "/products", label: "All sweets" },
  { href: "/hampers", label: "Gift boxes" },
  { href: "/bulk-orders", label: "Bulk orders" },
  { href: "/track", label: "Track order" },
];

// Floating glass bar. On the home page the hero photo runs underneath it.
export default function Header() {
  const { count } = useCart();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  // close the mobile menu on Escape and whenever the page changes
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [open]);
  return (
    <header className="no-print sticky top-3 z-40 mt-3 px-3 sm:px-6">
      <div className={`relative mx-auto max-w-6xl rounded-[1.75rem] text-white shadow-[0_18px_50px_-18px_rgba(0,0,0,.6)] ${GLASS_HEADER} transition-colors ${scrolled ? "supports-[backdrop-filter]:to-jamun/92" : ""}`}>
        <div className="flex h-16 items-center gap-3 px-3 sm:h-[72px] sm:px-5">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label={`${SITE.name} home`}>
            <BrandLogo className="h-11 w-auto sm:h-14" />
            <span className="hidden leading-tight sm:block">
              <span className="block whitespace-nowrap font-display text-xl font-extrabold tracking-wide">MAA AMBEY <span className="text-kesar">SWEETS</span></span>
              <span className="block whitespace-nowrap text-[11px] tracking-[0.18em] text-white/80">MITHAI • NAMKEEN • GIFT BOXES</span>
            </span>
          </Link>

          <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => {
              const active = path === l.href || path.startsWith(l.href + "/");
              return (
                <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={`whitespace-nowrap rounded-full px-4 py-2 font-display text-lg font-semibold hover:bg-white/15 ${active ? "bg-white/20 underline decoration-kesar decoration-2 underline-offset-8" : ""}`}>
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <form action="/products" role="search" className="ml-auto hidden w-56 2xl:block">
            <label htmlFor="hdr-q" className="sr-only">Search sweets</label>
            <input id="hdr-q" name="q" placeholder="Search sweets…" className="h-11 w-full rounded-full border border-white/30 bg-white/15 px-5 text-white outline-none placeholder:text-white/75 focus:bg-white focus:text-ink focus:placeholder:text-muted" />
          </form>

          <div className="ml-auto flex items-center gap-2 2xl:ml-0">
            <SocialLinks variant="compact" className="hidden 2xl:block" />
            <Link href="/account" className={`hidden h-11 items-center rounded-full px-4 font-display text-lg font-semibold hover:bg-white/15 whitespace-nowrap sm:flex ${path.startsWith("/account") ? "bg-white/20" : ""}`}>Login</Link>
            <Link href="/cart" className={`relative grid h-11 min-w-11 place-items-center rounded-full px-5 font-display text-lg font-bold ${BTN_GOLD}`} aria-label={`Cart, ${count} items`}>
              Cart
              {count > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-gulab px-1 text-xs font-bold text-white">{count}</span>}
            </Link>
            <button className="grid h-11 w-11 place-items-center rounded-full border border-white/35 lg:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label="Menu" onClick={() => setOpen(!open)}>
              <span aria-hidden className="text-2xl leading-none">{open ? "×" : "≡"}</span>
            </button>
          </div>
        </div>

        {open && (
          <nav id="mobile-nav" aria-label="Mobile" className="border-t border-white/20 px-4 pb-3 pt-2 lg:hidden">
            <form action="/products" role="search" className="py-2">
              <label htmlFor="hdr-qm" className="sr-only">Search sweets</label>
              <input id="hdr-qm" name="q" placeholder="Search sweets…" className="h-11 w-full rounded-full border border-white/30 bg-white/15 px-5 text-white outline-none placeholder:text-white/75 focus:bg-white focus:text-ink" />
            </form>
            {[...LINKS, { href: "/account", label: "Login / Account" }].map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-xl px-2 py-3 font-display text-xl font-semibold hover:bg-white/10">{l.label}</Link>
            ))}
            <a href={`tel:+91${SITE.phone}`} className="mt-1 block rounded-xl px-2 py-3 text-white/90">Call us {SITE.phone}</a>
            <SocialLinks variant="compact" className="px-2 pb-1 pt-2" />
          </nav>
        )}
      </div>
    </header>
  );
}
