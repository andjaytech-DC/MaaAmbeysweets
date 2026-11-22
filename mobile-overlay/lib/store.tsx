import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Line = { key: string; productId: number; name: string; option: string | null; choices?: { id: number; name: string }[]; unitPrice: number; qty: number; maxQty: number };
type Ctx = {
  lines: Line[]; subtotal: number; count: number; token: string | null; ready: boolean;
  add: (l: Omit<Line, "key">) => void; setQty: (k: string, q: number) => void; remove: (k: string) => void; clear: () => void;
  setToken: (t: string | null) => void;
};
const C = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [token, setTok] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [c, t] = await Promise.all([AsyncStorage.getItem("cart"), AsyncStorage.getItem("token")]);
        if (c) setLines(JSON.parse(c));
        if (t) setTok(t);
      } catch {}
      setReady(true);
    })();
  }, []);
  useEffect(() => { if (ready) AsyncStorage.setItem("cart", JSON.stringify(lines)).catch(() => {}); }, [lines, ready]);

  const add = useCallback((l: Omit<Line, "key">) => {
    const key = `${l.productId}|${l.option ?? ""}|${(l.choices ?? []).map((c) => c.id).sort((a, b) => a - b).join(",")}`;
    setLines((cur) => cur.some((x) => x.key === key)
      ? cur.map((x) => (x.key === key ? { ...x, unitPrice: l.unitPrice, maxQty: l.maxQty, qty: Math.min(x.qty + l.qty, l.maxQty, 50) } : x))
      : [...cur, { ...l, key, qty: Math.min(l.qty, l.maxQty, 50) }]);
  }, []);
  const setQty = useCallback((k: string, q: number) => setLines((cur) => cur.map((x) => (x.key === k ? { ...x, qty: Math.max(1, Math.min(q, x.maxQty, 50)) } : x))), []);
  const remove = useCallback((k: string) => setLines((cur) => cur.filter((x) => x.key !== k)), []);
  const clear = useCallback(() => setLines([]), []);
  const setToken = useCallback((t: string | null) => { setTok(t); (t ? AsyncStorage.setItem("token", t) : AsyncStorage.removeItem("token")).catch(() => {}); }, []);

  const value = useMemo<Ctx>(() => ({
    lines, ready, token, add, setQty, remove, clear, setToken,
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotal: lines.reduce((n, l) => n + l.qty * l.unitPrice, 0),
  }), [lines, ready, token, add, setQty, remove, clear, setToken]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
export const useStore = () => { const c = useContext(C); if (!c) throw new Error("StoreProvider missing"); return c; };
