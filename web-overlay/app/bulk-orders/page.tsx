"use client";
import { useEffect, useState } from "react";
import { api, ApiError, WHATSAPP } from "@/lib/api";
import { SITE } from "@/lib/site";

type Errors = Record<string, string[]>;
const OCCASIONS = [["wedding", "Wedding"], ["festival", "Festival"], ["corporate", "Corporate or office gift"], ["party", "Party or function"], ["other", "Something else"]];
const VIA: [string, string][] = [["whatsapp", "WhatsApp"], ["call", "Phone call"], ["email", "Email"]];
const VIA_LABEL: Record<string, string> = { whatsapp: "WhatsApp", call: "a phone call", email: "email" };

export default function BulkOrders() {
  const [today, setToday] = useState("");
  useEffect(() => setToday(new Date().toISOString().slice(0, 10)), []);
  const [f, setF] = useState({ name: "", phone: "", email: "", occasion: "", items_text: "", quantity_text: "", needed_by: "", fulfilment: "delivery", city: "", notes: "", contact_via: "whatsapp" });
  const [errors, setErrors] = useState<Errors>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ reference: string; summary: string } | null>(null);

  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const err = (k: string) => errors[k]?.[0];

  function validate(): Errors {
    const e: Errors = {};
    if (!f.name.trim()) e.name = ["Enter your name."];
    if (!/^(?:\+?91|0)?[6-9]\d{9}$/.test(f.phone.replace(/[\s-]/g, ""))) e.phone = ["Enter a valid 10-digit mobile number."];
    if (f.contact_via === "email" && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = ["Enter your email so we can confirm by email."];
    else if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = ["Enter a valid email or leave it empty."];
    if (!f.occasion) e.occasion = ["Choose the occasion."];
    if (!f.items_text.trim()) e.items_text = ["Tell us which sweets you need."];
    if (!f.quantity_text.trim()) e.quantity_text = ["Tell us roughly how much, for example 20 kg laddu or 50 boxes."];
    return e;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) { setMsg("Please fix the highlighted fields."); return; }
    setBusy(true);
    try {
      const r = await api<{ reference: string }>("/enquiries", { method: "POST", body: f });
      const summary = `Hello, I just sent a bulk order request (${r.reference}).\nName: ${f.name}\nWhat: ${f.items_text}\nHow much: ${f.quantity_text}${f.needed_by ? `\nNeeded by: ${f.needed_by}` : ""}`;
      setDone({ reference: r.reference, summary });
    } catch (ex) {
      if (ex instanceof ApiError) { setErrors(ex.errors); setMsg(Object.keys(ex.errors).length ? "Please fix the highlighted fields." : ex.message); }
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <h1 className="text-4xl">We have your request</h1>
        <p className="mt-3">Your reference is <strong>{done.reference}</strong>. We will confirm by <strong>{VIA_LABEL[f.contact_via]}</strong> and tell you the notice we need for your quantity.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(done.summary)}`} className="rounded-full bg-kesar px-7 py-3 font-semibold text-ink hover:bg-kesar-deep">Also send this on WhatsApp</a>
          <a href={`tel:+91${SITE.phone}`} className="rounded-full border-2 border-ink/25 px-7 py-3 font-semibold hover:bg-pista">Call {SITE.phone}</a>
        </div>
      </main>
    );
  }

  const box = (k: string) => `mt-1 w-full rounded-xl border-2 bg-white px-4 py-3 ${err(k) ? "border-gulab" : "border-ink/20"}`;
  const Err = ({ k }: { k: string }) => (err(k) ? <p className="mt-1 text-sm text-gulab">{errors[k].join(" ")}</p> : null);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl">Bulk and gift orders</h1>
      <p className="mt-3 max-w-prose text-ink/80">For weddings, festivals, parties and office gifts. How much notice we need depends on the quantity, so tell us what you need and by when. We will confirm with you before anything is made.</p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="name" className="font-medium">Name</label><input id="name" autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} className={box("name")} /><Err k="name" /></div>
          <div><label htmlFor="phone" className="font-medium">Mobile number</label><input id="phone" type="tel" inputMode="numeric" autoComplete="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} className={box("phone")} /><Err k="phone" /></div>
        </div>
        <div><label htmlFor="email" className="font-medium">Email {f.contact_via === "email" ? "" : "(optional)"}</label><input id="email" type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} className={box("email")} /><Err k="email" /></div>

        <fieldset>
          <legend className="font-medium">How should we confirm with you?</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {VIA.map(([v, t]) => (
              <label key={v} className={`cursor-pointer rounded-full border-2 px-5 py-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-kesar-deep ${f.contact_via === v ? "border-ink bg-ink text-paper" : "border-ink/20 bg-white"}`}>
                <input type="radio" name="via" value={v} checked={f.contact_via === v} onChange={() => set("contact_via", v)} className="sr-only" />{t}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="occ" className="font-medium">Occasion</label>
            <select id="occ" value={f.occasion} onChange={(e) => set("occasion", e.target.value)} className={box("occasion")}><option value="">Choose one</option>{OCCASIONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select><Err k="occasion" /></div>
          <div><label htmlFor="by" className="font-medium">Needed by (optional)</label><input id="by" type="date" min={today} value={f.needed_by} onChange={(e) => set("needed_by", e.target.value)} className={box("needed_by")} /><Err k="needed_by" /></div>
        </div>
        <div><label htmlFor="items" className="font-medium">Which sweets or gift boxes?</label><textarea id="items" rows={3} value={f.items_text} onChange={(e) => set("items_text", e.target.value)} placeholder="Kaju katli, motichoor laddu, assorted gift boxes" className={box("items_text")} /><Err k="items_text" /></div>
        <div><label htmlFor="qty" className="font-medium">How much?</label><input id="qty" value={f.quantity_text} onChange={(e) => set("quantity_text", e.target.value)} placeholder="20 kg laddu and 50 gift boxes" className={box("quantity_text")} /><Err k="quantity_text" /></div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="ful" className="font-medium">Delivery or pickup</label>
            <select id="ful" value={f.fulfilment} onChange={(e) => set("fulfilment", e.target.value)} className={box("fulfilment")}><option value="delivery">Delivery</option><option value="pickup">Pickup from the shop</option></select></div>
          <div><label htmlFor="city" className="font-medium">City (optional)</label><input id="city" value={f.city} onChange={(e) => set("city", e.target.value)} className={box("city")} /></div>
        </div>
        <div><label htmlFor="notes" className="font-medium">Anything else (optional)</label><textarea id="notes" rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Gift message, packaging, delivery to more than one address" className={box("notes")} /></div>

        {msg && <p role="alert" className="font-semibold text-gulab">{msg}</p>}
        <button disabled={busy} className="rounded-full bg-kesar px-10 py-3.5 text-lg font-semibold text-ink hover:bg-kesar-deep disabled:opacity-60">{busy ? "Sending…" : "Send request"}</button>
      </form>
    </main>
  );
}
