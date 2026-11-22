"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, rupees, ShopConfig } from "@/lib/api";
import { useCart } from "@/lib/cart";

export default function CartPage() {
  const { lines, ready, subtotal, setQty, remove } = useCart();
  const [cfg, setCfg] = useState<ShopConfig | null>(null);
  useEffect(() => { api<ShopConfig>("/shop-config").then(setCfg).catch(() => {}); }, []);

  if (!ready) return <main className="mx-auto max-w-4xl px-4 py-10 text-ink/60 sm:px-6">Loading your cart…</main>;

  if (lines.length === 0) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-4xl">Your cart is empty</h1>
        <p className="mt-2 text-ink/70">Add a few sweets and they will appear here.</p>
        <Link href="/products" className="mt-6 inline-block rounded-full bg-kesar px-8 py-3 font-semibold text-ink hover:bg-kesar-deep">Browse sweets</Link>
      </main>
    );
  }

  const toFree = cfg ? Math.max(0, cfg.free_delivery_above - subtotal) : 0;
  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px]">
      <section aria-labelledby="cart-h">
        <h1 id="cart-h" className="mb-4 text-4xl">Your cart</h1>
        <ul className="divide-y divide-ink/10">
          {lines.map((l) => (
            <li key={l.key} className="flex gap-4 py-5">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-pista-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {l.image && <img src={l.image} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/products/${l.productId}`} className="font-semibold hover:text-gulab">{l.name}</Link>
                {l.option && <p className="text-sm text-ink/60">{l.option}</p>}
                {l.choices && l.choices.length > 0 && <p className="text-sm text-ink/60">Inside: {Object.entries(l.choices.reduce<Record<string, number>>((m, c) => ({ ...m, [c.name]: (m[c.name] ?? 0) + 1 }), {})).map(([n, c]) => `${c} × ${n}`).join(", ")}</p>}
                <p className="text-sm text-ink/60">{rupees(l.unitPrice)} each</p>
                <div className="mt-2 flex items-center gap-4">
                  <div className="flex items-center rounded-full border-2 border-ink/20 bg-white" role="group" aria-label={`Quantity for ${l.name}`}>
                    <button type="button" aria-label="Decrease quantity" disabled={l.qty <= 1} onClick={() => setQty(l.key, l.qty - 1)} className="h-10 w-10 disabled:opacity-30">−</button>
                    <span className="w-8 text-center font-semibold">{l.qty}</span>
                    <button type="button" aria-label="Increase quantity" disabled={l.qty >= l.maxQty} onClick={() => setQty(l.key, l.qty + 1)} className="h-10 w-10 disabled:opacity-30">+</button>
                  </div>
                  <button type="button" onClick={() => remove(l.key)} className="text-sm text-gulab underline">Remove</button>
                </div>
              </div>
              <p className="font-semibold">{rupees(l.unitPrice * l.qty)}</p>
            </li>
          ))}
        </ul>
      </section>
      <aside className="h-fit rounded-2xl bg-pista-soft p-6" aria-label="Order summary">
        <h2 className="text-2xl">Summary</h2>
        <dl className="mt-4 space-y-2">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-semibold">{rupees(subtotal)}</dd></div>
          <div className="flex justify-between text-sm text-ink/70"><dt>Delivery</dt><dd>Calculated at checkout</dd></div>
        </dl>
        {cfg && cfg.free_delivery_above > 0 && (
          <p className="mt-3 text-sm">{toFree > 0 ? `Add ${rupees(toFree)} more for free delivery.` : "You get free delivery on this order."}</p>
        )}
        <Link href="/checkout" className="mt-5 block rounded-full bg-kesar py-3 text-center text-lg font-semibold text-ink hover:bg-kesar-deep">Go to checkout</Link>
        <Link href="/products" className="mt-3 block text-center text-sm underline">Keep shopping</Link>
      </aside>
    </main>
  );
}
