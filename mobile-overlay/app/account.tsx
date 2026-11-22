import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { api, Loyalty, Order, rupees, theme } from "@/lib/api";
import { useStore } from "@/lib/store";

const LABEL: Record<string, string> = { received: "Received", preparing: "Being prepared", ready: "Ready", dispatched: "On its way", delivered: "Delivered", cancelled: "Cancelled" };
const HIST: Record<string, string> = { earn: "Earned", redeem: "Used", reverse_earn: "Earned points removed (order cancelled)", reverse_redeem: "Points returned (order cancelled)" };

export default function Account() {
  const router = useRouter();
  const { token, setToken } = useStore();
  const [pts, setPts] = useState<Loyalty | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) return;
    const expired = (e: { status?: number }) => { if (e.status === 401) setToken(null); else setMsg("Could not load your account."); };
    api<Loyalty>("/me/loyalty", { token }).then(setPts).catch(expired);
    api<{ data: Order[] }>("/orders", { token }).then((r) => setOrders(r.data)).catch(expired);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 18 }}>Log in to see your orders and points.</Text>
      <Link href="/login" asChild><Pressable accessibilityRole="button" style={{ backgroundColor: theme.kesar, padding: 14, borderRadius: 999, alignItems: "center" }}><Text style={{ fontWeight: "700", color: theme.ink }}>Log in or sign up</Text></Pressable></Link>
    </View>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {msg ? <Text accessibilityRole="alert" style={{ color: theme.gulab }}>{msg}</Text> : null}
      {pts && (
        <View style={{ backgroundColor: theme.pista, padding: 16, borderRadius: 14, gap: 4 }}>
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Your points</Text>
          <Text style={{ fontSize: 34, fontWeight: "700", color: theme.ink }}>{pts.balance}</Text>
          <Text>Use them at checkout. You earn points when an order is delivered.</Text>
          {pts.history.slice(0, 6).map((h, i) => <Text key={i}>{HIST[h.type] ?? h.type} · {new Date(h.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}: {h.points > 0 ? "+" : ""}{h.points}</Text>)}
        </View>
      )}
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Your orders</Text>
      {orders.length === 0 ? <Text>No orders yet.</Text> : orders.map((o) => (
        <Pressable key={o.number} accessibilityRole="button" onPress={() => router.push({ pathname: "/track", params: { number: o.number, phone: o.phone } })} style={{ backgroundColor: "#fff", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#17301F22" }}>
          <Text style={{ fontWeight: "700" }}>{o.number} · {LABEL[o.status] ?? o.status}</Text>
          <Text>{o.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}</Text>
          <Text style={{ fontWeight: "600" }}>{rupees(o.total)}</Text>
        </Pressable>
      ))}
      <Pressable accessibilityRole="button" onPress={() => setToken(null)} style={{ borderWidth: 2, borderColor: theme.ink, padding: 14, borderRadius: 999, alignItems: "center", marginTop: 8 }}><Text style={{ fontWeight: "700" }}>Log out</Text></Pressable>
    </ScrollView>
  );
}
