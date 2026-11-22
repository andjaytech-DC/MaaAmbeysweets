"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, btnDark, btnLight, box, fmtDate, inr, Note, Notice, Page, useAdmin, useLookups } from "@/components/admin/marketing/kit";
import { COLLAB_STATUS_LABEL, COMPENSATION } from "@/lib/marketing";
import { errorText } from "@/lib/media";

type Ev = { id: number; label: string; note: string | null; actor: string; created_at: string };
type Collab = {
  id: number; status: string; compensation_type: string; agreed_fee: string | null; payment_status: string; notes: string | null; link: string; reminder_sent_at: string | null;
  creator: { id: number; name: string; city: string | null; email: string | null }; events: Ev[];
};
type Camp = { id: number; name: string; status: string; budget: string | null; starts_at: string | null; ends_at: string | null; products: { id: number; name: string }[]; collaborations: Collab[] };
type InviteResult = { creator_id: number; name: string; invited: boolean; reason?: string; email_sent?: boolean; link?: string };

// Mirrors the server's rules; the server enforces them regardless.
const NEXT: Record<string, string[]> = {
  invited: ["cancelled"], accepted: ["approved", "cancelled"], declined: [], approved: ["cancelled"],
  content_submitted: ["content_approved", "cancelled"], content_approved: ["completed", "cancelled"], completed: [], cancelled: [],
};

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { token, call } = useAdmin();
  const lookups = useLookups(call, !!token);
  const [c, setC] = useState<Camp | null>(null);
  const [note, setNote] = useState<Note>(null);
  const [pick, setPick] = useState<string[]>([]);
  const [comp, setComp] = useState("gifted");
  const [fee, setFee] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<InviteResult[]>([]);
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try { setC(await call<Camp>(`/admin/marketing/campaigns/${id}`)); } catch (e) { setNote({ ok: false, text: errorText(e) }); }
  }, [token, call, id]);
  useEffect(() => { load(); }, [load]);

  const invitedIds = new Set((c?.collaborations ?? []).map((x) => String(x.creator.id)));
  const choices = (lookups.creators ?? []).filter((o) => !invitedIds.has(o.value));

  async function invite() {
    setBusy(true); setNote(null);
    try {
      const r = await call<{ results: InviteResult[] }>(`/admin/marketing/campaigns/${id}/invite`, { method: "POST", body: { creator_ids: pick.map(Number), compensation_type: comp, agreed_fee: comp === "paid" ? fee : undefined } });
      setResults(r.results); setPick([]); load();
      setNote({ ok: true, text: `${r.results.filter((x) => x.invited).length} invitation(s) created.` });
    } catch (e) { setNote({ ok: false, text: errorText(e) }); } finally { setBusy(false); }
  }
  async function patch(col: Collab, body: object, done: string) {
    try { await call(`/admin/marketing/collaborations/${col.id}`, { method: "PATCH", body }); setNote({ ok: true, text: done }); load(); }
    catch (e) { setNote({ ok: false, text: errorText(e) }); }
  }
  async function remind(col: Collab) {
    try { const r = await call<{ email_sent: boolean }>(`/admin/marketing/collaborations/${col.id}/remind`, { method: "POST" }); setNote({ ok: r.email_sent, text: r.email_sent ? "Reminder emailed." : "Reminder could not be emailed (no address, or email is not set up). Share their link instead." }); load(); }
    catch (e) { setNote({ ok: false, text: errorText(e) }); }
  }
  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); setNote({ ok: true, text: "Link copied. It is private to that creator." }); } catch { setNote({ ok: false, text: t }); } };

  if (!c) return <Page title="Campaign"><Notice n={note} /><p className="text-sm">Loading…</p></Page>;
  const canInvite = ["open", "recruiting", "active"].includes(c.status);

  return (
    <Page title={c.name} help={`${c.starts_at || c.ends_at ? `${fmtDate(c.starts_at)} – ${fmtDate(c.ends_at)} · ` : ""}${c.budget ? `Budget ${inr(c.budget)} · ` : ""}${c.products.length ? c.products.map((p) => p.name).join(", ") : "No products chosen yet"}`}
      actions={<div className="flex items-center gap-2"><Badge s={c.status} /><Link href="/admin/marketing/campaigns" className={btnLight}>Back to campaigns</Link></div>}>
      <Notice n={note} />

      <section aria-labelledby="inv" className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
        <h2 id="inv" className="text-lg font-semibold">Invite creators</h2>
        {!canInvite ? <p className="mt-2 text-sm text-amber-800">Set the campaign to Open, Recruiting or Active (Campaigns → Edit) before inviting creators.</p> : (
          <>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <p className="text-xs font-medium">Creators</p>
                <div className="mt-1 max-h-44 overflow-y-auto rounded border p-2">
                  {choices.length === 0 && <p className="text-xs text-stone-500">Everyone in the directory has already been invited, or the directory is empty. <Link className="underline" href="/admin/marketing/creators">Add creators</Link></p>}
                  {choices.map((o) => <label key={o.value} className="flex items-center gap-2 py-0.5 text-sm"><input type="checkbox" checked={pick.includes(o.value)} onChange={(e) => setPick(e.target.checked ? [...pick, o.value] : pick.filter((x) => x !== o.value))} /> {o.label}</label>)}
                </div>
              </div>
              <div><label htmlFor="comp" className="text-xs font-medium">How are they rewarded?</label><select id="comp" value={comp} onChange={(e) => setComp(e.target.value)} className={box}>{COMPENSATION.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              {comp === "paid" && <div><label htmlFor="fee" className="text-xs font-medium">Agreed fee (₹)</label><input id="fee" type="number" min="0" value={fee} onChange={(e) => setFee(e.target.value)} className={box} /></div>}
            </div>
            <button type="button" disabled={busy || pick.length === 0} onClick={invite} className={`${btnDark} mt-3`}>{busy ? "Sending…" : `Invite ${pick.length || ""} creator${pick.length === 1 ? "" : "s"}`}</button>
            <p className="mt-2 text-xs text-stone-500">Each creator gets a private link to accept or decline. If email is not set up, copy the link from the list below and send it yourself.</p>
          </>
        )}
        {results.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {results.map((r) => <li key={r.creator_id}>{r.invited ? "✓" : "✗"} {r.name}: {r.invited ? (r.email_sent ? "invitation emailed" : "created, but not emailed: copy their link below") : r.reason}</li>)}
          </ul>
        )}
      </section>

      <h2 className="mb-2 text-lg font-semibold">Creators in this campaign ({c.collaborations.length})</h2>
      {c.collaborations.length === 0 ? <p className="rounded-xl border bg-white p-6 text-center text-sm text-stone-600">No one has been invited yet.</p> : (
        <ul className="space-y-3">
          {c.collaborations.map((col) => (
            <li key={col.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{col.creator.name} <Badge s={col.status} text={COLLAB_STATUS_LABEL[col.status]} /></p>
                  <p className="text-xs text-stone-500">{COMPENSATION.find((x) => x.value === col.compensation_type)?.label}{col.agreed_fee ? ` · ${inr(col.agreed_fee)}` : ""}{col.compensation_type === "paid" ? ` · payment ${col.payment_status}` : ""}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {col.status === "approved" && <button className={btnLight} onClick={() => remind(col)}>Send reminder</button>}
                  {col.compensation_type === "paid" && col.payment_status !== "paid" && !["declined", "cancelled"].includes(col.status) && <button className={btnLight} onClick={() => patch(col, { payment_status: "paid" }, "Payment recorded.")}>Mark paid</button>}
                  {(NEXT[col.status] ?? []).filter((s) => s !== "cancelled").map((s) => <button key={s} className={btnLight} onClick={() => patch(col, { status: s }, `Moved to ${COLLAB_STATUS_LABEL[s]}.`)}>{s === "completed" ? "Mark completed" : s === "content_approved" ? "Approve content" : s === "approved" ? "Approve collaboration" : COLLAB_STATUS_LABEL[s]}</button>)}
                  {NEXT[col.status]?.includes("cancelled") && <button className={btnLight} onClick={() => window.confirm("Cancel this collaboration?") && patch(col, { status: "cancelled" }, "Cancelled.")}>Cancel</button>}
                  <button className={btnLight} onClick={() => copy(col.link)}>Copy creator link</button>
                  <button className={btnLight} aria-expanded={open === col.id} onClick={() => setOpen(open === col.id ? null : col.id)}>Timeline</button>
                </div>
              </div>
              {open === col.id && (
                <ol className="mt-3 space-y-1 border-l-2 border-stone-200 pl-4 text-sm">
                  {col.events.map((e) => <li key={e.id}><span className="font-medium">{e.label}</span>{e.note ? ` · ${e.note}` : ""} <span className="text-xs text-stone-500">({e.actor}, {new Date(e.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })})</span></li>)}
                </ol>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-stone-500">Next steps for an approved creator: <Link className="underline" href="/admin/marketing/product-sampling">send sweets</Link> and, once they publish, review their links under <Link className="underline" href="/admin/marketing/reviews">Published reviews</Link>.</p>
    </Page>
  );
}
