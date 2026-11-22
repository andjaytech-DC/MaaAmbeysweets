import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { api, Product, rupees, theme } from "@/lib/api";
import { useStore } from "@/lib/store";

export default function Hampers() {
  const router = useRouter();
  const { add } = useStore();
  const [boxes, setBoxes] = useState<Product[] | null>(null);
  const [sweets, setSweets] = useState<Product[]>([]);
  const [err, setErr] = useState("");
  const [boxId, setBoxId] = useState<number | null>(null);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([api<{ data: Product[] }>("/products?hamper=1&per_page=24"), api<{ data: Product[] }>("/products?eligible=1&per_page=100")])
      .then(([b, s]) => { setBoxes(b.data); setSweets(s.data); if (b.data[0]) setBoxId(b.data[0].id); })
      .catch((e) => setErr(e.message));
  }, []);

  const box = boxes?.find((b) => b.id === boxId) ?? null;
  const cap = box?.hamper_capacity ?? 0;
  const count = useMemo(() => Object.values(picked).reduce((a, b) => a + b, 0), [picked]);
  const left = cap - count;

  function change(id: number, d: number, stock: number) {
    setMsg("");
    setPicked((cur) => {
      const n = (cur[id] ?? 0) + d;
      if (n < 0 || (d > 0 && (left <= 0 || n > stock))) return cur;
      const next = { ...cur, [id]: n };
      if (n === 0) delete next[id];
      return next;
    });
  }
  function addToCart() {
    if (!box) return;
    if (left !== 0) { setMsg(`Choose ${left} more sweet${left === 1 ? "" : "s"} to fill the box.`); return; }
    const choices = Object.entries(picked).flatMap(([id, n]) => { const s = sweets.find((x) => x.id === Number(id))!; return Array.from({ length: n }, () => ({ id: s.id, name: s.name })); });
    add({ productId: box.id, name: box.name, option: null, choices, unitPrice: Number(box.price), qty: 1, maxQty: Math.max(1, Math.min(box.stock, 50)) });
    router.push("/cart");
  }

  if (err) return <Text accessibilityRole="alert" style={{ padding: 16, color: theme.gulab }}>{err}</Text>;
  if (!boxes) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (!boxes.length) return <Text style={{ padding: 24, fontSize: 17 }}>Gift boxes are coming soon.</Text>;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: theme.ink }}>1. Choose a box</Text>
      {boxes.map((b) => (
        <Pressable key={b.id} accessibilityRole="radio" accessibilityState={{ selected: b.id === boxId, disabled: b.stock <= 0 }} disabled={b.stock <= 0} onPress={() => { setBoxId(b.id); setPicked({}); setMsg(""); }}
          style={{ padding: 14, borderRadius: 14, borderWidth: 2, borderColor: b.id === boxId ? theme.gulab : "#17301F33", backgroundColor: b.id === boxId ? theme.pista : "#fff", opacity: b.stock <= 0 ? 0.5 : 1 }}>
          <Text style={{ fontWeight: "700", fontSize: 16 }}>{b.name}</Text>
          <Text>Holds {b.hamper_capacity} sweets{b.stock <= 0 ? " · sold out" : ""} · {rupees(b.price)}</Text>
        </Pressable>
      ))}
      {box && (
        <>
          <Text style={{ fontSize: 22, fontWeight: "700", color: theme.ink, marginTop: 8 }}>2. Choose {cap} sweets ({count} of {cap})</Text>
          {sweets.length === 0 ? <Text>No sweets are available for gift boxes right now.</Text> : sweets.map((s) => (
            <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff", borderRadius: 14, padding: 10, borderWidth: 1, borderColor: "#17301F22" }}>
              {s.images[0] ? <Image source={{ uri: s.images[0].url }} style={{ width: 52, height: 52, borderRadius: 10 }} /> : <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: theme.pista }} />}
              <Text style={{ flex: 1, fontWeight: "600" }}>{s.name}</Text>
              <Pressable accessibilityLabel={`Remove one ${s.name}`} disabled={!picked[s.id]} onPress={() => change(s.id, -1, s.stock)}><Text style={{ fontSize: 28, opacity: picked[s.id] ? 1 : 0.3 }}>−</Text></Pressable>
              <Text style={{ width: 22, textAlign: "center", fontWeight: "700" }}>{picked[s.id] ?? 0}</Text>
              <Pressable accessibilityLabel={`Add one ${s.name}`} disabled={left <= 0 || (picked[s.id] ?? 0) >= s.stock} onPress={() => change(s.id, 1, s.stock)}><Text style={{ fontSize: 28, opacity: left <= 0 || (picked[s.id] ?? 0) >= s.stock ? 0.3 : 1 }}>+</Text></Pressable>
            </View>
          ))}
          {msg ? <Text accessibilityRole="alert" style={{ color: theme.gulab }}>{msg}</Text> : null}
          <Pressable accessibilityRole="button" onPress={addToCart} style={{ backgroundColor: theme.kesar, padding: 16, borderRadius: 999, alignItems: "center", marginTop: 4 }}>
            <Text style={{ fontWeight: "700", fontSize: 17, color: theme.ink }}>Add to cart · {rupees(box.price)}</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
