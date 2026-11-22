"use client";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, Batch } from "@/lib/api";

type Who = { number: string; customer_name: string; phone: string; status: string }[];

export default function BatchManager({ token, productId }: { token: string; productId: number }) {
  const [list, setList] = useState<Batch[]>([]);
  const [f, setF] = useState({ batch_no: "", made_on: "", expires_on: "", quantity_made: "" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [msg, setMsg] = useState("");
  const [who, setWho] = useState<{ batch: string; rows: Who } | null>(null);

  const load = useCallback(() => { api<Batch[]>(`/admin/products/${productId}/batches`, { token }).then(setList).catch(() => setMsg("Could not load batches.")); }, [token, productId]);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setErrors({});
    const v: Record<string, string[]> = {};
    if (!f.batch_no.trim()) v.batch_no = ["Enter a batch number."];
    if (!f.made_on) v.made_on = ["Enter the made-on date."];
    if (!f.expires_on) v.expires_on = ["Enter the expiry date."];
    else if (f.made_on && f.expires_on <= f.made_on) v.expires_on = ["Expiry must be after the made-on date."];
    if (!f.quantity_made || Number(f.quantity_made) < 1) v.quantity_made = ["Enter how many were made."];
    if (Object.keys(v).length) { setErrors(v); return; }
    try { await api(`/admin/products/${productId}/batches`, { method: "POST", token, body: f }); setF({ batch_no: "", made_on: "", expires_on: "", quantity_made: "" }); load(); }
    catch (ex) { if (ex instanceof ApiError) { setErrors(ex.errors); if (!Object.keys(ex.errors).length) setMsg(ex.message); } }
  }

  async function del(b: Batch) {
    if (!confirm(`Delete batch ${b.batch_no}? Orders that used it keep their record but lose the link.`)) return;
    try { await api(`/admin/batches/${b.id}`, { method: "DELETE", token }); load(); } catch { setMsg("Could not delete."); }
  }
  async function showWho(b: Batch) {
    try { setWho({ batch: b.batch_no, rows: await api<Who>(`/admin/batches/${b.id}/orders`, { token }) }); } catch { setMsg("Could not load orders."); }
  }

  const err = (k: string) => errors[k]?.[0];
  const cls = (k: string) => `mt-1 w-full rounded border px-2 py-1.5 ${err(k) ? "border-red-500" : "border-stone-300"}`;
  return (
    <section className="no-print mt-10 max-w-3xl" aria-labelledby="bm">
      <h2 id="bm" className="mb-1 text-xl">Batches and expiry</h2>
      <p className="mb-3 text-sm text-stone-600">Add a batch each time you make this sweet. Orders use the batch that expires first, and customers see the made-on and best-before dates.</p>
      <form onSubmit={add} noValidate className="grid gap-3 sm:grid-cols-5 sm:items-start">
        <div><label htmlFor="bn" className="text-xs font-medium">Batch no.</label><input id="bn" value={f.batch_no} onChange={(e) => setF({ ...f, batch_no: e.target.value })} className={cls("batch_no")} />{err("batch_no") && <p className="text-xs text-red-600">{err("batch_no")}</p>}</div>
        <div><label htmlFor="bm1" className="text-xs font-medium">Made on</label><input id="bm1" type="date" value={f.made_on} onChange={(e) => setF({ ...f, made_on: e.target.value })} className={cls("made_on")} />{err("made_on") && <p className="text-xs text-red-600">{err("made_on")}</p>}</div>
        <div><label htmlFor="be" className="text-xs font-medium">Expires on</label><input id="be" type="date" value={f.expires_on} onChange={(e) => setF({ ...f, expires_on: e.target.value })} className={cls("expires_on")} />{err("expires_on") && <p className="text-xs text-red-600">{err("expires_on")}</p>}</div>
        <div><label htmlFor="bq" className="text-xs font-medium">Quantity made</label><input id="bq" type="number" min="1" value={f.quantity_made} onChange={(e) => setF({ ...f, quantity_made: e.target.value })} className={cls("quantity_made")} />{err("quantity_made") && <p className="text-xs text-red-600">{err("quantity_made")}</p>}</div>
        <button className="mt-5 rounded bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700">Add batch</button>
      </form>
      {msg && <p role="alert" className="mt-2 text-sm text-red-600">{msg}</p>}
      <table className="mt-4 w-full text-left text-sm">
        <thead><tr className="border-b"><th className="py-1">Batch</th><th>Made</th><th>Expires</th><th>Left</th><th /></tr></thead>
        <tbody>
          {list.map((b) => (
            <tr key={b.id} className="border-b border-stone-100">
              <td className="py-1.5">{b.batch_no}</td><td>{b.made_on}</td><td>{b.expires_on}</td><td>{b.quantity_left} / {b.quantity_made}</td>
              <td className="whitespace-nowrap text-right"><button onClick={() => showWho(b)} className="mr-3 underline">Who got this batch</button><button onClick={() => del(b)} className="text-red-600 underline">Delete</button></td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={5} className="py-3 text-stone-500">No batches yet.</td></tr>}
        </tbody>
      </table>
      {who && (
        <div className="mt-3 rounded border bg-white p-3 text-sm" role="region" aria-label={`Orders from batch ${who.batch}`}>
          <p className="font-semibold">Orders filled from batch {who.batch} ({who.rows.length})</p>
          {who.rows.length === 0 ? <p className="text-stone-500">No orders used this batch.</p> : (
            <ul className="mt-1 space-y-0.5">{who.rows.map((r) => <li key={r.number}>{r.number} · {r.customer_name} · <a className="underline" href={`tel:+91${r.phone}`}>{r.phone}</a> · {r.status}</li>)}</ul>
          )}
        </div>
      )}
    </section>
  );
}
