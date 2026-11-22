import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { api, firstError, Order, rupees, theme } from "@/lib/api";
import { useStore } from "@/lib/store";

const LABEL: Record<string, string> = { received: "Order received", preparing: "Being prepared", ready: "Ready", dispatched: "On its way", delivered: "Delivered", cancelled: "Cancelled" };

export default function Track() {
  const p = useLocalSearchParams<{ number?: string; phone?: string; placed?: string }>();
  const { token } = useStore();
  const [number, setNumber] = useState(p.number ?? "");
  const [phone, setPhone] = useState(p.phone ?? "");
  const [order, setOrder] = useState<Order | null>(null);
  const [mine, setMine] = useState<Order[]>([]);
  const [msg, setMsg] = useState("");

  async function find(n = number, ph = phone) {
    setMsg("");
    try { setOrder(await api<Order>(`/orders/track?number=${encodeURIComponent(n.trim())}&phone=${encodeURIComponent(ph.trim())}`)); }
    catch (e) { setOrder(null); setMsg(firstError(e)); }
  }
  useEffect(() => { if (p.number && p.phone) find(p.number, p.phone); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (token) api<{ data: Order[] }>("/orders", { token }).then((r) => setMine(r.data)).catch(() => {}); }, [token]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      {p.placed ? <Text style={{ backgroundColor: theme.pista, padding: 12, borderRadius: 12, fontWeight: "700" }}>Thank you! Your order is placed. Keep your order number: {p.number}.</Text> : null}
      <TextInput placeholder="Order number" autoCapitalize="characters" value={number} onChangeText={setNumber} style={{ borderWidth: 2, borderColor: "#17301F33", borderRadius: 12, padding: 12, backgroundColor: "#fff", fontSize: 16 }} />
      <TextInput placeholder="Mobile number used on the order" keyboardType="phone-pad" value={phone} onChangeText={setPhone} style={{ borderWidth: 2, borderColor: "#17301F33", borderRadius: 12, padding: 12, backgroundColor: "#fff", fontSize: 16 }} />
      <Pressable accessibilityRole="button" onPress={() => find()} style={{ backgroundColor: theme.kesar, padding: 14, borderRadius: 999, alignItems: "center" }}><Text style={{ fontWeight: "700", color: theme.ink }}>Track</Text></Pressable>
      {msg ? <Text accessibilityRole="alert" style={{ color: theme.gulab }}>{msg}</Text> : null}
      {order && <OrderCard o={order} />}
      {!order && mine.length > 0 && <Text style={{ fontSize: 20, fontWeight: "700", marginTop: 8 }}>Your orders</Text>}
      {!order && mine.map((o) => (
        <Pressable key={o.number} onPress={() => setOrder(o)} accessibilityRole="button" style={{ backgroundColor: "#fff", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#17301F22" }}>
          <Text style={{ fontWeight: "700" }}>{o.number} · {LABEL[o.status] ?? o.status}</Text><Text>{rupees(o.total)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function OrderCard({ o }: { o: Order }) {
  return (
    <View style={{ backgroundColor: "#fff", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#17301F22", gap: 6 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", color: theme.ink }}>{o.number}: {LABEL[o.status] ?? o.status}</Text>
      {o.events.map((e, i) => <Text key={i}>{LABEL[e.status] ?? e.status} · {new Date(e.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</Text>)}
      <View style={{ height: 1, backgroundColor: "#17301F22", marginVertical: 4 }} />
      {o.items.map((i, k) => <Text key={k}>{i.qty} × {i.name}{i.option_label ? ` (${i.option_label})` : ""}{i.hamper_choices?.length ? ` [${i.hamper_choices.map((c) => `${c.count} × ${c.name}`).join(", ")}]` : ""} · {rupees(i.line_total)}</Text>)}
      {Number(o.discount) > 0 && <Text>Offer discount − {rupees(o.discount!)}</Text>}
      {Number(o.points_discount) > 0 && <Text>Points − {rupees(o.points_discount!)}</Text>}
      {o.is_gift && <Text>Gift for {o.recipient_name}</Text>}
      <Text style={{ fontWeight: "700" }}>Total {rupees(o.total)}</Text>
    </View>
  );
}
