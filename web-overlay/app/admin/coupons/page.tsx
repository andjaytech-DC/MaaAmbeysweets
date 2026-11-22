"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, Coupon, rupees } from "@/lib/api";
import { clearToken, useAdminToken } from "@/lib/auth";

type Errors = Record<string, string[]>;
const blank = { code: "", title: "", type: "percent", value: "", min_order: "", max_discount: "", starts_at: "", ends_at: "", usage_limit: "", is_active: true, is_public: false };

export default function AdminCoupons() {
  const token = useAdminToken();
  const router = useRouter();
  const [list, setList] = useState<Coupon[] | null>(null);
  const [f, setF] = useState(blank);
  const [editing, setEditing] = useState<number | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try { setList(await api<Coupon[]>("/admin/coupons", { token })); }
    catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { clearToken(); router.replace("/admin/login"); }
      else setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed to load" });
    }
  }, [token, router]);
  useEffect(() => { load(); }, [load]);

  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));
  const err = (k: string) => errors[k]?.[0];

  function edit(c: Coupon) {
    setEditing(c.id); setErrors({}); setMsg(null);
    setF({ code: c.code, title: c.title, type: c.type, value: String(Number(c.value)), min_order: Number(c.min_order) ? String(Number(c.min_order)) : "", max_discount: c.max_discount ? String(Number(c.max_discount)) : "", starts_at: c.starts_at ?? "", ends_at: c.ends_at ?? "", usage_limit: c.usage_limit ? String(c.usage_limit) : "", is_active: c.is_active, is_public: c.is_public });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const reset = () => { setEditing(null); setF(blank); setErrors({}); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setMsg(null);
    const v: Errors = {};
    if (!f.code.trim()) v.code = ["Enter a code."];
    if (!f.title.trim()) v.title = ["Enter the offer name customers will see."];
    if (!f.value || Number(f.value) <= 0) v.value = ["Enter the discount."];
    else if (f.type === "percent" && Number(f.value) > 100) v.value = ["A percentage cannot be more than 100."];
    if (f.starts_at && f.ends_at && f.ends_at < f.starts_at) v.ends_at = ["The end date cannot be before the start date."];
    setErrors(v);
    if (Object.keys(v).length) { setMsg({ ok: false, text: "Please fix the highlighted fields." }); return; }
    setBusy(true);
    try {
      const body = { ...f, code: f.code.trim().toUpperCase() };
      if (editing) await api(`/admin/coupons/${editing}`, { method: "PUT", token, body });
      else await api("/admin/coupons", { method: "POST", token, body });
      setMsg({ ok: true, text: editing ? "Offer updated." : "Offer added." });
      reset(); load();
    } catch (ex) {
      if (ex instanceof ApiError) { setErrors(ex.errors); setMsg({ ok: false, text: Object.keys(ex.errors).length ? "Please fix the highlighted fields." : ex.message }); }
    } finally { setBusy(false); }
  }

  async function del(c: Coupon) {
    if (!token || !confirm(`Delete offer ${c.code}?`)) return;
    try { await api(`/admin/coupons/${c.id}`, { method: "DELETE", token }); load(); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Delete failed" }); }
  }

  if (!token) return null;
  const box = (k: string) => `mt-1 w-full rounded-xl border-2 bg-white px-3 py-2 ${err(k) ? "border-gulab" : "border-ink/20"}`;
  const Err = ({ k }: { k: string }) => (err(k) ? <p className="mt-1 text-sm text-gulab">{errors[k].join(" ")}</p> : null);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl">Offers and coupons</h1>
      <p className="mt-1 text-ink/70">Create a code for a festival or promotion. Tick &ldquo;Show on website&rdquo; to put it in the offer strip on the home page.</p>

      <form onSubmit={submit} noValidate className="mt-6 grid gap-4 rounded-2xl bg-pista-soft p-5 sm:grid-cols-2">
        <h2 className="text-xl sm:col-span-2">{editing ? "Edit offer" : "New offer"}</h2>
        <div><label htmlFor="code" className="text-sm font-medium">Code</label><input id="code" value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="DIWALI10" className={box("code")} /><Err k="code" /></div>
        <div><label htmlFor="title" className="text-sm font-medium">Offer name (shown to customers)</label><input id="title" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Diwali offer" className={box("title")} /><Err k="title" /></div>
        <div><label htmlFor="type" className="text-sm font-medium">Type</label><select id="type" value={f.type} onChange={(e) => set("type", e.target.value)} className={box("type")}><option value="percent">Percentage off</option><option value="flat">Flat amount off (₹)</option></select></div>
        <div><label htmlFor="value" className="text-sm font-medium">{f.type === "percent" ? "Percent off" : "Amount off (₹)"}</label><input id="value" type="number" step="0.01" min="0" inputMode="decimal" value={f.value} onChange={(e) => set("value", e.target.value)} className={box("value")} /><Err k="value" /></div>
        <div><label htmlFor="min" className="text-sm font-medium">Minimum order (₹, optional)</label><input id="min" type="number" step="1" min="0" value={f.min_order} onChange={(e) => set("min_order", e.target.value)} className={box("min_order")} /><Err k="min_order" /></div>
        {f.type === "percent" && <div><label htmlFor="max" className="text-sm font-medium">Maximum discount (₹, optional)</label><input id="max" type="number" step="1" min="0" value={f.max_discount} onChange={(e) => set("max_discount", e.target.value)} className={box("max_discount")} /><Err k="max_discount" /></div>}
        <div><label htmlFor="start" className="text-sm font-medium">Starts (optional)</label><input id="start" type="date" value={f.starts_at} onChange={(e) => set("starts_at", e.target.value)} className={box("starts_at")} /><Err k="starts_at" /></div>
        <div><label htmlFor="end" className="text-sm font-medium">Ends (optional, last day included)</label><input id="end" type="date" value={f.ends_at} onChange={(e) => set("ends_at", e.target.value)} className={box("ends_at")} /><Err k="ends_at" /></div>
        <div><label htmlFor="limit" className="text-sm font-medium">Total uses allowed (optional)</label><input id="limit" type="number" step="1" min="1" value={f.usage_limit} onChange={(e) => set("usage_limit", e.target.value)} className={box("usage_limit")} /><Err k="usage_limit" /></div>
        <div className="flex flex-col justify-end gap-2 pb-1 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} />Active</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={f.is_public} onChange={(e) => set("is_public", e.target.checked)} />Show on website</label>
        </div>
        <div className="sm:col-span-2">
          {msg && <p role="status" className={`mb-3 text-sm ${msg.ok ? "text-green-800" : "text-gulab"}`}>{msg.text}</p>}
          <button disabled={busy} className="rounded-full bg-kesar px-8 py-2.5 font-semibold text-ink hover:bg-kesar-deep disabled:opacity-60">{busy ? "Saving…" : editing ? "Save changes" : "Add offer"}</button>
          {editing && <button type="button" onClick={reset} className="ml-3 rounded-full border-2 border-ink/25 px-6 py-2.5 font-medium">Cancel</button>}
        </div>
      </form>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-ink/15 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-pista-soft"><tr><th className="p-3">Code</th><th className="p-3">Offer</th><th className="p-3">Discount</th><th className="p-3">Dates</th><th className="p-3">Used</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody>
            {list?.map((c) => (
              <tr key={c.id} className="border-t border-ink/10">
                <td className="p-3 font-semibold">{c.code}</td>
                <td className="p-3">{c.title}</td>
                <td className="p-3">{c.type === "percent" ? `${Number(c.value)}%` : rupees(c.value)}{Number(c.min_order) > 0 ? ` above ${rupees(c.min_order)}` : ""}</td>
                <td className="p-3">{c.starts_at ?? "any time"} to {c.ends_at ?? "no end"}</td>
                <td className="p-3">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</td>
                <td className="p-3">{c.is_active ? "Active" : "Off"}{c.is_public ? ", on website" : ""}</td>
                <td className="whitespace-nowrap p-3 text-right"><button onClick={() => edit(c)} className="mr-3 underline">Edit</button><button onClick={() => del(c)} className="text-gulab underline">Delete</button></td>
              </tr>
            ))}
            {list && list.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-ink/60">No offers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
