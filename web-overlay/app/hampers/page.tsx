"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Page, Product, rupees } from "@/lib/api";
import { useCart } from "@/lib/cart";

export default function Hampers() {
  const router = useRouter();
  const { add } = useCart();
  const [boxes, setBoxes] = useState<Product[] | null>(null);
  const [sweets, setSweets] = useState<Product[]>([]);
  const [failed, setFailed] = useState(false);
  const [boxId, setBoxId] = useState<number | null>(null);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([api<Page<Product>>("/products?hamper=1&per_page=24"), api<Page<Product>>("/products?eligible=1&per_page=100")])
      .then(([b, s]) => { setBoxes(b.data); setSweets(s.data); if (b.data[0]) setBoxId(b.data[0].id); })
      .catch(() => setFailed(true));
  }, []);

  const box = boxes?.find((b) => b.id === boxId) ?? null;
  const cap = box?.hamper_capacity ?? 0;
  const count = useMemo(() => Object.values(picked).reduce((a, b) => a + b, 0), [picked]);
  const left = cap - count;

  function change(id: number, d: number, stock: number) {
    setMsg("");
    setPicked((cur) => {
      const n = (cur[id] ?? 0) + d;
      if (n < 0 || (d > 0 && (left <= 0 || n * qty > stock))) return cur;
      const next = { ...cur, [id]: n };
      if (n === 0) delete next[id];
      return next;
    });
  }

  function pickBox(id: number) { setBoxId(id); setPicked({}); setMsg(""); }

  function addToCart() {
    if (!box) return;
    if (left !== 0) { setMsg(`Choose ${left} more sweet${left === 1 ? "" : "s"} to fill the box.`); return; }
    const choices = Object.entries(picked).flatMap(([id, n]) => {
      const s = sweets.find((x) => x.id === Number(id))!;
      return Array.from({ length: n }, () => ({ id: s.id, name: s.name }));
    });
    add({ productId: box.id, name: box.name, image: box.images[0]?.url ?? null, option: null, choices, unitPrice: Number(box.price), qty, maxQty: Math.max(1, Math.min(box.stock, 50)) });
    router.push("/cart");
  }

  if (failed) return <main className="mx-auto max-w-3xl px-4 py-16"><p role="alert">We could not load the gift boxes. Please refresh the page.</p></main>;
  if (!boxes) return <main className="mx-auto max-w-3xl px-4 py-16"><p>Loading…</p></main>;
  if (boxes.length === 0) return <main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-4xl">Gift boxes</h1><p className="mt-3">Gift boxes are coming soon. For a special order, use <a className="underline" href="/bulk-orders">bulk orders</a>.</p></main>;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl">Build your gift box</h1>
      <p className="mt-2 max-w-prose text-ink/70">Pick a box, then choose the sweets that go inside. The box price is fixed, whichever sweets you choose.</p>

      <fieldset className="mt-6">
        <legend className="mb-2 font-display text-2xl">1. Choose a box</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {boxes.map((b) => (
            <label key={b.id} className={`cursor-pointer rounded-2xl border-2 p-4 ${b.id === boxId ? "border-gulab bg-pista-soft" : "border-ink/15 bg-white"} ${b.stock <= 0 ? "opacity-50" : ""}`}>
              <input type="radio" name="box" className="sr-only" checked={b.id === boxId} disabled={b.stock <= 0} onChange={() => pickBox(b.id)} />
              <span className="block font-semibold">{b.name}</span>
              <span className="block text-sm text-ink/70">Holds {b.hamper_capacity} sweets{b.stock <= 0 ? " · sold out" : ""}</span>
              <span className="mt-1 block font-display text-xl">{rupees(b.price)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {box && (
        <section className="mt-8" aria-labelledby="pick-h">
          <h2 id="pick-h" className="font-display text-2xl">2. Choose {cap} sweets <span className="text-lg text-ink/60" aria-live="polite">({count} of {cap} chosen)</span></h2>
          {sweets.length === 0 ? <p className="mt-3 text-ink/70">No sweets are available for gift boxes right now.</p> : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {sweets.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-ink/15 bg-white p-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-pista-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {s.images[0] && <img src={s.images[0].url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <span className="min-w-0 flex-1 font-medium">{s.name}</span>
                  <div className="flex items-center rounded-full border-2 border-ink/20" role="group" aria-label={`Quantity of ${s.name}`}>
                    <button type="button" aria-label={`Remove one ${s.name}`} disabled={!picked[s.id]} onClick={() => change(s.id, -1, s.stock)} className="h-10 w-10 disabled:opacity-30">−</button>
                    <span className="w-7 text-center font-semibold">{picked[s.id] ?? 0}</span>
                    <button type="button" aria-label={`Add one ${s.name}`} disabled={left <= 0 || (picked[s.id] ?? 0) * qty >= s.stock} onClick={() => change(s.id, 1, s.stock)} className="h-10 w-10 disabled:opacity-30">+</button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-pista-soft p-4">
            <label className="flex items-center gap-2">Boxes
              <input type="number" min={1} max={Math.max(1, Math.min(box.stock, 10))} value={qty} onChange={(e) => { setQty(Math.max(1, Math.min(Number(e.target.value) || 1, box.stock, 10))); setPicked({}); }} className="w-20 rounded-xl border-2 border-ink/20 px-2 py-1" />
            </label>
            <p className="font-display text-2xl">{rupees(Number(box.price) * qty)}</p>
            <button type="button" onClick={addToCart} className="rounded-full bg-kesar px-8 py-3 text-lg font-semibold text-ink hover:bg-kesar-deep">Add to cart</button>
          </div>
          {msg && <p role="alert" className="mt-2 text-gulab">{msg}</p>}
          <p className="mt-3 text-sm text-ink/60">Each box has the same {cap} sweets. Changing the number of boxes clears your choices. Want a different mix in each box? Add them one at a time.</p>
        </section>
      )}
    </main>
  );
}
