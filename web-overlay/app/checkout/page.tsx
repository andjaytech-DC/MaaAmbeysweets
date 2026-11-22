"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, rupees, ShopConfig } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useOptionalUserToken } from "@/lib/auth";
import { SITE } from "@/lib/site";

type Errors = Record<string, string[]>;

export default function Checkout() {
  const router = useRouter();
  const { lines, ready, subtotal, clear } = useCart();
  const { token } = useOptionalUserToken();
  const [cfg, setCfg] = useState<ShopConfig | null>(null);
  const [f, setF] = useState({ customer_name: "", phone: "", email: "", fulfilment: "delivery", address_line: "", city: "", pincode: "", notes: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<ShopConfig>("/shop-config").then(setCfg).catch(() => {}); }, []);
  useEffect(() => {
    if (!token) return;
    api<{ name: string; email: string; phone: string | null }>("/me", { token })
      .then((u) => setF((s) => ({ ...s, customer_name: s.customer_name || u.name, email: s.email || u.email, phone: s.phone || (u.phone ?? "") })))
      .catch(() => {});
  }, [token]);

  const [gift, setGift] = useState({ on: false, recipient_name: "", recipient_phone: "", gift_message: "" });
  const [balance, setBalance] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; title: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");

  async function applyCoupon() {
    setCouponMsg("");
    if (!code.trim()) { setCouponMsg("Enter a code."); return; }
    try {
      setApplied(await api<{ code: string; title: string; discount: number }>("/coupons/check", { method: "POST", body: { code, subtotal } }));
    } catch (ex) {
      setApplied(null);
      if (ex instanceof ApiError) setCouponMsg(Object.values(ex.errors).flat()[0] ?? ex.message);
    }
  }
  // the cart changed after the code was applied: check it again
  useEffect(() => {
    if (!applied) return;
    api<{ code: string; title: string; discount: number }>("/coupons/check", { method: "POST", body: { code: applied.code, subtotal } })
      .then(setApplied)
      .catch((ex) => { setApplied(null); if (ex instanceof ApiError) setCouponMsg(Object.values(ex.errors).flat()[0] ?? ex.message); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  useEffect(() => {
    if (!token) return;
    api<{ balance: number }>("/me/loyalty", { token }).then((r) => setBalance(r.balance)).catch(() => {});
  }, [token]);

  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const err = (k: string) => errors[k]?.[0];
  const delivery = f.fulfilment === "delivery";
  const area = cfg?.service_pincodes ?? [];
  const servesPincode = area.length === 0 || area.includes(f.pincode);
  const fee = delivery && cfg && subtotal < cfg.free_delivery_above ? cfg.delivery_fee : 0;
  const discount = applied?.discount ?? 0;
  // points: whole points worth at most max_redeem_percent of the order, and never more than the balance
  const afterCoupon = subtotal - discount;
  const maxByCap = cfg ? Math.floor((afterCoupon * cfg.max_redeem_percent) / 100 / cfg.point_value) : 0;
  const usable = cfg ? Math.min(balance, maxByCap) : 0;
  const canUsePoints = !!cfg && !!token && usable >= cfg.min_redeem;
  const pointsUsed = usePoints && canUsePoints ? usable : 0;
  const pointsOff = cfg ? Math.round(pointsUsed * cfg.point_value * 100) / 100 : 0;
  const total = subtotal - discount - pointsOff + fee;

  function validate(): Errors {
    const e: Errors = {};
    if (!f.customer_name.trim()) e.customer_name = ["Enter your name."];
    if (!/^(?:\+?91|0)?[6-9]\d{9}$/.test(f.phone.replace(/[\s-]/g, ""))) e.phone = ["Enter a valid 10-digit mobile number."];
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = ["Enter a valid email or leave it empty."];
    if (gift.on) {
      if (!gift.recipient_name.trim()) e.recipient_name = ["Enter who the gift is for."];
      if (!/^(?:\+?91|0)?[6-9]\d{9}$/.test(gift.recipient_phone.replace(/[\s-]/g, ""))) e.recipient_phone = ["Enter the receiver's 10-digit mobile number."];
    }
    if (delivery) {
      if (!f.address_line.trim()) e.address_line = ["Enter the delivery address."];
      if (!f.city.trim()) e.city = ["Enter the city."];
      if (!/^\d{6}$/.test(f.pincode)) e.pincode = ["Pincode must be 6 digits."];
      else if (!servesPincode) e.pincode = ["Sorry, we do not deliver to this pincode yet. Choose pickup, or message us on WhatsApp."];
    }
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
      const order = await api<{ number: string; phone: string }>("/orders", {
        method: "POST",
        token,
        body: { ...f, coupon: applied?.code ?? null, use_points: pointsUsed, is_gift: gift.on, recipient_name: gift.on ? gift.recipient_name : null, recipient_phone: gift.on ? gift.recipient_phone : null, gift_message: gift.on ? gift.gift_message : null, items: lines.map((l) => ({ product_id: l.productId, option: l.option, qty: l.qty, choices: l.choices?.map((c) => c.id) })) },
      });
      clear();
      router.push(`/track?number=${order.number}&phone=${order.phone}&placed=1`);
    } catch (ex) {
      if (ex instanceof ApiError) {
        const folded: Errors = {};
        Object.entries(ex.errors).forEach(([k, m]) => { const key = k.startsWith("items") ? "items" : k; folded[key] = [...(folded[key] ?? []), ...m]; });
        setErrors(folded);
        setMsg(Object.keys(folded).length ? "Please fix the problems below." : ex.message);
      }
    } finally { setBusy(false); }
  }

  if (!ready) return <main className="mx-auto max-w-4xl px-4 py-10 text-ink/60 sm:px-6">Loading…</main>;
  if (lines.length === 0) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-4xl">Nothing to check out yet</h1>
        <Link href="/products" className="mt-6 inline-block rounded-full bg-kesar px-8 py-3 font-semibold text-ink hover:bg-kesar-deep">Browse sweets</Link>
      </main>
    );
  }

  const box = (k: string) => `mt-1 w-full rounded-xl border-2 bg-white px-4 py-3 ${err(k) ? "border-gulab" : "border-ink/20"}`;
  const Err = ({ k }: { k: string }) => (err(k) ? <p className="mt-1 text-sm text-gulab">{errors[k].join(" ")}</p> : null);

  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_340px]">
      <form onSubmit={submit} noValidate className="space-y-8">
        <h1 className="text-4xl">Checkout</h1>
        {!token && <p className="text-sm text-ink/70">Ordering as a guest. <Link href="/login" className="font-semibold text-gulab underline">Log in</Link> to keep your order history.</p>}

        <fieldset className="space-y-4">
          <legend className="mb-1 text-2xl font-display">Your details</legend>
          <div><label htmlFor="n" className="font-medium">Name</label><input id="n" autoComplete="name" value={f.customer_name} onChange={(e) => set("customer_name", e.target.value)} className={box("customer_name")} /><Err k="customer_name" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="p" className="font-medium">Mobile number</label><input id="p" type="tel" inputMode="numeric" autoComplete="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} className={box("phone")} /><Err k="phone" /></div>
            <div><label htmlFor="e" className="font-medium">Email (optional)</label><input id="e" type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} className={box("email")} /><Err k="email" /></div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-2xl font-display">How do you want it?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {[["delivery", "Home delivery", "We bring it to your address."], ["pickup", "Pick up in store", "Collect it when it is ready. No delivery charge."]].map(([v, t, d]) => (
              <label key={v} className={`cursor-pointer rounded-xl border-2 p-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-kesar-deep ${f.fulfilment === v ? "border-ink bg-pista-soft" : "border-ink/20 bg-white"}`}>
                <input type="radio" name="fulfilment" value={v} checked={f.fulfilment === v} onChange={() => set("fulfilment", v)} className="sr-only" />
                <span className="block text-lg font-semibold">{t}</span>
                <span className="block text-sm text-ink/70">{d}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {delivery && (
          <fieldset className="space-y-4">
            <legend className="mb-1 text-2xl font-display">Delivery address</legend>
            <div><label htmlFor="a" className="font-medium">Address</label><input id="a" autoComplete="street-address" value={f.address_line} onChange={(e) => set("address_line", e.target.value)} className={box("address_line")} /><Err k="address_line" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="c" className="font-medium">City</label><input id="c" autoComplete="address-level2" value={f.city} onChange={(e) => set("city", e.target.value)} className={box("city")} /><Err k="city" /></div>
              <div><label htmlFor="z" className="font-medium">Pincode</label><input id="z" inputMode="numeric" maxLength={6} autoComplete="postal-code" value={f.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))} className={box("pincode")} /><Err k="pincode" />{area.length > 0 && !err("pincode") && <p className="mt-1 text-xs text-ink/60">{cfg?.service_area_label ? `We deliver in ${cfg.service_area_label}.` : "We deliver to selected pincodes only."}</p>}</div>
            </div>
          </fieldset>
        )}

        <fieldset className="space-y-4">
          <legend className="sr-only">Gift</legend>
          <label className="flex items-center gap-3 text-lg font-display"><input type="checkbox" className="h-6 w-6" checked={gift.on} onChange={(e) => setGift({ ...gift, on: e.target.checked })} />This is a gift</label>
          {gift.on && (
            <div className="space-y-4 rounded-2xl bg-pista-soft p-4">
              <p className="text-sm text-ink/70">{delivery ? "Use the receiver's address above. We will call the receiver, not you." : "Pickup orders are collected from the shop."}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label htmlFor="rn" className="font-medium">Receiver&apos;s name</label><input id="rn" value={gift.recipient_name} onChange={(e) => setGift({ ...gift, recipient_name: e.target.value })} className={box("recipient_name")} /><Err k="recipient_name" /></div>
                <div><label htmlFor="rp" className="font-medium">Receiver&apos;s mobile</label><input id="rp" type="tel" inputMode="numeric" value={gift.recipient_phone} onChange={(e) => setGift({ ...gift, recipient_phone: e.target.value })} className={box("recipient_phone")} /><Err k="recipient_phone" /></div>
              </div>
              <div><label htmlFor="gm" className="font-medium">Gift message (optional)</label><textarea id="gm" rows={2} maxLength={300} value={gift.gift_message} onChange={(e) => setGift({ ...gift, gift_message: e.target.value })} className={box("gift_message")} /></div>
              <p className="text-sm text-ink/70">Prices are not shown to the receiver on the delivery slip.</p>
            </div>
          )}
        </fieldset>

        <div><label htmlFor="notes" className="font-medium">Instructions (optional)</label><textarea id="notes" rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Gift message, preferred time, landmark" className={box("notes")} /><Err k="notes" /></div>

        <fieldset>
          <legend className="mb-2 text-2xl font-display">Payment</legend>
          <p className="rounded-xl border-2 border-ink/20 bg-white p-4"><span className="font-semibold">{delivery ? "Cash on delivery" : "Pay at the shop"}</span><span className="block text-sm text-ink/70">Online payment (UPI and cards) is coming soon.</span></p>
          <p className="mt-3 text-sm text-ink/70">{SITE.changePolicy}</p>
        </fieldset>

        {errors.items && <ul className="rounded-xl bg-gulab/10 p-4 text-gulab">{errors.items.map((m, i) => <li key={i}>{m}</li>)}</ul>}
        {msg && <p role="alert" className="font-semibold text-gulab">{msg}</p>}
        <button disabled={busy} className="w-full rounded-full bg-kesar py-4 text-lg font-semibold text-ink hover:bg-kesar-deep disabled:opacity-60 sm:w-auto sm:px-12">
          {busy ? "Placing order…" : `Place order · ${rupees(total)}`}
        </button>
      </form>

      <aside className="h-fit rounded-2xl bg-pista-soft p-6" aria-label="Order summary">
        <h2 className="text-2xl">Order summary</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {lines.map((l) => (
            <li key={l.key} className="flex justify-between gap-3"><span>{l.qty} × {l.name}{l.option ? ` (${l.option})` : ""}</span><span className="font-semibold">{rupees(l.unitPrice * l.qty)}</span></li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-ink/15 pt-4">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{rupees(subtotal)}</dd></div>
          {pointsOff > 0 && <div className="flex justify-between text-gulab"><dt>{pointsUsed} points</dt><dd>− {rupees(pointsOff)}</dd></div>}
          {discount > 0 && <div className="flex justify-between text-gulab"><dt>Offer {applied?.code}</dt><dd>− {rupees(discount)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{delivery ? (fee ? rupees(fee) : "Free") : "Not needed"}</dd></div>
          <div className="flex justify-between text-lg font-semibold"><dt>Total</dt><dd>{rupees(total)}</dd></div>
        </dl>
        <div className="mt-4 border-t border-ink/15 pt-4">
          <label htmlFor="coupon" className="text-sm font-medium">Offer code</label>
          <div className="mt-1 flex gap-2">
            <input id="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="min-w-0 flex-1 rounded-xl border-2 border-ink/20 bg-white px-3 py-2" />
            <button type="button" onClick={applyCoupon} className="rounded-xl bg-ink px-4 font-semibold text-paper hover:bg-ink/90">Apply</button>
          </div>
          {applied && <p role="status" className="mt-2 text-sm text-green-800">{applied.title} applied.</p>}
          {(couponMsg || err("coupon")) && <p role="alert" className="mt-2 text-sm text-gulab">{couponMsg || err("coupon")}</p>}
        </div>
        {token && cfg && (
          <div className="mt-4 border-t border-ink/15 pt-4 text-sm">
            <p className="font-medium">Your points: {balance}</p>
            {canUsePoints ? (
              <label className="mt-1 flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} />Use {usable} points ({rupees(usable * cfg.point_value)} off)</label>
            ) : <p className="mt-1 text-ink/70">Use points once you have {cfg.min_redeem} or more. You earn them when an order is delivered.</p>}
            {err("use_points") && <p role="alert" className="mt-1 text-gulab">{err("use_points")}</p>}
          </div>
        )}
        <p className="mt-3 text-xs text-ink/60">The final total is confirmed by the shop when your order is placed.</p>
      </aside>
    </main>
  );
}
