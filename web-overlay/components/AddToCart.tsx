"use client";
import { useState } from "react";
import Link from "next/link";
import { priceFor, Product, rupees } from "@/lib/api";
import { useCart } from "@/lib/cart";

export default function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  const options = product.weight_options ?? [];
  const [option, setOption] = useState<string | null>(options[0]?.label ?? null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const unit = priceFor(product, option);
  const max = Math.max(1, Math.min(product.stock, 50));
  const out = product.stock <= 0;

  if (product.hamper_capacity) {
    return <Link href="/hampers" className="inline-block rounded-full bg-kesar px-8 py-3 text-lg font-semibold text-ink hover:bg-kesar-deep">Choose your {product.hamper_capacity} sweets</Link>;
  }

  function submit() {
    add({
      productId: product.id,
      name: product.name,
      image: product.images[0]?.url ?? null,
      option,
      unitPrice: unit,
      qty,
      maxQty: max,
    });
    setAdded(true);
  }

  return (
    <div className="mt-6">
      {options.length > 0 && (
        <fieldset>
          <legend className="mb-2 font-semibold">Choose weight</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {options.map((o) => {
              const on = o.label === option;
              return (
                <label key={o.label} className={`cursor-pointer rounded-xl border-2 px-4 py-3 text-center transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-kesar-deep ${on ? "border-ink bg-ink text-paper" : "border-ink/20 bg-white hover:border-ink"}`}>
                  <input type="radio" name="weight" className="sr-only" checked={on} onChange={() => { setOption(o.label); setAdded(false); }} />
                  <span className="block text-lg font-semibold">{o.label}</span>
                  <span className={`block text-sm ${on ? "text-pista" : "text-ink/60"}`}>{rupees(o.price)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <div className="flex items-center rounded-full border-2 border-ink/20 bg-white" role="group" aria-label="Quantity">
          <button type="button" aria-label="Decrease quantity" disabled={qty <= 1 || out} onClick={() => { setQty(qty - 1); setAdded(false); }} className="h-12 w-12 text-xl disabled:opacity-30">−</button>
          <span className="w-10 text-center text-lg font-semibold" aria-live="polite">{out ? 0 : qty}</span>
          <button type="button" aria-label="Increase quantity" disabled={qty >= max || out} onClick={() => { setQty(qty + 1); setAdded(false); }} className="h-12 w-12 text-xl disabled:opacity-30">+</button>
        </div>
        <button type="button" onClick={submit} disabled={out} className="h-12 flex-1 rounded-full bg-kesar px-6 text-lg font-semibold text-ink hover:bg-kesar-deep disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-ink/40 sm:flex-none sm:px-10">
          {out ? "Sold out" : `Add to cart · ${rupees(unit * qty)}`}
        </button>
      </div>

      <p role="status" className="mt-3 min-h-6 text-sm">
        {added && <>Added to your cart. <Link href="/cart" className="font-semibold text-gulab underline">View cart</Link></>}
        {!out && product.stock <= 5 && !added && <span className="text-gulab">Only {product.stock} left.</span>}
      </p>
    </div>
  );
}
