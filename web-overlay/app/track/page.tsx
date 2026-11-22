"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import OrderView from "@/components/OrderView";
import { api, ApiError, Order } from "@/lib/api";

export default function TrackPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-4xl px-4 py-10 text-ink/60 sm:px-6">Loading…</main>}>
      <Track />
    </Suspense>
  );
}

function Track() {
  const sp = useSearchParams();
  const [number, setNumber] = useState(sp.get("number") ?? "");
  const [phone, setPhone] = useState(sp.get("phone") ?? "");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const placed = sp.get("placed") === "1";

  const lookup = useCallback(async (n: string, p: string) => {
    if (!n.trim() || !p.trim()) { setError("Enter your order number and the phone number used on the order."); return; }
    setBusy(true); setError("");
    try {
      setOrder(await api<Order>(`/orders/track?number=${encodeURIComponent(n.trim())}&phone=${encodeURIComponent(p.trim())}`));
    } catch (e) {
      setOrder(null);
      setError(e instanceof ApiError ? (Object.values(e.errors).flat()[0] ?? e.message) : "Something went wrong.");
    } finally { setBusy(false); }
  }, []);

  useEffect(() => {
    const n = sp.get("number"), p = sp.get("phone");
    if (n && p) lookup(n, p);
  }, [sp, lookup]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl">Track your order</h1>
      <form onSubmit={(e) => { e.preventDefault(); lookup(number, phone); }} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div><label htmlFor="num" className="font-medium">Order number</label><input id="num" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="MAS2611031234" className="mt-1 w-full rounded-xl border-2 border-ink/20 bg-white px-4 py-3" /></div>
        <div><label htmlFor="ph" className="font-medium">Phone number on the order</label><input id="ph" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-xl border-2 border-ink/20 bg-white px-4 py-3" /></div>
        <button disabled={busy} className="h-[50px] rounded-full bg-kesar px-8 font-semibold text-ink hover:bg-kesar-deep disabled:opacity-60">{busy ? "Looking…" : "Track order"}</button>
      </form>
      {error && <p role="alert" className="mt-4 font-semibold text-gulab">{error}</p>}
      {order && <div className="mt-8"><OrderView order={order} placed={placed} /></div>}
    </main>
  );
}
