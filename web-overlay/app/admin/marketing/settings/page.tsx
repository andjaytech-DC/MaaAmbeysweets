"use client";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { box, btnDark, Note, Notice, Page, useAdmin } from "@/components/admin/marketing/kit";
import { errorText } from "@/lib/media";

type S = { applications_open: string; notify_email: string; reminder_after_days: string; disclosure_text: string };

export default function MarketingSettings() {
  const { token, call } = useAdmin();
  const [s, setS] = useState<S | null>(null);
  const [errs, setErrs] = useState<Record<string, string[]>>({});
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (token) call<S>("/admin/marketing/settings").then(setS).catch((e) => setNote({ ok: false, text: errorText(e) })); }, [token, call]);

  async function save(ev: React.FormEvent) {
    ev.preventDefault(); if (!s) return; setBusy(true); setErrs({}); setNote(null);
    try {
      setS(await call<S>("/admin/marketing/settings", { method: "PUT", body: { applications_open: s.applications_open === "1", notify_email: s.notify_email || null, reminder_after_days: Number(s.reminder_after_days), disclosure_text: s.disclosure_text } }));
      setNote({ ok: true, text: "Saved." });
    } catch (e) { if (e instanceof ApiError) setErrs(e.errors); setNote({ ok: false, text: errorText(e) }); } finally { setBusy(false); }
  }
  if (!s) return <Page title="Marketing settings"><Notice n={note} /><p className="text-sm">Loading…</p></Page>;
  return (
    <Page title="Marketing settings" help="Controls for the creator programme. Emails use the mail settings of the server (MAIL_* in api/.env); until those are set, messages are written to the server log instead of being sent.">
      <Notice n={note} />
      <form onSubmit={save} className="max-w-2xl space-y-4 rounded-xl border bg-white p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.applications_open === "1"} onChange={(e) => setS({ ...s, applications_open: e.target.checked ? "1" : "0" })} /> Accept creator applications on the website</label>
        <div><label htmlFor="ne" className="text-xs font-medium">Email me when something needs attention</label><input id="ne" type="email" value={s.notify_email} onChange={(e) => setS({ ...s, notify_email: e.target.value })} className={box} placeholder="owner@example.com" />{errs.notify_email && <p className="text-xs text-red-600">{errs.notify_email[0]}</p>}<p className="text-xs text-stone-500">New applications, replies to invitations, delivery confirmations and new links.</p></div>
        <div><label htmlFor="rd" className="text-xs font-medium">Remind about reviews after (days)</label><input id="rd" type="number" min="1" max="90" value={s.reminder_after_days} onChange={(e) => setS({ ...s, reminder_after_days: e.target.value })} className={`${box} w-32`} /><p className="text-xs text-stone-500">Creators whose sweets were delivered this long ago with no link yet appear on the dashboard.</p></div>
        <div><label htmlFor="dt" className="text-xs font-medium">Disclosure shown next to creator content</label><textarea id="dt" rows={3} value={s.disclosure_text} onChange={(e) => setS({ ...s, disclosure_text: e.target.value })} className={box} /><p className="text-xs text-stone-500">Paid, gifted and affiliate collaborations should always be disclosed. Each story on the website also shows its own label.</p></div>
        <button className={btnDark} disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
      </form>
    </Page>
  );
}
