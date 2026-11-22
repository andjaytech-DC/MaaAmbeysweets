import RefTracker from "@/components/RefTracker";
import SocialLinks from "@/components/SocialLinks";
import BrandLogo from "@/components/BrandLogo";
import type { Metadata } from "next";
import Link from "next/link";
import { Baloo_2, Hind } from "next/font/google";
import Header from "@/components/Header";
import { CartProvider } from "@/lib/cart";
import { SITE } from "@/lib/site";
import { api, Category, WHATSAPP } from "@/lib/api";
import { Suspense } from "react";
import "./globals.css";

const display = Baloo_2({ weight: ["600", "700", "800"], subsets: ["latin", "devanagari"], variable: "--f-display", display: "swap" });
const body = Hind({ weight: ["400", "500", "600", "700"], subsets: ["latin", "devanagari"], variable: "--f-body", display: "swap" });

export const metadata: Metadata = {
  other: { "color-scheme": "light only" },
  title: SITE.name,
  description: SITE.tagline,
};

async function FooterCategories() {
  const cats = await api<Category[]>("/categories").catch(() => [] as Category[]);
  if (!cats.length) return null;
  return (
    <ul className="mt-2 space-y-2 text-white/90">
      {cats.map((c) => <li key={c.id}><Link href={`/products?category=${c.slug}`} className="hover:text-kesar">{c.name}</Link></li>)}
    </ul>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen">
        <CartProvider>
          <Header />
          <RefTracker />
          {children}
          <a href={`https://wa.me/${WHATSAPP}`} aria-label="Chat with us on WhatsApp" className="no-print fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#1fa855] text-white shadow-lg ring-4 ring-white hover:bg-[#178a45]">
            <svg aria-hidden viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.7-5.1A8.5 8.5 0 1 1 21 11.5Z" /></svg>
          </a>
          <footer className="no-print mt-20 bg-jamun text-white">
            <div aria-hidden className="candy-stripe h-2" />
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-6">
              <div>
                <div className="flex items-center gap-3">
                  <BrandLogo slot="footer_logo" className="h-20 w-auto" />
                  <p className="font-display text-2xl font-extrabold leading-tight">MAA AMBEY<br /><span className="text-kesar">SWEETS</span></p>
                </div>
                <p className="mt-3 max-w-xs text-white/90">{SITE.tagline}</p>
                <p className="mt-3 text-white/90">{SITE.address}</p>
                <p className="mt-1"><a href={`tel:+91${SITE.phone}`} className="font-semibold underline">{SITE.phone}</a></p>
                {SITE.fssai && <p className="mt-3 text-sm text-white/80">FSSAI Lic. No. {SITE.fssai}</p>}
                <SocialLinks variant="compact" heading="Follow us" className="mt-4" />
              </div>
              <nav aria-label="Shop">
                <p className="font-display text-lg font-bold text-kesar">Shop</p>
                <ul className="mt-3 space-y-2 text-white/90">
                  <li><Link href="/products" className="hover:text-kesar">All sweets</Link></li>
                  <li><Link href="/hampers" className="hover:text-kesar">Build a gift box</Link></li>
                  <li><Link href="/bulk-orders" className="hover:text-kesar">Bulk orders</Link></li>
                  <li><Link href="/creator-partnership" className="hover:text-kesar">Creator partnership</Link></li>
                </ul>
                <Suspense fallback={null}><FooterCategories /></Suspense>
              </nav>
              <nav aria-label="Help">
                <p className="font-display text-lg font-bold text-kesar">Help</p>
                <ul className="mt-3 space-y-2 text-white/90">
                  <li><Link href="/track" className="hover:text-kesar">Track your order</Link></li>
                  <li><Link href="/account" className="hover:text-kesar">My account</Link></li>
                  <li><a href={`https://wa.me/${WHATSAPP}`} className="hover:text-kesar">Chat on WhatsApp</a></li>
                  <li><Link href="/privacy" className="hover:text-kesar">Privacy policy</Link></li>
                  <li><Link href="/terms" className="hover:text-kesar">Terms and conditions</Link></li>
                  <li><Link href="/credits" className="hover:text-kesar">Photo credits</Link></li>
                </ul>
              </nav>
            </div>
            <p className="border-t border-white/15 py-4 text-center text-sm text-white/80">© {SITE.name}. Made fresh in Kanpur.</p>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
