"use client";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { Badge, box, btnDanger, btnDark, fmtDate, inr, Note, Notice, Page, useAdmin, useLookups } from "@/components/admin/marketing/kit";
import { errorText } from "@/lib/media";
import { METRIC_SOURCES } from "@/lib/marketing";

type Metric = { key: string; label: string; value: number | null; basis: string; note: string | null };
type Data = { sections: { title: string; metrics: Metric[] }[]; content_metrics: Record<string, { items: number; views: number; likes: number; comments: number; shares: number; clicks: number }>; budget: string | null; note: string };
type Exp = { id: number; amount: string; spent_on: string | null; note: string | null; campaign_id: number | null };

const BASIS: Record<string, string> = { verified: "Verified: counted by this website", recorded: "Recorded: typed in by you", creator_reported: "Reported by creator", estimated: "Estimate" };

export default function Analytics() {
  const { token, call } = useAdmin();
  const lookups = useLookups(call, !!token);
  const [cid, setCid] = useState("");
  const [d, setD] = useState<Data | null>(null);
  const [exp, setExp] = useState<Exp[]>([]);
  const [note, setNote] = useState<Note>(null);
  const [ex, setEx] = useState({ amount: "", note: "", spent_on: "" });
  const [errs, setErrs] = useState<Record<string, string[]>>({});

  const load = useCallback(async () => {
    if (!token) return;
    const q = cid ? `?campaign_id=${cid}` : "";
    try { setD(await call<Data>(`/admin/marketing/analytics${q}`)); setExp(await call<Exp[]>(`/admin/marketing/expenses${q}`)); } catch (e) { setNote({ ok: false, text: errorText(e) }); }
  }, [token, call, cid]);
  useEffect(() => { load(); }, [load]);

  async function addExpense(ev: React.FormEvent) {
    ev.preventDefault(); setErrs({});
    try {
      await call("/admin/marketing/expenses", { method: "POST", body: { kind: "other", amount: Number(ex.amount), note: ex.note || null, spent_on: ex.spent_on || null, campaign_id: cid ? Number(cid) : null } });
      setEx({ amount: "", note: "", spent_on: "" }); setNote({ ok: true, text: "Expense recorded." }); load();
    } catch (er) { if (er instanceof ApiError) setErrs(er.errors); setNote({ ok: false, text: errorText(er) }); }
  }
  async function delExp(x: Exp) { try { await call(`/admin/marketing/expenses/${x.id}`, { method: "DELETE" }); load(); } catch (er) { setNote({ ok: false, text: errorText(er) }); } }

  const money = (m: Metric) => (m.value === null ? "Not enough data" : m.label.includes("₹") || m.key.startsWith("cost") || m.key === "revenue" || m.key.startsWith("commission") ? inr(m.value) : m.key === "conversion" ? `${m.value}%` : m.value.toLocaleString("en-IN"));
  const spent = d?.sections.flatMap((s) => s.metrics).find((m) => m.key === "cost_total")?.value ?? 0;

  return (
    <Page title="Campaign analytics" help="Every figure comes from records in this system, and each one says how far to trust it. Reach, impressions and engagement are shown only if someone entered them, and are never added together across sources.">
      <Notice n={note} />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div><label htmlFor="c" className="text-xs font-medium">Campaign</label><select id="c" value={cid} onChange={(e) => setCid(e.target.value)} className={`${box} w-64`}><option value="">All campaigns</option>{(lookups.campaigns ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
        <ul className="flex flex-wrap gap-2 text-xs" aria-label="What the labels mean">{Object.entries(BASIS).map(([k, t]) => <li key={k}><Badge s={k} text={t} /></li>)}</ul>
      </div>
      {!d ? <p className="text-sm">Loading…</p> : (
        <>
          {d.budget && <p className="mb-3 rounded bg-white p-3 text-sm shadow-sm">Budget {inr(d.budget)} · spent so far {inr(spent)} · remaining {inr(Number(d.budget) - Number(spent))}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            {d.sections.map((s) => (
              <section key={s.title} className="rounded-xl border bg-white p-4 shadow-sm" aria-label={s.title}>
                <h2 className="font-semibold">{s.title}</h2>
                <table className="mt-2 w-full text-sm"><tbody className="divide-y">
                  {s.metrics.map((m) => (
                    <tr key={m.key}><th scope="row" className="py-1.5 pr-2 text-left font-normal">{m.label}{m.note && <span className="block text-xs text-stone-500">{m.note}</span>}</th>
                      <td className="py-1.5 text-right font-semibold">{money(m)}</td><td className="py-1.5 pl-2 text-right"><Badge s={m.basis} text={m.basis === "verified" ? "Verified" : m.basis === "recorded" ? "Recorded" : m.basis === "estimated" ? "Estimate" : "Reported"} /></td></tr>
                  ))}
                </tbody></table>
              </section>
            ))}
          </div>

          <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm" aria-label="Content numbers by source">
            <h2 className="font-semibold">Views and engagement on approved content</h2>
            <p className="text-xs text-stone-500">Entered on the Published reviews page. Each source is kept separate.</p>
            <div className="mt-2 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="text-xs uppercase text-stone-500"><tr><th className="py-1 pr-3">Source</th><th className="pr-3">Items</th><th className="pr-3">Views</th><th className="pr-3">Likes</th><th className="pr-3">Comments</th><th className="pr-3">Shares</th><th>Link clicks</th></tr></thead>
              <tbody className="divide-y">{Object.entries(d.content_metrics).map(([k, v]) => <tr key={k}><td className="py-1 pr-3"><Badge s={k} text={METRIC_SOURCES.find((x) => x.value === k)?.label} /></td><td>{v.items}</td><td>{v.items ? v.views.toLocaleString("en-IN") : "—"}</td><td>{v.items ? v.likes.toLocaleString("en-IN") : "—"}</td><td>{v.items ? v.comments.toLocaleString("en-IN") : "—"}</td><td>{v.items ? v.shares.toLocaleString("en-IN") : "—"}</td><td>{v.items ? v.clicks.toLocaleString("en-IN") : "—"}</td></tr>)}</tbody></table></div>
          </section>

          <section className="mt-4 rounded-xl border bg-white p-4 shadow-sm" aria-label="Other expenses">
            <h2 className="font-semibold">Other expenses{cid ? " for this campaign" : ""}</h2>
            <p className="text-xs text-stone-500">Sweets sent, shipping and paid fees are counted from their own records. Add anything else here (for example props or an ad).</p>
            <form onSubmit={addExpense} className="mt-2 flex flex-wrap items-end gap-2">
              <div><label htmlFor="x1" className="text-xs font-medium">Amount (₹)</label><input id="x1" required type="number" min="0.01" step="0.01" value={ex.amount} onChange={(e) => setEx({ ...ex, amount: e.target.value })} className={`${box} w-32`} />{errs.amount && <p className="text-xs text-red-600">{errs.amount[0]}</p>}</div>
              <div><label htmlFor="x2" className="text-xs font-medium">Date</label><input id="x2" type="date" value={ex.spent_on} onChange={(e) => setEx({ ...ex, spent_on: e.target.value })} className={box} /></div>
              <div className="min-w-48 flex-1"><label htmlFor="x3" className="text-xs font-medium">What for</label><input id="x3" value={ex.note} onChange={(e) => setEx({ ...ex, note: e.target.value })} className={box} /></div>
              <button className={btnDark}>Add</button>
            </form>
            {exp.length > 0 && <ul className="mt-2 divide-y text-sm">{exp.map((x) => <li key={x.id} className="flex items-center justify-between gap-2 py-1.5"><span>{inr(x.amount)} · {x.note || "Expense"}{x.spent_on ? ` · ${fmtDate(x.spent_on)}` : ""}</span><button className={btnDanger} onClick={() => delExp(x)}>Remove</button></li>)}</ul>}
          </section>
          <p className="mt-3 text-xs text-stone-500">{d.note}</p>
        </>
      )}
    </Page>
  );
}
