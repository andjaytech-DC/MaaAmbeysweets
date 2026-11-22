"use client";
import { useCallback, useEffect, useState } from "react";
import { Badge, btnDanger, btnDark, btnLight, fmtDate, Note, Notice, Page, useAdmin } from "@/components/admin/marketing/kit";
import { errorText } from "@/lib/media";

type App = {
  id: number; full_name: string; email: string | null; phone: string | null; city: string | null; blog_url: string | null; instagram_url: string | null;
  youtube_url: string | null; facebook_url: string | null; other_links: string[] | null; collaboration_type: string | null; audience_size: number | null;
  language: string | null; message: string | null; portfolio_links: string | null; status: "new" | "approved" | "rejected"; review_note: string | null;
  created_at: string; creator?: { id: number; name: string } | null;
};

const A = ({ u, t }: { u: string | null; t: string }) => (u ? <a href={u} target="_blank" rel="noopener noreferrer" className="mr-3 text-blue-700 underline">{t}</a> : null);

export default function Applications() {
  const { token, call } = useAdmin();
  const [rows, setRows] = useState<App[] | null>(null);
  const [status, setStatus] = useState("new");
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try { setRows(await call<App[]>(`/admin/marketing/applications?status=${status}`)); } catch (e) { setRows([]); setNote({ ok: false, text: errorText(e) }); }
  }, [token, call, status]);
  useEffect(() => { load(); }, [load]);

  async function approve(a: App) {
    setBusy(a.id);
    try {
      const r = await call<{ email_sent: boolean }>(`/admin/marketing/applications/${a.id}/approve`, { method: "POST" });
      setNote({ ok: true, text: `${a.full_name} was added to the creator directory.${r.email_sent ? " An approval email was sent." : " No email was sent (no address or email is not set up)."}` });
      load();
    } catch (e) { setNote({ ok: false, text: errorText(e) }); } finally { setBusy(null); }
  }
  async function reject(a: App) {
    const reason = window.prompt("Reason (only you will see this). Leave empty for none.", "");
    if (reason === null) return;
    setBusy(a.id);
    try { await call(`/admin/marketing/applications/${a.id}/reject`, { method: "POST", body: { review_note: reason } }); setNote({ ok: true, text: "Application rejected." }); load(); }
    catch (e) { setNote({ ok: false, text: errorText(e) }); } finally { setBusy(null); }
  }
  async function remove(a: App) {
    if (!window.confirm("Delete this application?")) return;
    try { await call(`/admin/marketing/applications/${a.id}`, { method: "DELETE" }); load(); } catch (e) { setNote({ ok: false, text: errorText(e) }); }
  }

  return (
    <Page title="Creator applications" help="Applications from the public Creator Partnership page. Approving one adds the person to the creator directory; rejecting keeps a record.">
      <Notice n={note} />
      <div className="mb-3 flex gap-2" role="tablist" aria-label="Application status">
        {(["new", "approved", "rejected"] as const).map((s) => (
          <button key={s} role="tab" aria-selected={status === s} onClick={() => setStatus(s)} className={`rounded-full px-4 py-1.5 text-sm ${status === s ? "bg-stone-800 font-semibold text-white" : "border hover:bg-stone-100"}`}>{s === "new" ? "Waiting for review" : s[0].toUpperCase() + s.slice(1)}</button>
        ))}
      </div>
      {rows === null ? <p className="text-sm">Loading…</p> : rows.length === 0 ? <p className="rounded-xl border bg-white p-6 text-center text-sm text-stone-600">No applications here.</p> : (
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{a.full_name} <Badge s={a.status} /></p>
                  <p className="text-xs text-stone-500">Received {fmtDate(a.created_at)} · CA-{String(a.id).padStart(5, "0")}</p>
                </div>
                <div className="flex gap-2">
                  {a.status !== "approved" && <button disabled={busy === a.id} onClick={() => approve(a)} className={btnDark}>Approve</button>}
                  {a.status === "new" && <button disabled={busy === a.id} onClick={() => reject(a)} className={btnLight}>Reject</button>}
                  {a.status !== "approved" && <button onClick={() => remove(a)} className={btnDanger}>Delete</button>}
                </div>
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div><dt className="inline font-medium">Contact: </dt><dd className="inline">{[a.email, a.phone].filter(Boolean).join(" · ") || "—"}</dd></div>
                <div><dt className="inline font-medium">City: </dt><dd className="inline">{a.city || "—"}</dd></div>
                <div><dt className="inline font-medium">Wants: </dt><dd className="inline">{a.collaboration_type?.replace(/_/g, " ") || "—"}</dd></div>
                <div><dt className="inline font-medium">Language: </dt><dd className="inline">{a.language || "—"}</dd></div>
                <div><dt className="inline font-medium">Audience (self-reported): </dt><dd className="inline">{a.audience_size ? a.audience_size.toLocaleString("en-IN") : "not given"}</dd></div>
                <div className="sm:col-span-2"><dt className="inline font-medium">Links: </dt><dd className="inline"><A u={a.blog_url} t="Blog" /><A u={a.instagram_url} t="Instagram" /><A u={a.youtube_url} t="YouTube" /><A u={a.facebook_url} t="Facebook" />{(a.other_links ?? []).map((u) => <A key={u} u={u} t={new URL(u).hostname} />)}</dd></div>
                {a.portfolio_links && <div className="sm:col-span-2"><dt className="font-medium">Sample work</dt><dd className="whitespace-pre-line break-all text-stone-700">{a.portfolio_links}</dd></div>}
                {a.message && <div className="sm:col-span-2"><dt className="font-medium">Why they want to collaborate</dt><dd className="whitespace-pre-line text-stone-700">{a.message}</dd></div>}
                {a.review_note && <div className="sm:col-span-2 text-stone-600"><dt className="inline font-medium">Your note: </dt><dd className="inline">{a.review_note}</dd></div>}
                {a.creator && <div className="sm:col-span-2"><dt className="inline font-medium">In directory as: </dt><dd className="inline">{a.creator.name}</dd></div>}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
