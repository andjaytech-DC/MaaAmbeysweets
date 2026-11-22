"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, Order, OrderStatus, Page, rupees } from "@/lib/api";
import { clearToken, useAdminToken } from "@/lib/auth";

const STATUSES: OrderStatus[] = ["received", "preparing", "ready", "dispatched", "delivered", "cancelled"];

export default function AdminOrders() {
  const token = useAdminToken();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<Order> | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setData(await api<Page<Order>>(`/admin/orders?q=${encodeURIComponent(q)}&status=${status}&page=${page}`, { token }));
      setMsg("");
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { clearToken(); router.replace("/admin/login"); }
      else setMsg(e instanceof Error ? e.message : "Failed to load orders");
    }
  }, [token, q, status, page, router]);
  useEffect(() => { load(); }, [load]);

  async function change(o: Order, next: string) {
    if (!token) return;
    if (next === "cancelled" && !confirm(`Cancel order ${o.number}? Stock will be put back.`)) return;
    try { await api(`/admin/orders/${o.id}/status`, { method: "PATCH", token, body: { status: next } }); load(); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Could not update the status"); }
  }

  if (!token) return null;
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Orders {data && <span className="text-base text-ink/60">({data.total})</span>}</h1>
        <div className="flex gap-2"><Link href="/admin/enquiries" className="rounded-full border-2 border-ink/20 px-4 py-2 text-sm hover:bg-pista-soft">Bulk enquiries</Link><Link href="/admin/products" className="rounded-full border-2 border-ink/20 px-4 py-2 text-sm hover:bg-pista-soft">Products</Link></div>
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search order number, name or phone" className="min-w-0 flex-1 rounded-xl border-2 border-ink/20 bg-white px-4 py-2" />
        <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-xl border-2 border-ink/20 bg-white px-3 py-2">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {msg && <p role="alert" className="mb-3 text-gulab">{msg}</p>}
      <ul className="space-y-3">
        {data?.data.map((o) => (
          <li key={o.id} className="rounded-2xl border border-ink/15 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{o.number} <span className="ml-2 text-sm font-normal text-ink/60">{new Date(o.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span></p>
                <p className="text-sm">{o.customer_name} · <a className="underline" href={`tel:${o.phone}`}>{o.phone}</a></p>
                <p className="text-sm text-ink/70">{o.fulfilment === "pickup" ? "Pickup" : `Delivery: ${o.address_line}, ${o.city} ${o.pincode}`}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{rupees(o.total)} <span className="text-sm font-normal text-ink/60">({o.payment_method.toUpperCase()}, {o.payment_status})</span></p>
                <label className="sr-only" htmlFor={`s${o.id}`}>Status for {o.number}</label>
                <select id={`s${o.id}`} value={o.status} onChange={(e) => change(o, e.target.value)} className="mt-1 rounded-xl border-2 border-ink/20 bg-white px-3 py-1.5">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <p className="mt-2 text-sm text-ink/80">{o.items.map((i) => `${i.qty} × ${i.name}${i.option_label ? ` (${i.option_label})` : ""}`).join(", ")}</p>
            {o.is_gift && <p className="mt-1 text-sm"><strong>Gift</strong> for {o.recipient_name}, call <a className="underline" href={`tel:+91${o.recipient_phone}`}>{o.recipient_phone}</a>{o.gift_message ? ` · message: “${o.gift_message}”` : ""}. Do not put prices on the slip.</p>}
            {Number(o.points_redeemed) > 0 && <p className="mt-1 text-sm text-ink/70">Customer used {o.points_redeemed} points (₹{o.points_discount} off).</p>}
            {o.notes && <p className="mt-1 text-sm italic text-ink/70">Note: {o.notes}</p>}
          </li>
        ))}
        {data && data.data.length === 0 && <li className="p-6 text-center text-ink/60">No orders found.</li>}
      </ul>
      {data && data.last_page > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-4 py-2 disabled:opacity-40">Previous</button>
          <span>Page {data.current_page} of {data.last_page}</span>
          <button disabled={page >= data.last_page} onClick={() => setPage(page + 1)} className="rounded border px-4 py-2 disabled:opacity-40">Next</button>
        </div>
      )}
    </main>
  );
}
