"use client";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";

type Errors = Record<string, string[]>;
const TYPES: [string, string][] = [["", "No preference"], ["product_tasting", "Product tasting and review"], ["festival_campaign", "Festival campaign"], ["gift_box", "Gift box collaboration"], ["paid_collaboration", "Paid collaboration"], ["affiliate", "Affiliate (discount code)"]];
const blank = { full_name: "", email: "", phone: "", city: "", blog_url: "", instagram_url: "", youtube_url: "", facebook_url: "", other_links: "", collaboration_type: "", audience_size: "", language: "", message: "", portfolio_links: "", company_site: "" };
const input = "mt-1 h-12 w-full rounded-xl border-2 border-ink/20 bg-white px-4 text-ink focus:border-gulab focus:outline-none";

export default function CreatorApplyForm({ open, disclosure }: { open: boolean; disclosure?: string }) {
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState<Errors>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ reference?: string; message: string } | null>(null);
  const set = (k: keyof typeof blank, v: string) => setF((s) => ({ ...s, [k]: v }));
  const err = (k: string) => errors[k]?.[0];

  function validate(): Errors {
    const e: Errors = {};
    if (f.full_name.trim().length < 2) e.full_name = ["Please tell us your name."];
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = ["Enter a valid email address."];
    if (!f.email && !f.phone.trim()) e.email = ["Give us an email or a phone number so we can reach you."];
    if (f.phone && !/^(?:\+?91|0)?[6-9]\d{9}$/.test(f.phone.replace(/[\s-]/g, ""))) e.phone = ["Enter a valid 10-digit mobile number."];
    if (f.audience_size && !/^\d{1,10}$/.test(f.audience_size)) e.audience_size = ["Use digits only, or leave it empty."];
    if (![f.blog_url, f.instagram_url, f.youtube_url, f.facebook_url, f.other_links, f.portfolio_links].some((x) => x.trim())) e.blog_url = ["Add at least one link to your blog, a social profile or sample work."];
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault(); setMsg("");
    const v = validate(); setErrors(v);
    if (Object.keys(v).length) { setMsg("Please fix the highlighted fields."); return; }
    setBusy(true);
    try {
      const body: Record<string, unknown> = { ...f, audience_size: f.audience_size ? Number(f.audience_size) : null };
      for (const k of Object.keys(body)) if (body[k] === "") body[k] = null;
      body.company_site = f.company_site; // honeypot: left empty by real people
      const r = await api<{ message: string; reference?: string }>("/creator-applications", { method: "POST", body });
      setDone(r); setF(blank);
    } catch (ex) {
      if (ex instanceof ApiError) { setErrors(ex.errors); setMsg(Object.keys(ex.errors).length ? "Please fix the highlighted fields." : ex.message); }
      else setMsg("Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div role="status" className="rounded-3xl border border-line bg-white p-8 shadow-sm">
        <h3 className="text-3xl">Thank you</h3>
        <p className="mt-3 text-lg">{done.message}</p>
        {done.reference && <p className="mt-2">Your reference is <strong>{done.reference}</strong>.</p>}
        <p className="mt-2 text-muted">We read every application. If we would like to go ahead we will contact you using the details you gave.</p>
      </div>
    );
  }
  if (!open) {
    return <div role="status" className="rounded-3xl border border-line bg-white p-8 shadow-sm"><h3 className="text-2xl">Applications are closed for now</h3><p className="mt-2">We are not taking new creator applications at the moment. Please check back soon.</p></div>;
  }

  const field = (k: keyof typeof blank, lab: string, opts: { type?: string; ph?: string; hint?: string; auto?: string } = {}) => (
    <div>
      <label htmlFor={`c-${k}`} className="font-semibold">{lab}</label>
      <input id={`c-${k}`} name={k} type={opts.type ?? "text"} value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder={opts.ph} autoComplete={opts.auto}
        aria-invalid={!!err(k)} aria-describedby={err(k) ? `c-${k}-e` : undefined} className={input} />
      {opts.hint && !err(k) && <p className="mt-1 text-sm text-muted">{opts.hint}</p>}
      {err(k) && <p id={`c-${k}-e`} className="mt-1 text-sm font-semibold text-red-700">{err(k)}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8" aria-label="Creator application">
      {msg && <p role="alert" className="rounded-xl bg-red-50 p-3 font-semibold text-red-800">{msg}</p>}
      <div className="grid gap-5 sm:grid-cols-2">
        {field("full_name", "Full name *", { auto: "name" })}
        {field("city", "City", { auto: "address-level2" })}
        {field("email", "Email", { type: "email", auto: "email" })}
        {field("phone", "Phone", { type: "tel", auto: "tel", hint: "Email or phone, at least one." })}
      </div>
      <fieldset className="space-y-5">
        <legend className="font-display text-xl font-bold">Where we can see your work</legend>
        <p className="-mt-3 text-sm text-muted">Add at least one. Paste the address of your page or profile.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          {field("blog_url", "Blog or website", { ph: "https://" })}
          {field("instagram_url", "Instagram profile", { ph: "https://instagram.com/yourname" })}
          {field("youtube_url", "YouTube channel", { ph: "https://youtube.com/@yourname" })}
          {field("facebook_url", "Facebook profile or page", { ph: "https://facebook.com/yourpage" })}
        </div>
        <div>
          <label htmlFor="c-other_links" className="font-semibold">Other social media links</label>
          <textarea id="c-other_links" rows={2} value={f.other_links} onChange={(e) => set("other_links", e.target.value)} placeholder="One link per line" className={`${input} h-auto py-3`} />
          {err("other_links") && <p className="mt-1 text-sm font-semibold text-red-700">{err("other_links")}</p>}
        </div>
        <div>
          <label htmlFor="c-portfolio_links" className="font-semibold">Portfolio or sample content links</label>
          <textarea id="c-portfolio_links" rows={2} value={f.portfolio_links} onChange={(e) => set("portfolio_links", e.target.value)} placeholder="One link per line" className={`${input} h-auto py-3`} />
          {err("portfolio_links") && <p className="mt-1 text-sm font-semibold text-red-700">{err("portfolio_links")}</p>}
        </div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="c-collaboration_type" className="font-semibold">What interests you</label>
          <select id="c-collaboration_type" value={f.collaboration_type} onChange={(e) => set("collaboration_type", e.target.value)} className={input}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </div>
        {field("audience_size", "Audience size", { ph: "optional", hint: "Your own estimate. We may ask to see it." })}
        {field("language", "Content language", { ph: "Hindi, English…" })}
      </div>
      <div>
        <label htmlFor="c-message" className="font-semibold">Why would you like to collaborate?</label>
        <textarea id="c-message" rows={4} maxLength={2000} value={f.message} onChange={(e) => set("message", e.target.value)} className={`${input} h-auto py-3`} />
        {err("message") && <p className="mt-1 text-sm font-semibold text-red-700">{err("message")}</p>}
      </div>
      {/* Spam trap: hidden from people and screen readers, bots tend to fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="c-company_site">Leave this empty</label>
        <input id="c-company_site" name="company_site" tabIndex={-1} autoComplete="off" value={f.company_site} onChange={(e) => set("company_site", e.target.value)} />
      </div>
      <p className="text-sm text-muted">We use your details only to reply to your application. We never show your contact details on the website. {disclosure ? `Collaborations are always disclosed: ${disclosure}` : ""}</p>
      <button type="submit" disabled={busy} className="inline-flex h-14 items-center rounded-2xl bg-kesar px-8 font-display text-lg font-bold text-ink hover:bg-kesar-deep disabled:opacity-60">{busy ? "Sending…" : "Send my application"}</button>
    </form>
  );
}
