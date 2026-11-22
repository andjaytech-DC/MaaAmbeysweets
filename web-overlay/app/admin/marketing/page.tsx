"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { btnLight, fmtDate, Note, Notice, Page, useAdmin } from "@/components/admin/marketing/kit";
import { errorText } from "@/lib/media";

type D = {
  counts: Record<string, number>;
  reminders_due: { collaboration_id: number; creator: string; campaign: string | null; delivered_on: string }[];
  timeline: { id: number; label: string; note: string | null; actor: string; at: string; creator: string | null; campaign: string | null; collaboration_id: number }[];
  workflow: string[];
};
const CARDS: { key: string; label: string; href: string }[] = [
  { key: "new_applications", label: "New applications", href: "/admin/marketing/applications" },
  { key: "creators", label: "Creators in directory", href: "/admin/marketing/creators" },
  { key: "campaigns_live", label: "Campaigns open or active", href: "/admin/marketing/campaigns" },
  { key: "awaiting_approval", label: "Accepted, awaiting your approval", href: "/admin/marketing/campaigns" },
  { key: "samples_to_send", label: "Sample packages to send", href: "/admin/marketing/product-sampling" },
  { key: "samples_in_transit", label: "Samples on the way", href: "/admin/marketing/product-sampling" },
  { key: "content_pending", label: "Links waiting for review", href: "/admin/marketing/reviews" },
  { key: "featured_reviews", label: "Reviews on the website", href: "/admin/marketing/reviews" },
];

export default function Dashboard() {
  const { token, call } = useAdmin();
  const [d, setD] = useState<D | null>(null);
  const [note, setNote] = useState<Note>(null);
  const load = useCallback(() => { if (token) call<D>("/admin/marketing/dashboard").then(setD).catch((e) => setNote({ ok: false, text: errorText(e) })); }, [token, call]);
  useEffect(() => { load(); }, [load]);

  async function remind(id: number) {
    try { const r = await call<{ email_sent: boolean }>(`/admin/marketing/collaborations/${id}/remind`, { method: "POST" }); setNote({ ok: r.email_sent, text: r.email_sent ? "Reminder emailed." : "Could not email (no address, or email is not set up)." }); load(); }
    catch (e) { setNote({ ok: false, text: errorText(e) }); }
  }

  return (
    <Page title="Marketing dashboard" help="What needs your attention across creators, campaigns and sweets sent for review. All numbers are live from your records.">
      <Notice n={note} />
      {!d ? <p className="text-sm">Loading…</p> : (
        <>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {CARDS.map((c) => (
              <li key={c.key}><Link href={c.href} className="block rounded-xl border bg-white p-4 shadow-sm hover:border-stone-400"><span className="block text-3xl font-bold">{d.counts[c.key] ?? 0}</span><span className="text-sm text-stone-600">{c.label}</span></Link></li>
            ))}
          </ul>

          {d.reminders_due.length > 0 && (
            <section className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4" aria-label="Review reminders">
              <h2 className="font-semibold">Waiting for a review</h2>
              <ul className="mt-2 space-y-1 text-sm">{d.reminders_due.map((r) => <li key={r.collaboration_id} className="flex flex-wrap items-center justify-between gap-2"><span>{r.creator}{r.campaign ? ` · ${r.campaign}` : ""} · delivered {fmtDate(r.delivered_on)}</span><button className={btnLight} onClick={() => remind(r.collaboration_id)}>Send reminder</button></li>)}</ul>
            </section>
          )}

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_20rem]">
            <section aria-label="Recent activity" className="rounded-xl border bg-white p-4 shadow-sm">
              <h2 className="font-semibold">Recent activity</h2>
              {d.timeline.length === 0 ? <p className="mt-2 text-sm text-stone-600">Nothing yet. Activity appears here as you invite creators, send sweets and receive links.</p> : (
                <ol className="mt-3 space-y-2 border-l-2 border-stone-200 pl-4 text-sm">
                  {d.timeline.map((e) => (
                    <li key={e.id}><span className="font-medium">{e.label}</span> <span className="text-stone-600">{e.creator ? `· ${e.creator}` : ""}{e.campaign ? ` · ${e.campaign}` : ""}{e.note ? ` · ${e.note}` : ""}</span><span className="block text-xs text-stone-500">{new Date(e.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {e.actor}</span></li>
                  ))}
                </ol>
              )}
            </section>
            <section aria-label="How a collaboration works" className="rounded-xl border bg-white p-4 shadow-sm">
              <h2 className="font-semibold">How it works</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-stone-700">{d.workflow.map((w) => <li key={w}>{w}</li>)}</ol>
            </section>
          </div>
        </>
      )}
    </Page>
  );
}
