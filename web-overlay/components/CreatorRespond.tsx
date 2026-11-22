"use client";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { CONTENT_TYPES, COLLAB_STATUS_LABEL, COMPENSATION, label } from "@/lib/marketing";

type Info = {
  creator_name: string; status: string; compensation_type: string | null; agreed_fee: string | null;
  campaign: { name: string; description: string | null; objective: string | null; starts_at: string | null; ends_at: string | null; image_url: string | null; products: string[] };
  sample_sent: boolean; receipt_confirmed: boolean; submitted: { content_type: string; url: string; title: string | null; approval_status: string }[]; disclosure_text: string;
};
const box = "mt-1 h-12 w-full rounded-xl border-2 border-ink/20 bg-white px-4 text-ink focus:border-gulab focus:outline-none";
const btn = "inline-flex h-12 items-center rounded-2xl px-6 font-display text-lg font-bold disabled:opacity-60";

export default function CreatorRespond({ token }: { token: string }) {
  const base = `/creator/collaborations/${encodeURIComponent(token)}`;
  const [d, setD] = useState<Info | null>(null);
  const [missing, setMissing] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ content_type: "instagram_reel", url: "", title: "", summary: "", published_on: "", usage_permission: false });
  const [errs, setErrs] = useState<Record<string, string[]>>({});

  const load = useCallback(() => api<Info>(base).then(setD).catch((e) => { if (e instanceof ApiError && e.status === 404) setMissing(true); else setMsg({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." }); }), [base]);
  useEffect(() => { load(); }, [load]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true); setMsg(null); setErrs({});
    try { await fn(); setMsg({ ok: true, text: ok }); await load(); }
    catch (e) { if (e instanceof ApiError) { setErrs(e.errors); setMsg({ ok: false, text: Object.values(e.errors)[0]?.[0] ?? e.message }); } else setMsg({ ok: false, text: "Something went wrong. Please try again." }); }
    finally { setBusy(false); }
  }

  if (missing) return <main className="mx-auto max-w-2xl px-4 py-16"><h1 className="text-4xl">This link is not valid</h1><p className="mt-3">It may have been mistyped or is no longer in use. Please contact Maa Ambey Sweets and we will help.</p></main>;
  if (!d) return <main className="mx-auto max-w-2xl px-4 py-16"><p role="status">{msg?.text ?? "Loading…"}</p></main>;

  const c = d.campaign;
  const canSubmit = d.status === "approved" || d.status === "content_submitted";
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-gulab">Creator collaboration</p>
      <h1 className="mt-2 text-4xl sm:text-5xl">{c.name}</h1>
      <p className="mt-2 text-lg">Hello {d.creator_name}. Status: <strong>{COLLAB_STATUS_LABEL[d.status] ?? d.status}</strong></p>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-4 rounded-xl p-3 font-semibold ${msg.ok ? "bg-green-50 text-green-900" : "bg-red-50 text-red-800"}`}>{msg.text}</p>}

      <section className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-sm" aria-label="About this campaign">
        {c.description && <p className="whitespace-pre-line">{c.description}</p>}
        {c.objective && <p className="mt-3"><strong>What we hope for:</strong> {c.objective}</p>}
        {c.products.length > 0 && <p className="mt-3"><strong>Sweets included:</strong> {c.products.join(", ")}</p>}
        {(c.starts_at || c.ends_at) && <p className="mt-3"><strong>When:</strong> {c.starts_at ?? "…"} to {c.ends_at ?? "…"}</p>}
        {d.compensation_type && <p className="mt-3"><strong>Arrangement:</strong> {label(COMPENSATION, d.compensation_type)}{d.agreed_fee ? `, fee ₹${Number(d.agreed_fee).toLocaleString("en-IN")}` : ""}</p>}
        <p className="mt-3 text-sm text-muted">{d.disclosure_text}</p>
      </section>

      {d.status === "invited" && (
        <section className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-sm" aria-label="Reply to the invitation">
          <h2 className="text-2xl">Would you like to take part?</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button disabled={busy} className={`${btn} bg-kesar text-ink hover:bg-kesar-deep`} onClick={() => run(() => api(`${base}/respond`, { method: "POST", body: { action: "accept" } }), "Thank you! We will confirm shortly.")}>Yes, I would love to</button>
            <button disabled={busy} className={`${btn} border-2 border-ink/25 hover:bg-pista`} onClick={() => run(() => api(`${base}/respond`, { method: "POST", body: { action: "decline" } }), "Thank you for letting us know.")}>No, thank you</button>
          </div>
        </section>
      )}
      {d.status === "accepted" && <p className="mt-6 rounded-2xl bg-pista p-4">Thank you for accepting. We will confirm the collaboration and arrange your sweets.</p>}
      {d.status === "declined" && <p className="mt-6 rounded-2xl bg-pista p-4">You declined this invitation. Thank you for letting us know.</p>}

      {d.sample_sent && !d.receipt_confirmed && (
        <section className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-sm" aria-label="Confirm delivery">
          <h2 className="text-2xl">Did your sweets arrive?</h2>
          <button disabled={busy} className={`mt-4 ${btn} bg-kesar text-ink hover:bg-kesar-deep`} onClick={() => run(() => api(`${base}/confirm-receipt`, { method: "POST" }), "Thank you for confirming.")}>Yes, I received them</button>
        </section>
      )}
      {d.receipt_confirmed && <p className="mt-6 rounded-2xl bg-pista p-4">You confirmed that your sweets arrived.</p>}

      {canSubmit && (
        <section className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-sm" aria-label="Share your published link">
          <h2 className="text-2xl">Share your published link</h2>
          <form noValidate className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); run(() => api(`${base}/content`, { method: "POST", body: { ...f, published_on: f.published_on || null, title: f.title || null, summary: f.summary || null } }).then(() => setF({ ...f, url: "", title: "", summary: "", published_on: "", usage_permission: false })), "Thank you! We have your link and will review it."); }}>
            <div><label htmlFor="r-type" className="font-semibold">Type of content</label><select id="r-type" value={f.content_type} onChange={(e) => setF({ ...f, content_type: e.target.value })} className={box}>{CONTENT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div><label htmlFor="r-url" className="font-semibold">Link to your post *</label><input id="r-url" required value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://" className={box} aria-invalid={!!errs.url} />{errs.url && <p className="mt-1 text-sm font-semibold text-red-700">{errs.url[0]}</p>}</div>
            <div><label htmlFor="r-title" className="font-semibold">Title</label><input id="r-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={box} /></div>
            <div><label htmlFor="r-sum" className="font-semibold">A line or two about it</label><textarea id="r-sum" rows={3} maxLength={1000} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} className={`${box} h-auto py-3`} /></div>
            <div><label htmlFor="r-date" className="font-semibold">Date published</label><input id="r-date" type="date" value={f.published_on} onChange={(e) => setF({ ...f, published_on: e.target.value })} className={`${box} w-56`} />{errs.published_on && <p className="mt-1 text-sm font-semibold text-red-700">{errs.published_on[0]}</p>}</div>
            <label className="flex items-start gap-3"><input type="checkbox" className="mt-1.5 h-5 w-5" checked={f.usage_permission} onChange={(e) => setF({ ...f, usage_permission: e.target.checked })} /><span>You may show this link, with my name and picture, on the Maa Ambey Sweets website. I understand that it will be labelled with how we worked together. <span className="text-muted">(Optional. Leave unticked if you do not agree; we will not show it.)</span></span></label>
            <button disabled={busy} className={`${btn} bg-kesar text-ink hover:bg-kesar-deep`}>{busy ? "Sending…" : "Send link"}</button>
          </form>
        </section>
      )}

      {d.submitted.length > 0 && (
        <section className="mt-6" aria-label="Links you sent">
          <h2 className="text-2xl">Links you sent</h2>
          <ul className="mt-3 divide-y rounded-2xl border border-line bg-white">{d.submitted.map((s) => <li key={s.url} className="flex flex-wrap items-center justify-between gap-2 p-3"><a className="font-semibold underline" href={s.url} target="_blank" rel="noopener noreferrer">{s.title || label(CONTENT_TYPES, s.content_type)}</a><span className="text-sm capitalize text-muted">{s.approval_status}</span></li>)}</ul>
        </section>
      )}
    </main>
  );
}
