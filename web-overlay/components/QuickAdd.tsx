"use client";
import { useState } from "react";
import Link from "next/link";
import { Product } from "@/lib/api";
import { useCart } from "@/lib/cart";

/** Add to cart straight from a product card. Sweets with several weights need a choice, so they open the product page. */
export default function QuickAdd({ p }: { p: Product }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  const base = "mt-3 block w-full rounded-xl px-4 py-2.5 text-center font-display text-lg font-bold";

  if (p.stock <= 0) return <button disabled className={`${base} cursor-not-allowed bg-line text-muted`}>Sold out</button>;
  if (p.weight_options?.length) return <Link href={`/products/${p.id}`} className={`${base} border-2 border-ink text-ink hover:bg-ink hover:text-white`}>Choose weight</Link>;
  return (
    <>
      <button
        onClick={() => {
          add({ productId: p.id, name: p.name, image: p.images[0]?.url ?? null, option: null, unitPrice: Number(p.price), qty: 1, maxQty: Math.max(1, Math.min(p.stock, 50)) });
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        }}
        className={`${base} bg-ink text-white hover:bg-jamun`}
      >
        {done ? "Added ✓" : "Add to cart"}
      </button>
      <span role="status" className="sr-only">{done ? `${p.name} added to cart` : ""}</span>
    </>
  );
}
