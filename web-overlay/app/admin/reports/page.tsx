"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API, api, ApiError, rupees, Summary } from "@/lib/api";
import { clearToken, useAdminToken } from "@/lib/auth";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function AdminReports() {
  const token = useAdminToken();
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [s, setS] = useState<Summary | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => { const t = new Date(); const f = new Date(); f.setDate(t.getDate() - 29); setTo(iso(t)); setFrom(iso(f)); }, []);

  const load = useCallback(async () => {
    if (!token || !from || !to) return;
    try { setS(await api<Summary>(`/admin/reports/summary?from=${from}&to=${to}`, { token })); setMsg(""); }
    catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { clearToken(); router.replace("/admin/login"); }
      else setMsg(e instanceof ApiError ? (Object.values(e.errors).flat()[0] ?? e.message) : "Failed to load");
    }
  }, [token, from, to, router]);
  useEffect(() => { load(); }, [load]);

  async function download() {
    if (!token) return;
    try {
      const res = await fetch(`${API}/admin/reports/orders.csv?from=${from}&to=${to}`, { headers: { Authorization: `Bearer ${token}`, Accept: "text/csv" } });
      if (!res.ok) throw new Error("Could not download the file.");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url; a.download = `orders_${from}_to_${to}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Download failed"); }
  }

  if (!token) return null;
  const max = s ? Math.max(1, ...s.daily.map((d) => d.revenue)) : 1;
  const Card = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-2xl bg-pista-soft p-4"><p className="text-sm text-ink/70">{label}</p><p className="mt-1 font-display text-3xl">{value}</p></div>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl">Sales reports</h1>
        <div className="flex flex-wrap items-end gap-3">
          <div><label htmlFor="from" className="block text-sm font-medium">From</label><input id="from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border-2 border-ink/20 bg-white px-3 py-2" /></div>
          <div><label htmlFor="to" className="block text-sm font-medium">To</label><input id="to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="rounded-xl border-2 border-ink/20 bg-white px-3 py-2" /></div>
          <button onClick={download} className="rounded-full bg-kesar px-5 py-2.5 font-semibold text-ink hover:bg-kesar-deep">Download orders (CSV)</button>
        </div>
      </div>
      {msg && <p role="alert" className="mt-3 text-gulab">{msg}</p>}
      {!s ? <p className="mt-8 text-ink/60">Loading…</p> : (
        <>
          <p className="mt-2 text-sm text-ink/60">Revenue counts orders that were not cancelled. Cash on delivery orders are included when placed.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card label="Orders" value={String(s.orders - s.cancelled)} />
            <Card label="Revenue" value={rupees(s.revenue)} />
            <Card label="Average order" value={rupees(s.average_order)} />
            <Card label="Discounts given" value={rupees(s.discounts)} />
          </div>

          <section className="mt-8" aria-labelledby="daily">
            <h2 id="daily" className="mb-3 text-2xl">Revenue by day</h2>
            <div className="flex h-40 items-end gap-[2px] rounded-2xl border border-ink/15 bg-white p-3" role="img" aria-label={`Daily revenue from ${s.from} to ${s.to}. Highest day ${rupees(max)}.`}>
              {s.daily.map((d) => (
                <div key={d.date} title={`${d.date}: ${rupees(d.revenue)}, ${d.orders} orders`} className="flex-1 rounded-t bg-kesar" style={{ height: `${Math.max(2, (d.revenue / max) * 100)}%` }} />
              ))}
            </div>
            <p className="mt-1 text-xs text-ink/60">Hover a bar to see the day. Highest day: {rupees(max)}.</p>
          </section>

          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <section aria-labelledby="top">
              <h2 id="top" className="mb-3 text-2xl">Best sellers</h2>
              <table className="w-full text-left text-sm"><thead><tr className="border-b border-ink/15"><th className="py-2">Sweet</th><th>Sold</th><th className="text-right">Revenue</th></tr></thead>
                <tbody>{s.top_products.map((p) => <tr key={p.name} className="border-b border-ink/10"><td className="py-2">{p.name}</td><td>{p.qty}</td><td className="text-right">{rupees(p.revenue)}</td></tr>)}
                  {s.top_products.length === 0 && <tr><td colSpan={3} className="py-4 text-ink/60">No sales in this period.</td></tr>}</tbody></table>
            </section>
            <section aria-labelledby="exp" className="md:col-span-2">
              <h2 id="exp" className="mb-3 text-2xl">Expiring soon</h2>
              <table className="w-full text-left text-sm"><thead><tr className="border-b border-ink/15"><th className="py-2">Sweet</th><th>Batch</th><th>Expires</th><th className="text-right">Left</th></tr></thead>
                <tbody>{s.expiring.map((b) => <tr key={b.batch_id} className="border-b border-ink/10"><td className="py-2">{b.product}</td><td>{b.batch_no}</td><td className={b.expired ? "font-semibold text-gulab" : ""}>{b.expires_on}{b.expired ? " (expired, remove from sale)" : ""}</td><td className="text-right">{b.quantity_left}</td></tr>)}
                  {s.expiring.length === 0 && <tr><td colSpan={4} className="py-4 text-ink/60">No batches are close to expiry. Add batches on each product&apos;s edit page.</td></tr>}</tbody></table>
            </section>
            <section aria-labelledby="low">
              <h2 id="low" className="mb-3 text-2xl">Running low</h2>
              <table className="w-full text-left text-sm"><thead><tr className="border-b border-ink/15"><th className="py-2">Sweet</th><th>SKU</th><th className="text-right">Stock</th></tr></thead>
                <tbody>{s.low_stock.map((p) => <tr key={p.id} className="border-b border-ink/10"><td className="py-2">{p.name}</td><td>{p.sku}</td><td className="text-right font-semibold">{p.stock}</td></tr>)}
                  {s.low_stock.length === 0 && <tr><td colSpan={3} className="py-4 text-ink/60">Nothing is running low.</td></tr>}</tbody></table>
            </section>
          </div>

          <section className="mt-8" aria-labelledby="split">
            <h2 id="split" className="mb-3 text-2xl">Orders by status</h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              {Object.entries(s.by_status).map(([k, v]) => <li key={k} className="rounded-full bg-pista px-4 py-1.5">{k}: <strong>{v}</strong></li>)}
              {Object.entries(s.by_fulfilment).map(([k, v]) => <li key={k} className="rounded-full bg-kesar/30 px-4 py-1.5">{k}: <strong>{v}</strong></li>)}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
