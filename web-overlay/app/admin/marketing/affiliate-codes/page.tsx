"use client";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { Badge, box, btnDanger, btnDark, btnLight, fmtDate, inr, Note, Notice, Page, useAdmin, useLookups } from "@/components/admin/marketing/kit";
import { errorText } from "@/lib/media";

type Coupon = { code: string; title: string; type: "percent" | "flat"; value: string; min_order: string; max_discount: string | null; starts_at: string | null; ends_at: string | null; usage_limit: number | null; used_count: number; is_active: boolean };
type Code = {
  id: number; creator_id: number; campaign_id: number | null; commission_type: "percent" | "fixed"; commission_value: string; commission_approved_at: string | null; notes: string | null;
  coupon: Coupon; creator: { name: string }; campaign: { name: string } | null; orders: number; revenue: number; net_sales: number; clicks: number; commission_pending: number; commission_paid: number;
};
type Comm = { id: number; status: string; amount: string; base_amount: string; order: { number: string; status: string; created_at: string } };
type Form = {
  creator_id: string; campaign_id: string; code: string; title: string; type: string; value: string; min_order: string; max_discount: string; starts_at: string; ends_at: string;
  usage_limit: string; is_active: boolean; commission_type: string; commission_value: string; notes: string;
};
const blank: Form = { creator_id: "", campaign_id: "", code: "", title: "", type: "percent", value: "", min_order: "", max_discount: "", starts_at: "", ends_at: "", usage_limit: "", is_active: true, commission_type: "percent", commission_value: "", notes: "" };

export default function AffiliateCodes() {
  const { token, call } = useAdmin();
  const lookups = useLookups(call, !!token);
  const [rows, setRows] = useState<Code[] | null>(null);
  const [f, setF] = useState<Form>(blank);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [errs, setErrs] = useState<Record<string, string[]>>({});
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [comms, setComms] = useState<Comm[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    try { setRows(await call<Code[]>("/admin/marketing/affiliate-codes")); } catch (e) { setRows([]); setNote({ ok: false, text: errorText(e) }); }
  }, [token, call]);
  useEffect(() => { load(); }, [load]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const e = (k: string) => errs[k]?.[0];

  function edit(a: Code) {
    const c = a.coupon;
    setF({ creator_id: String(a.creator_id), campaign_id: a.campaign_id ? String(a.campaign_id) : "", code: c.code, title: c.title, type: c.type, value: c.value, min_order: c.min_order ?? "", max_discount: c.max_discount ?? "",
      starts_at: c.starts_at ?? "", ends_at: c.ends_at ?? "", usage_limit: c.usage_limit ? String(c.usage_limit) : "", is_active: c.is_active, commission_type: a.commission_type, commission_value: a.commission_value, notes: a.notes ?? "" });
    setErrs({}); setNote(null); setEditing(a.id);
  }
  async function save(ev: React.FormEvent) {
    ev.preventDefault(); setBusy(true); setErrs({}); setNote(null);
    const n = (x: string) => (x === "" ? null : Number(x));
    const body: Record<string, unknown> = {
      campaign_id: f.campaign_id ? Number(f.campaign_id) : null, title: f.title || null, type: f.type, value: Number(f.value), min_order: n(f.min_order), max_discount: f.type === "percent" ? n(f.max_discount) : null,
      starts_at: f.starts_at || null, ends_at: f.ends_at || null, usage_limit: n(f.usage_limit), is_active: f.is_active, commission_type: f.commission_type, commission_value: n(f.commission_value) ?? 0, notes: f.notes || null,
    };
    if (editing === "new") { body.creator_id = Number(f.creator_id); if (f.code) body.code = f.code; }
    try {
      await call(editing === "new" ? "/admin/marketing/affiliate-codes" : `/admin/marketing/affiliate-codes/${editing}`, { method: editing === "new" ? "POST" : "PUT", body });
      setNote({ ok: true, text: editing === "new" ? "Code created. Customers can use it at checkout straight away." : "Saved. If you changed the commission, approve it again." }); setEditing(null); load();
    } catch (er) { if (er instanceof ApiError) setErrs(er.errors); setNote({ ok: false, text: errorText(er) }); } finally { setBusy(false); }
  }
  async function act(a: Code, path: string, done: (r: unknown) => string) {
    try { const r = await call<unknown>(`/admin/marketing/affiliate-codes/${a.id}/${path}`, { method: "POST" }); setNote({ ok: true, text: done(r) }); load(); if (open === a.id) showComms(a, true); }
    catch (er) { setNote({ ok: false, text: errorText(er) }); }
  }
  async function showComms(a: Code, force = false) {
    if (open === a.id && !force) { setOpen(null); return; }
    try { setComms(await call<Comm[]>(`/admin/marketing/affiliate-codes/${a.id}/commissions`)); setOpen(a.id); } catch (er) { setNote({ ok: false, text: errorText(er) }); }
  }
  async function setComm(a: Code, c: Comm, status: string) {
    try { await call(`/admin/marketing/commissions/${c.id}`, { method: "PATCH", body: { status } }); showComms(a, true); load(); } catch (er) { setNote({ ok: false, text: errorText(er) }); }
  }
  async function remove(a: Code) {
    if (!window.confirm("Delete this code? If it already has orders it is switched off instead.")) return;
    try { const r = await call<{ message?: string } | undefined>(`/admin/marketing/affiliate-codes/${a.id}`, { method: "DELETE" }); setNote({ ok: true, text: r?.message ?? "Deleted." }); load(); } catch (er) { setNote({ ok: false, text: errorText(er) }); }
  }

  return (
    <Page title="Affiliate & discount codes" help="Each code is a normal discount in your Offers list, so checkout applies and counts it. Sales are matched to the code from your real orders. Commission is calculated only after you approve the rule, on the order value after discount, excluding delivery."
      actions={editing === null ? <button className={btnDark} onClick={() => { setF(blank); setErrs({}); setNote(null); setEditing("new"); }}>New creator code</button> : undefined}>
      <Notice n={note} />
      {editing !== null && (
        <form onSubmit={save} className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label htmlFor="a-cr" className="text-xs font-medium">Creator *</label><select id="a-cr" required disabled={editing !== "new"} value={f.creator_id} onChange={(x) => set("creator_id", x.target.value)} className={box}><option value="">Choose…</option>{(lookups.creators ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>{e("creator_id") && <p className="text-xs text-red-600">{e("creator_id")}</p>}</div>
            <div><label htmlFor="a-ca" className="text-xs font-medium">Campaign</label><select id="a-ca" value={f.campaign_id} onChange={(x) => set("campaign_id", x.target.value)} className={box}><option value="">None</option>{(lookups.campaigns ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div><label htmlFor="a-code" className="text-xs font-medium">Code</label><input id="a-code" disabled={editing !== "new"} value={f.code} onChange={(x) => set("code", x.target.value.toUpperCase())} placeholder="leave blank to generate" className={box} />{e("code") && <p className="text-xs text-red-600">{e("code")}</p>}</div>
            <div><label htmlFor="a-t" className="text-xs font-medium">Discount type</label><select id="a-t" value={f.type} onChange={(x) => set("type", x.target.value)} className={box}><option value="percent">Percent off</option><option value="flat">Flat ₹ off</option></select></div>
            <div><label htmlFor="a-v" className="text-xs font-medium">Discount value *</label><input id="a-v" required type="number" min="0.01" step="0.01" value={f.value} onChange={(x) => set("value", x.target.value)} className={box} />{e("value") && <p className="text-xs text-red-600">{e("value")}</p>}</div>
            <div><label htmlFor="a-mo" className="text-xs font-medium">Minimum order (₹)</label><input id="a-mo" type="number" min="0" value={f.min_order} onChange={(x) => set("min_order", x.target.value)} className={box} /></div>
            {f.type === "percent" && <div><label htmlFor="a-md" className="text-xs font-medium">Largest discount (₹)</label><input id="a-md" type="number" min="0" value={f.max_discount} onChange={(x) => set("max_discount", x.target.value)} className={box} /></div>}
            <div><label htmlFor="a-s" className="text-xs font-medium">Starts</label><input id="a-s" type="date" value={f.starts_at} onChange={(x) => set("starts_at", x.target.value)} className={box} /></div>
            <div><label htmlFor="a-e" className="text-xs font-medium">Expires</label><input id="a-e" type="date" value={f.ends_at} onChange={(x) => set("ends_at", x.target.value)} className={box} />{e("ends_at") && <p className="text-xs text-red-600">{e("ends_at")}</p>}</div>
            <div><label htmlFor="a-u" className="text-xs font-medium">Usage limit</label><input id="a-u" type="number" min="1" value={f.usage_limit} onChange={(x) => set("usage_limit", x.target.value)} className={box} /></div>
            <div><label htmlFor="a-ct" className="text-xs font-medium">Commission type</label><select id="a-ct" value={f.commission_type} onChange={(x) => set("commission_type", x.target.value)} className={box}><option value="percent">Percent of order value</option><option value="fixed">Fixed ₹ per order</option></select></div>
            <div><label htmlFor="a-cv" className="text-xs font-medium">Commission value</label><input id="a-cv" type="number" min="0" step="0.01" value={f.commission_value} onChange={(x) => set("commission_value", x.target.value)} className={box} /><p className="text-xs text-stone-500">0 = no commission (discount only).</p>{e("commission_value") && <p className="text-xs text-red-600">{e("commission_value")}</p>}</div>
            <label className="mt-6 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={(x) => set("is_active", x.target.checked)} /> Code is active</label>
            <div className="sm:col-span-3"><label htmlFor="a-n" className="text-xs font-medium">Notes</label><input id="a-n" value={f.notes} onChange={(x) => set("notes", x.target.value)} className={box} /></div>
          </div>
          <p className="mt-2 text-xs text-stone-500">Restricting a code to certain products is not supported by checkout yet, so every code applies to the whole basket.</p>
          <div className="mt-4 flex gap-2"><button type="submit" disabled={busy} className={btnDark}>{busy ? "Saving…" : "Save"}</button><button type="button" onClick={() => setEditing(null)} className={btnLight}>Cancel</button></div>
        </form>
      )}

      {rows === null ? <p className="text-sm">Loading…</p> : rows.length === 0 ? <p className="rounded-xl border bg-white p-6 text-center text-sm text-stone-600">No creator codes yet.</p> : (
        <ul className="space-y-3">
          {rows.map((a) => {
            const c = a.coupon;
            return (
              <li key={a.id} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-bold tracking-wide">{c.code} {c.is_active ? <Badge s="active" text="Active" /> : <Badge s="draft" text="Off" />}</p>
                    <p className="text-sm text-stone-600">{a.creator.name}{a.campaign ? ` · ${a.campaign.name}` : ""}</p>
                    <p className="text-xs text-stone-500">{c.type === "percent" ? `${Number(c.value)}% off` : `${inr(c.value)} off`}{Number(c.min_order) > 0 ? ` over ${inr(c.min_order)}` : ""}{c.ends_at ? ` · until ${fmtDate(c.ends_at)}` : ""}{c.usage_limit ? ` · limit ${c.usage_limit}` : ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {!a.commission_approved_at && Number(a.commission_value) > 0 && <button className={btnDark} onClick={() => act(a, "approve-commission", () => "Commission rule approved.")}>Approve commission</button>}
                    {a.commission_approved_at && <button className={btnLight} onClick={() => act(a, "sync-commissions", (r) => { const x = r as { created: number; voided: number }; return `${x.created} new commission record(s), ${x.voided} voided.`; })}>Update commission records</button>}
                    <button className={btnLight} aria-expanded={open === a.id} onClick={() => showComms(a)}>Commission list</button>
                    <button className={btnLight} onClick={() => edit(a)}>Edit</button>
                    <button className={btnDanger} onClick={() => remove(a)}>Delete</button>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
                  <div><dt className="text-xs text-stone-500">Visits (tracked)</dt><dd className="font-semibold">{a.clicks}</dd></div>
                  <div><dt className="text-xs text-stone-500">Orders</dt><dd className="font-semibold">{a.orders}</dd></div>
                  <div><dt className="text-xs text-stone-500">Revenue</dt><dd className="font-semibold">{inr(a.revenue)}</dd></div>
                  <div><dt className="text-xs text-stone-500">Commission rule</dt><dd className="font-semibold">{Number(a.commission_value) > 0 ? (a.commission_type === "percent" ? `${Number(a.commission_value)}%` : `${inr(a.commission_value)} per order`) : "None"}{Number(a.commission_value) > 0 && <span className="block text-xs font-normal">{a.commission_approved_at ? `Approved ${fmtDate(a.commission_approved_at)}` : "Not approved yet"}</span>}</dd></div>
                  <div><dt className="text-xs text-stone-500">Owed / paid</dt><dd className="font-semibold">{inr(a.commission_pending)} / {inr(a.commission_paid)}</dd></div>
                </dl>
                {open === a.id && (
                  <div className="mt-3 overflow-x-auto rounded border">
                    {comms.length === 0 ? <p className="p-3 text-sm text-stone-600">No commission records yet. Press “Update commission records” after the rule is approved.</p> : (
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-stone-50 text-xs uppercase text-stone-500"><tr><th className="px-3 py-1.5">Order</th><th className="px-3 py-1.5">Order status</th><th className="px-3 py-1.5">Base</th><th className="px-3 py-1.5">Commission</th><th className="px-3 py-1.5">Status</th><th className="px-3 py-1.5" /></tr></thead>
                        <tbody className="divide-y">{comms.map((c2) => (
                          <tr key={c2.id}><td className="px-3 py-1.5">{c2.order.number}</td><td className="px-3 py-1.5">{c2.order.status}</td><td className="px-3 py-1.5">{inr(c2.base_amount)}</td><td className="px-3 py-1.5">{inr(c2.amount)}</td><td className="px-3 py-1.5"><Badge s={c2.status} /></td>
                            <td className="px-3 py-1.5 text-right">{c2.status === "pending" && <button className={btnLight} onClick={() => setComm(a, c2, "approved")}>Approve</button>} {c2.status === "approved" && <button className={btnLight} onClick={() => setComm(a, c2, "paid")}>Mark paid</button>} {["pending", "approved"].includes(c2.status) && <button className={btnDanger} onClick={() => setComm(a, c2, "void")}>Void</button>}</td></tr>
                        ))}</tbody>
                      </table>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}
