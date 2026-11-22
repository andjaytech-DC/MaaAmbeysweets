import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { api, Product, priceFor, rupees, theme } from "@/lib/api";
import { useStore } from "@/lib/store";
import { Reviews } from "@/components/Reviews";

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { add } = useStore();
  const [p, setP] = useState<Product | null>(null);
  const [err, setErr] = useState("");
  const [option, setOption] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    api<Product>(`/products/${id}`).then((r) => { setP(r); setOption(r.weight_options?.[0]?.label ?? null); }).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <Text accessibilityRole="alert" style={{ padding: 16, color: theme.gulab }}>{err}</Text>;
  if (!p) return <ActivityIndicator style={{ marginTop: 40 }} />;
  const unit = priceFor(p, option);
  const out = p.stock <= 0;
  const max = Math.max(1, Math.min(p.stock, 50));

  return (
    <ScrollView>
      {p.images[0] && <Image source={{ uri: p.images[0].url }} style={{ height: 260, backgroundColor: theme.pista }} />}
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 26, fontWeight: "700", color: theme.ink }}>{p.name}</Text>
        <Text style={{ fontSize: 22, color: theme.gulab, fontWeight: "700" }}>{rupees(unit)}</Text>
        {p.description ? <Text style={{ fontSize: 16 }}>{p.description}</Text> : null}
        {p.shelf_life ? <Text><Text style={{ fontWeight: "700" }}>Shelf life: </Text>{p.shelf_life}</Text> : null}
        {p.batch ? <Text>Made on {p.batch.made_on} · Best before {p.batch.expires_on}</Text> : null}
        {p.ingredients ? <Text><Text style={{ fontWeight: "700" }}>Ingredients: </Text>{p.ingredients}</Text> : null}

        {p.hamper_capacity ? (
          <Text style={{ color: theme.ink }}>This is a gift box. Build it from the Gift boxes button on the home screen.</Text>
        ) : (
          <>
            {p.weight_options?.length ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityRole="radiogroup">
                {p.weight_options.map((o) => (
                  <Pressable key={o.label} accessibilityRole="radio" accessibilityState={{ selected: o.label === option }} onPress={() => setOption(o.label)}
                    style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, borderWidth: 2, borderColor: o.label === option ? theme.gulab : "#17301F33", backgroundColor: o.label === option ? theme.pista : "#fff" }}>
                    <Text style={{ fontWeight: "600" }}>{o.label} · {rupees(o.price)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Pressable accessibilityLabel="Decrease quantity" disabled={qty <= 1} onPress={() => setQty(qty - 1)} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: "center", justifyContent: "center", opacity: qty <= 1 ? 0.3 : 1 }}><Text style={{ fontSize: 22 }}>−</Text></Pressable>
              <Text style={{ fontSize: 20, fontWeight: "700" }}>{qty}</Text>
              <Pressable accessibilityLabel="Increase quantity" disabled={qty >= max} onPress={() => setQty(qty + 1)} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: "center", justifyContent: "center", opacity: qty >= max ? 0.3 : 1 }}><Text style={{ fontSize: 22 }}>+</Text></Pressable>
            </View>
            <Pressable accessibilityRole="button" disabled={out}
              onPress={() => { add({ productId: p.id, name: p.name, option, unitPrice: unit, qty, maxQty: max }); router.push("/cart"); }}
              style={{ backgroundColor: out ? "#ccc" : theme.kesar, padding: 16, borderRadius: 999, alignItems: "center" }}>
              <Text style={{ fontWeight: "700", fontSize: 17, color: theme.ink }}>{out ? "Sold out" : "Add to cart"}</Text>
            </Pressable>
          </>
        )}
        <Reviews productId={p.id} />
      </View>
    </ScrollView>
  );
}
