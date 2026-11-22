"use client";
import { useEffect, useState } from "react";
import { api, ShopConfig } from "@/lib/api";

export default function PincodeCheck() {
  const [cfg, setCfg] = useState<ShopConfig | null>(null);
  const [pin, setPin] = useState("");
  const [result, setResult] = useState<"ok" | "no" | "bad" | null>(null);
  useEffect(() => { api<ShopConfig>("/shop-config").then(setCfg).catch(() => {}); }, []);

  function check(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) { setResult("bad"); return; }
    const area = cfg?.service_pincodes ?? [];
    setResult(area.length === 0 || area.includes(pin) ? "ok" : "no");
  }

  return (
    <form onSubmit={check} className="mt-6 rounded-2xl border border-ink/15 bg-white p-4" aria-label="Check delivery">
      <label htmlFor="pin" className="text-sm font-semibold">Can we deliver to you?</label>
      <div className="mt-2 flex gap-2">
        <input id="pin" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setResult(null); }} placeholder="6-digit pincode" className="min-w-0 flex-1 rounded-xl border-2 border-ink/20 px-3 py-2" />
        <button className="rounded-xl bg-ink px-4 font-semibold text-paper">Check</button>
      </div>
      <p role="status" className="mt-2 min-h-5 text-sm">
        {result === "bad" && <span className="text-gulab">Enter a 6-digit pincode.</span>}
        {result === "ok" && <span className="text-green-800">Yes, we deliver to {pin}. Delivery charge is shown at checkout.</span>}
        {result === "no" && <span className="text-gulab">Sorry, we do not deliver to {pin} yet. You can still pick up from the shop or message us on WhatsApp.</span>}
      </p>
    </form>
  );
}
