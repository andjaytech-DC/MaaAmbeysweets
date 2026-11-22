import { Link } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { rupees, theme } from "@/lib/api";
import { useStore } from "@/lib/store";

export default function Cart() {
  const { lines, subtotal, setQty, remove } = useStore();
  if (!lines.length) return <View style={{ padding: 24 }}><Text style={{ fontSize: 18 }}>Your cart is empty.</Text><Link href="/" style={{ marginTop: 12, color: theme.gulab, fontWeight: "700" }}>Browse sweets</Link></View>;
  return (
    <View style={{ flex: 1 }}>
      <FlatList data={lines} keyExtractor={(l) => l.key} contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item: l }) => (
          <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#17301F22" }}>
            <Text style={{ fontWeight: "700", fontSize: 16 }}>{l.name}</Text>
            {l.option ? <Text style={{ color: "#555" }}>{l.option}</Text> : null}
            {l.choices?.length ? <Text style={{ color: "#555" }}>Inside: {Object.entries(l.choices.reduce<Record<string, number>>((m, c) => ({ ...m, [c.name]: (m[c.name] ?? 0) + 1 }), {})).map(([n, c]) => `${c} × ${n}`).join(", ")}</Text> : null}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <Pressable accessibilityLabel="Decrease quantity" disabled={l.qty <= 1} onPress={() => setQty(l.key, l.qty - 1)}><Text style={{ fontSize: 26, opacity: l.qty <= 1 ? 0.3 : 1 }}>−</Text></Pressable>
                <Text style={{ fontWeight: "700", fontSize: 18 }}>{l.qty}</Text>
                <Pressable accessibilityLabel="Increase quantity" disabled={l.qty >= l.maxQty} onPress={() => setQty(l.key, l.qty + 1)}><Text style={{ fontSize: 26, opacity: l.qty >= l.maxQty ? 0.3 : 1 }}>+</Text></Pressable>
              </View>
              <Text style={{ fontWeight: "700" }}>{rupees(l.unitPrice * l.qty)}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => remove(l.key)}><Text style={{ color: theme.gulab, marginTop: 8, textDecorationLine: "underline" }}>Remove</Text></Pressable>
          </View>
        )} />
      <View style={{ padding: 16, borderTopWidth: 1, borderColor: "#17301F22", backgroundColor: "#fff", gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ fontSize: 17 }}>Subtotal</Text><Text style={{ fontSize: 17, fontWeight: "700" }}>{rupees(subtotal)}</Text></View>
        <Text style={{ color: "#555", fontSize: 13 }}>Delivery charge and final total are shown at checkout.</Text>
        <Link href="/checkout" asChild><Pressable accessibilityRole="button" style={{ backgroundColor: theme.kesar, padding: 16, borderRadius: 999, alignItems: "center" }}><Text style={{ fontWeight: "700", fontSize: 17, color: theme.ink }}>Checkout</Text></Pressable></Link>
      </View>
    </View>
  );
}
