"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OrderView from "@/components/OrderView";
import { api, ApiError, Order, Page, Product, priceFor, rupees } from "@/lib/api";
import { clearUserToken, useCustomerToken } from "@/lib/auth";
import { useCart } from "@/lib/cart";

const LABEL: Record<string, string> = { received: "Received", preparing: "Preparing", ready: "Ready", dispatched: "On its way", delivered: "Delivered", cancelled: "Cancelled" };

export default function Account() {
  const token = useCustomerToken();
  const router = useRouter();
  const { add } = useCart();
  const [me, setMe] = useState<{ name: string; email: string } | null>(null);
  const [orders, setOrders] = useState<Page<Order> | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [points, setPoints] = useState<{ balance: number; history: { type: string; points: number; created_at: string }[] } | null>(null);

  useEffect(() => {
    if (!token) return;
    const expired = (e: unknown) => { if (e instanceof ApiError && e.status === 401) { clearUserToken(); router.replace("/login"); } };
    api<{ name: string; email: string }>("/me", { token }).then(setMe).catch(expired);
    api<Page<Order>>("/orders", { token }).then(setOrders).catch(expired);
    api<{ balance: number; history: { type: string; points: number; created_at: string }[] }>("/me/loyalty", { token }).then(setPoints).catch(() => {});
  }, [token, router]);

  async function reorder(o: Order) {
    setNote("Checking what is available…");
    let added = 0; const skipped: string[] = [];
    for (const i of o.items) {
      if (!i.product_id) { skipped.push(i.name); continue; }
      try {
        const p = await api<Product>(`/products/${i.product_id}`);
        const opt = p.weight_options?.length ? (p.weight_options.find((x) => x.label === i.option_label)?.label ?? null) : null;
        if (p.stock <= 0 || (p.weight_options?.length && !opt)) { skipped.push(i.name); continue; }
        add({ productId: p.id, name: p.name, image: p.images[0]?.url ?? null, option: opt, unitPrice: priceFor(p, opt), qty: Math.min(i.qty, p.stock), maxQty: Math.min(p.stock, 50) });
        added++;
      } catch { skipped.push(i.name); }
    }
    setNote(`${added} item${added === 1 ? "" : "s"} added to your cart.${skipped.length ? ` Not available now: ${skipped.join(", ")}.` : ""}`);
  }

  if (!token) return null;
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-4xl">Your account</h1>{me && <p className="text-ink/70">{me.name} · {me.email}</p>}</div>
        <button onClick={() => { api("/logout", { method: "POST", token }).catch(() => {}); clearUserToken(); router.push("/"); }} className="rounded-full border-2 border-ink/20 px-5 py-2 font-medium hover:bg-pista-soft">Log out</button>
      </div>

      {points && (
        <section aria-labelledby="pts" className="mt-8 rounded-2xl bg-pista-soft p-5">
          <h2 id="pts" className="text-2xl">Your points</h2>
          <p className="mt-1"><span className="font-display text-4xl">{points.balance}</span> points. Use them at checkout. You earn points when an order is delivered.</p>
          {points.history.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {points.history.map((h, i) => (
                <li key={i} className="flex justify-between"><span>{{ earn: "Earned", redeem: "Used", reverse_earn: "Earned points removed (order cancelled)", reverse_redeem: "Points returned (order cancelled)" }[h.type] ?? h.type} · {new Date(h.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span><strong>{h.points > 0 ? "+" : ""}{h.points}</strong></li>
              ))}
            </ul>
          )}
        </section>
      )}

      <h2 className="mb-3 mt-10 text-2xl">Your orders</h2>
      {note && <p role="status" className="mb-3 rounded-xl bg-pista p-3 text-sm">{note} <Link href="/cart" className="font-semibold underline">View cart</Link></p>}
      {orders === null ? <p className="text-ink/60">Loading your orders…</p> : orders.data.length === 0 ? (
        <p className="text-ink/70">No orders yet. <Link href="/products" className="font-semibold text-gulab underline">Browse sweets</Link></p>
      ) : (
        <ul className="space-y-4">
          {orders.data.map((o) => (
            <li key={o.id} className="rounded-2xl border border-ink/15 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-semibold">{o.number}</p><p className="text-sm text-ink/60">{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {rupees(o.total)}</p></div>
                <span className="rounded-full bg-pista px-3 py-1 text-sm font-semibold">{LABEL[o.status]}</span>
              </div>
              <p className="mt-2 text-sm text-ink/70">{o.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}</p>
              <div className="mt-3 flex gap-3">
                <button onClick={() => setOpen(open === o.id ? null : o.id)} aria-expanded={open === o.id} className="rounded-full border-2 border-ink/20 px-4 py-1.5 text-sm font-medium hover:bg-pista-soft">{open === o.id ? "Hide tracking" : "Track"}</button>
                <button onClick={() => reorder(o)} className="rounded-full bg-kesar px-4 py-1.5 text-sm font-semibold text-ink hover:bg-kesar-deep">Order again</button>
              </div>
              {open === o.id && <div className="mt-5"><OrderView order={o} /></div>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
