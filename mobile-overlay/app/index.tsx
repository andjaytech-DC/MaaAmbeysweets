import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, Text, TextInput, View } from "react-native";
import { api, Offer, Product, rupees, theme } from "@/lib/api";
import { useStore } from "@/lib/store";

export default function Home() {
  const { count } = useStore();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Product[] | null>(null);
  const [err, setErr] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  useEffect(() => { api<Offer[]>("/offers").then(setOffers).catch(() => {}); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      api<{ data: Product[] }>(`/products?per_page=40&q=${encodeURIComponent(q)}`).then((r) => { setItems(r.data); setErr(""); }).catch((e) => setErr(e.message));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 12, gap: 8 }}>
        <TextInput value={q} onChangeText={setQ} placeholder="Search sweets, namkeen, gift boxes" accessibilityLabel="Search" style={{ borderWidth: 2, borderColor: "#17301F33", borderRadius: 12, padding: 12, backgroundColor: "#fff", fontSize: 16 }} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Link href="/cart" asChild><Pressable accessibilityRole="button" style={{ flex: 1, backgroundColor: theme.kesar, padding: 12, borderRadius: 999, alignItems: "center" }}><Text style={{ fontWeight: "700", color: theme.ink }}>Cart ({count})</Text></Pressable></Link>
          <Link href="/track" asChild><Pressable accessibilityRole="button" style={{ flex: 1, borderWidth: 2, borderColor: theme.ink, padding: 10, borderRadius: 999, alignItems: "center" }}><Text style={{ fontWeight: "700", color: theme.ink }}>Track order</Text></Pressable></Link>
          <Link href="/account" asChild><Pressable accessibilityRole="button" style={{ borderWidth: 2, borderColor: theme.ink, padding: 10, paddingHorizontal: 16, borderRadius: 999 }}><Text style={{ fontWeight: "700", color: theme.ink }}>Account</Text></Pressable></Link>
        </View>
        <Link href="/hampers" asChild><Pressable accessibilityRole="button" style={{ backgroundColor: theme.gulab, padding: 12, borderRadius: 999, alignItems: "center" }}><Text style={{ fontWeight: "700", color: "#fff" }}>Build a gift box</Text></Pressable></Link>
        {offers.length > 0 && (
          <View style={{ backgroundColor: theme.pista, padding: 10, borderRadius: 12 }} accessibilityRole="summary">
            {offers.slice(0, 2).map((o) => <Text key={o.code}>{o.title}: code <Text style={{ fontWeight: "700" }}>{o.code}</Text>{Number(o.min_order) > 0 ? ` (orders above ${rupees(o.min_order)})` : ""}</Text>)}
          </View>
        )}
      </View>
      {err ? <Text accessibilityRole="alert" style={{ color: theme.gulab, padding: 16 }}>{err}</Text> : null}
      {!items && !err ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
        <FlatList
          data={items ?? []} keyExtractor={(p) => String(p.id)} numColumns={2} contentContainerStyle={{ padding: 8 }}
          ListEmptyComponent={!err ? <Text style={{ textAlign: "center", marginTop: 40, color: "#666" }}>No sweets found.</Text> : null}
          renderItem={({ item }) => (
            <Link href={`/product/${item.id}`} asChild>
              <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}, from ${rupees(item.weight_options?.[0]?.price ?? item.price)}`} style={{ flex: 1, margin: 6, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#17301F22" }}>
                {item.images[0] ? <Image source={{ uri: item.images[0].url }} style={{ height: 130, backgroundColor: theme.pista }} /> : <View style={{ height: 130, backgroundColor: theme.pista }} />}
                <View style={{ padding: 10 }}>
                  <Text numberOfLines={2} style={{ fontWeight: "600", color: theme.ink }}>{item.name}</Text>
                  <Text style={{ marginTop: 4, color: theme.gulab, fontWeight: "700" }}>{item.weight_options?.length ? "from " : ""}{rupees(item.weight_options?.[0]?.price ?? item.price)}</Text>
                  {item.stock <= 0 && <Text style={{ color: "#666", fontSize: 12 }}>Sold out</Text>}
                </View>
              </Pressable>
            </Link>
          )}
        />
      )}
    </View>
  );
}
