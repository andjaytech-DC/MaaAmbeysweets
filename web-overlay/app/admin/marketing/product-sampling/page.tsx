"use client";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { Badge, box, btnDanger, btnDark, btnLight, fmtDate, inr, Note, Notice, Page, useAdmin, useLookups } from "@/components/admin/marketing/kit";
import { errorText } from "@/lib/media";
import { label, SAMPLE_STATUSES } from "@/lib/marketing";

type Item = { product_id: number; name: string; quantity: number; unit_value: string };
type Sample = {
  id: number; creator_id: number; campaign_id: number | null; collaboration_id: number | null; status: string; sample_value: string; shipping_charge: string;
  ship_name: string | null; ship_phone: string | null; ship_address: string | null; ship_city: string | null; ship_pincode: string | null;
  dispatched_on: string | null; courier: string | null; tracking_no: string | null; delivered_on: string | null; receipt_confirmed_at: string | null; notes: string | null;
  items: Item[]; creator: { id: number; name: string }; campaign: { id: number; name: string } | null;
};
type Row = { product_id: string; quantity: string; unit_value: string };
type Form = {
  creator_id: string; campaign_id: string; collaboration_id: string; status: string; sample_value: string; shipping_charge: string; ship_name: string; ship_phone: string;
  ship_address: string; ship_city: string; ship_pincode: string; dispatched_on: string; courier: string; tracking_no: string; delivered_on: string; receipt_confirmed: boolean; notes: string; items: Row[];
};
const blank: Form = {
  creator_id: "", campaign_id: "", collaboration_id: "", status: "requested", sample_value: "", shipping_charge: "", ship_name: "", ship_phone: "", ship_address: "", ship_city: "",
  ship_pincode: "", dispatched_on: "", courier: "", tracking_no: "", delivered_on: "", receipt_confirmed: false, notes: "", items: [{ product_id: "", quantity: "1", unit_value: "" }],
};

export default function ProductSampling() {
  const { token, call } = useAdmin();
  const lookups = useLookups(call, !!token);
  const [rows, setRows] = useState<Sample[] | null>(null);
  const [status, setStatus] = useState("");
  const [f, setF] = useState<Form>(blank);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [collabs, setCollabs] = useState<{ id: number; campaign: { name: string } }[]>([]);
  const [errs, setErrs] = useState<Record<string, string[]>>({});
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try { setRows(await call<Sample[]>(`/admin/marketing/samples${status ? `?status=${status}` : ""}`)); } catch (e) { setRows([]); setNote({ ok: false, text: errorText(e) }); }
  }, [token, call, status]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!f.creator_id || !token) { setCollabs([]); return; }
    call<{ id: number; campaign: { name: string } }[]>(`/admin/marketing/collaborations?creator_id=${f.creator_id}`).then(setCollabs).catch(() => setCollabs([]));
  }, [f.creator_id, token, call]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const setRow = (i: number, k: keyof Row, v: string) => setF((s) => ({ ...s, items: s.items.map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const e = (k: string) => errs[k]?.[0];

  function edit(s: Sample) {
    setF({
      creator_id: String(s.creator_id), campaign_id: s.campaign_id ? String(s.campaign_id) : "", collaboration_id: s.collaboration_id ? String(s.collaboration_id) : "", status: s.status,
      sample_value: s.sample_value ?? "", shipping_charge: s.shipping_charge ?? "", ship_name: s.ship_name ?? "", ship_phone: s.ship_phone ?? "", ship_address: s.ship_address ?? "",
      ship_city: s.ship_city ?? "", ship_pincode: s.ship_pincode ?? "", dispatched_on: s.dispatched_on ?? "", courier: s.courier ?? "", tracking_no: s.tracking_no ?? "",
      delivered_on: s.delivered_on ?? "", receipt_confirmed: !!s.receipt_confirmed_at, notes: s.notes ?? "",
      items: s.items.length ? s.items.map((i) => ({ product_id: String(i.product_id), quantity: String(i.quantity), unit_value: i.unit_value })) : blank.items,
    });
    setErrs({}); setNote(null); setEditing(s.id);
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true); setErrs({}); setNote(null);
    const items = f.items.filter((r) => r.product_id).map((r) => ({ product_id: Number(r.product_id), quantity: Number(r.quantity || 1), unit_value: r.unit_value === "" ? undefined : Number(r.unit_value) }));
    const body: Record<string, unknown> = {
      creator_id: Number(f.creator_id), campaign_id: f.campaign_id ? Number(f.campaign_id) : null, collaboration_id: f.collaboration_id ? Number(f.collaboration_id) : null,
      status: f.status, items, shipping_charge: f.shipping_charge === "" ? 0 : Number(f.shipping_charge), ship_name: f.ship_name, ship_phone: f.ship_phone, ship_address: f.ship_address,
      ship_city: f.ship_city, ship_pincode: f.ship_pincode, dispatched_on: f.dispatched_on || null, courier: f.courier, tracking_no: f.tracking_no, delivered_on: f.delivered_on || null, notes: f.notes,
    };
    if (f.sample_value !== "") body.sample_value = Number(f.sample_value);
    if (f.receipt_confirmed) body.receipt_confirmed = true;
    try {
      await call(editing === "new" ? "/admin/marketing/samples" : `/admin/marketing/samples/${editing}`, { method: editing === "new" ? "POST" : "PUT", body });
      setNote({ ok: true, text: "Saved." }); setEditing(null); load();
    } catch (er) { if (er instanceof ApiError) setErrs(er.errors); setNote({ ok: false, text: errorText(er) }); } finally { setBusy(false); }
  }
  async function del(s: Sample) {
    if (!window.confirm("Delete this sample package?")) return;
    try { await call(`/admin/marketing/samples/${s.id}`, { method: "DELETE" }); load(); } catch (er) { setNote({ ok: false, text: errorText(er) }); }
  }

  return (
    <Page title="Product sampling" help="Choose sweets from your catalogue, assign them to a creator and follow the shipment. Dispatch and delivery dates are entered by you; nothing is marked delivered automatically, and your stock levels and orders are not changed."
      actions={editing === null ? <button className={btnDark} onClick={() => { setF(blank); setErrs({}); setNote(null); setEditing("new"); }}>New sample package</button> : undefined}>
      <Notice n={note} />
      {editing !== null && (
        <form onSubmit={save} className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label htmlFor="s-cr" className="text-xs font-medium">Creator *</label><select id="s-cr" required value={f.creator_id} onChange={(x) => { set("creator_id", x.target.value); set("collaboration_id", ""); }} className={box}><option value="">Choose…</option>{(lookups.creators ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>{e("creator_id") && <p className="text-xs text-red-600">{e("creator_id")}</p>}</div>
            <div><label htmlFor="s-ca" className="text-xs font-medium">Campaign</label><select id="s-ca" value={f.campaign_id} onChange={(x) => set("campaign_id", x.target.value)} className={box}><option value="">None</option>{(lookups.campaigns ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div><label htmlFor="s-co" className="text-xs font-medium">Linked collaboration</label><select id="s-co" value={f.collaboration_id} onChange={(x) => set("collaboration_id", x.target.value)} className={box}><option value="">None</option>{collabs.map((c) => <option key={c.id} value={c.id}>{c.campaign.name}</option>)}</select>{e("collaboration_id") && <p className="text-xs text-red-600">{e("collaboration_id")}</p>}<p className="text-xs text-stone-500">Links this package to the creator&apos;s timeline.</p></div>
          </div>

          <fieldset className="mt-4">
            <legend className="text-sm font-semibold">Sweets in this package</legend>
            {f.items.map((r, i) => (
              <div key={i} className="mt-2 grid items-end gap-2 sm:grid-cols-[1fr_6rem_8rem_auto]">
                <div><label className="text-xs font-medium" htmlFor={`p${i}`}>Product</label><select id={`p${i}`} value={r.product_id} onChange={(x) => setRow(i, "product_id", x.target.value)} className={box}><option value="">Choose…</option>{(lookups.products ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                <div><label className="text-xs font-medium" htmlFor={`q${i}`}>Quantity</label><input id={`q${i}`} type="number" min="1" value={r.quantity} onChange={(x) => setRow(i, "quantity", x.target.value)} className={box} /></div>
                <div><label className="text-xs font-medium" htmlFor={`u${i}`}>Value each (₹)</label><input id={`u${i}`} type="number" min="0" step="0.01" placeholder="catalogue price" value={r.unit_value} onChange={(x) => setRow(i, "unit_value", x.target.value)} className={box} /></div>
                <button type="button" className={btnDanger} onClick={() => set("items", f.items.filter((_, j) => j !== i))} aria-label="Remove this sweet">Remove</button>
              </div>
            ))}
            {e("items") && <p className="text-xs text-red-600">{e("items")}</p>}
            <button type="button" className={`${btnLight} mt-2`} onClick={() => set("items", [...f.items, { product_id: "", quantity: "1", unit_value: "" }])}>Add another sweet</button>
            <p className="mt-1 text-xs text-stone-500">Gift boxes are products too: pick them from the same list.</p>
          </fieldset>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div><label htmlFor="s-sv" className="text-xs font-medium">Sample value (₹)</label><input id="s-sv" type="number" min="0" step="0.01" placeholder="auto: sum of the sweets" value={f.sample_value} onChange={(x) => set("sample_value", x.target.value)} className={box} /></div>
            <div><label htmlFor="s-sc" className="text-xs font-medium">Shipping charge (₹)</label><input id="s-sc" type="number" min="0" step="0.01" value={f.shipping_charge} onChange={(x) => set("shipping_charge", x.target.value)} className={box} /></div>
            <div><label htmlFor="s-st" className="text-xs font-medium">Status</label><select id="s-st" value={f.status} onChange={(x) => set("status", x.target.value)} className={box}>{SAMPLE_STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>{e("status") && <p className="text-xs text-red-600">{e("status")}</p>}</div>
            <div><label htmlFor="s-sn" className="text-xs font-medium">Ship to: name</label><input id="s-sn" value={f.ship_name} onChange={(x) => set("ship_name", x.target.value)} className={box} /></div>
            <div><label htmlFor="s-sp" className="text-xs font-medium">Ship to: phone</label><input id="s-sp" type="tel" value={f.ship_phone} onChange={(x) => set("ship_phone", x.target.value)} className={box} />{e("ship_phone") && <p className="text-xs text-red-600">{e("ship_phone")}</p>}</div>
            <div><label htmlFor="s-sc2" className="text-xs font-medium">City</label><input id="s-sc2" value={f.ship_city} onChange={(x) => set("ship_city", x.target.value)} className={box} /></div>
            <div className="sm:col-span-2"><label htmlFor="s-sa" className="text-xs font-medium">Shipping address</label><textarea id="s-sa" rows={2} value={f.ship_address} onChange={(x) => set("ship_address", x.target.value)} className={box} /></div>
            <div><label htmlFor="s-pin" className="text-xs font-medium">Pincode</label><input id="s-pin" value={f.ship_pincode} onChange={(x) => set("ship_pincode", x.target.value)} className={box} /></div>
            <div><label htmlFor="s-dd" className="text-xs font-medium">Dispatch date</label><input id="s-dd" type="date" value={f.dispatched_on} onChange={(x) => set("dispatched_on", x.target.value)} className={box} />{e("dispatched_on") && <p className="text-xs text-red-600">{e("dispatched_on")}</p>}</div>
            <div><label htmlFor="s-co2" className="text-xs font-medium">Courier</label><input id="s-co2" value={f.courier} onChange={(x) => set("courier", x.target.value)} className={box} /></div>
            <div><label htmlFor="s-tn" className="text-xs font-medium">Tracking number</label><input id="s-tn" value={f.tracking_no} onChange={(x) => set("tracking_no", x.target.value)} className={box} /></div>
            <div><label htmlFor="s-dl" className="text-xs font-medium">Delivered on</label><input id="s-dl" type="date" value={f.delivered_on} onChange={(x) => set("delivered_on", x.target.value)} className={box} />{e("delivered_on") && <p className="text-xs text-red-600">{e("delivered_on")}</p>}<p className="text-xs text-stone-500">Enter only when it has really arrived.</p></div>
            <label className="mt-6 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.receipt_confirmed} onChange={(x) => set("receipt_confirmed", x.target.checked)} /> Creator confirmed receipt</label>
            <div className="sm:col-span-3"><label htmlFor="s-n" className="text-xs font-medium">Notes</label><textarea id="s-n" rows={2} value={f.notes} onChange={(x) => set("notes", x.target.value)} className={box} /></div>
          </div>
          <div className="mt-4 flex gap-2"><button type="submit" disabled={busy} className={btnDark}>{busy ? "Saving…" : "Save package"}</button><button type="button" onClick={() => setEditing(null)} className={btnLight}>Cancel</button></div>
        </form>
      )}

      <div className="mb-3"><label htmlFor="flt" className="text-xs font-medium">Status</label><select id="flt" value={status} onChange={(x) => setStatus(x.target.value)} className={`${box} w-48`}><option value="">All</option>{SAMPLE_STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
      {rows === null ? <p className="text-sm">Loading…</p> : rows.length === 0 ? <p className="rounded-xl border bg-white p-6 text-center text-sm text-stone-600">No sample packages yet.</p> : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500"><tr><th className="px-3 py-2">Creator</th><th className="px-3 py-2">Sweets</th><th className="px-3 py-2">Value / shipping</th><th className="px-3 py-2">Shipment</th><th className="px-3 py-2">Status</th><th className="px-3 py-2"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y">
              {rows.map((s) => (
                <tr key={s.id} className="align-top">
                  <td className="px-3 py-2"><p className="font-semibold">{s.creator.name}</p><p className="text-xs text-stone-500">{s.campaign?.name ?? "No campaign"}</p></td>
                  <td className="px-3 py-2">{s.items.map((i) => `${i.quantity} × ${i.name}`).join(", ") || <span className="text-stone-400">None yet</span>}</td>
                  <td className="px-3 py-2">{inr(s.sample_value)}<span className="block text-xs text-stone-500">shipping {inr(s.shipping_charge)}</span></td>
                  <td className="px-3 py-2 text-xs">{s.courier ? `${s.courier} ` : ""}{s.tracking_no ? `#${s.tracking_no}` : ""}{s.dispatched_on ? <span className="block">Sent {fmtDate(s.dispatched_on)}</span> : null}{s.delivered_on ? <span className="block">Delivered {fmtDate(s.delivered_on)}</span> : null}{s.receipt_confirmed_at ? <span className="block text-green-700">Creator confirmed</span> : null}</td>
                  <td className="px-3 py-2"><Badge s={s.status} text={label(SAMPLE_STATUSES, s.status)} /></td>
                  <td className="whitespace-nowrap px-3 py-2 text-right"><button className={btnLight} onClick={() => edit(s)}>Edit</button> <button className={btnDanger} onClick={() => del(s)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
