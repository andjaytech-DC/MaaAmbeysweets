"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = {
  key: string; // productId|option
  productId: number;
  name: string;
  image: string | null;
  option: string | null;
  choices?: { id: number; name: string }[]; // gift box contents
  unitPrice: number; // display only; the server re-prices every order
  qty: number;
  maxQty: number;
};

type Ctx = {
  lines: CartLine[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (l: Omit<CartLine, "key">) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartCtx = createContext<Ctx | null>(null);
const KEY = "mas_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch {}
  }, [lines, ready]);

  const add = useCallback((l: Omit<CartLine, "key">) => {
    const key = `${l.productId}|${l.option ?? ""}|${(l.choices ?? []).map((c) => c.id).sort((a, b) => a - b).join(",")}`;
    setLines((cur) => {
      const found = cur.find((x) => x.key === key);
      if (found) return cur.map((x) => (x.key === key ? { ...x, unitPrice: l.unitPrice, maxQty: l.maxQty, qty: Math.min(x.qty + l.qty, l.maxQty, 50) } : x));
      return [...cur, { ...l, key, qty: Math.min(l.qty, l.maxQty, 50) }];
    });
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((cur) => cur.map((x) => (x.key === key ? { ...x, qty: Math.max(1, Math.min(qty, x.maxQty, 50)) } : x)));
  }, []);
  const remove = useCallback((key: string) => setLines((cur) => cur.filter((x) => x.key !== key)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Ctx>(() => ({
    lines, ready, add, setQty, remove, clear,
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotal: lines.reduce((n, l) => n + l.qty * l.unitPrice, 0),
  }), [lines, ready, add, setQty, remove, clear]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
