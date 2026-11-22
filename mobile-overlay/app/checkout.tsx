import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { api, ApiError, firstError, Loyalty, Order, rupees, ShopConfig, theme } from "@/lib/api";
import { useStore } from "@/lib/store";

const field = (bad: boolean) => ({ borderWidth: 2, borderColor: bad ? theme.gulab : "#17301F33", borderRadius: 12, padding: 12, backgroundColor: "#fff", fontSize: 16 } as const);

export default function Checkout() {
  const router = useRouter();
  const { lines, subtotal, token, clear } = useStore();
  const [cfg, setCfg] = useState<ShopConfig | null>(null);
  const [delivery, setDelivery] = useState(true);
  const [f, setF] = useState({ customer_name: "", phone: "", address_line: "", city: "", pincode: "", notes: "" });
  const [gift, setGift] = useState({ on: false, recipient_name: "", recipient_phone: "", gift_message: "" });
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; title: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [balance, setBalance] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((c) => ({ ...c, [k]: v }));

  useEffect(() => { api<ShopConfig>("/shop-config").then(setCfg).catch(() => {}); }, []);
  useEffect(() => { if (token) api<Loyalty>("/me/loyalty", { token }).then((r) => setBalance(r.balance)).catch(() => {}); }, [token]);

  async function apply() {
    setCouponMsg("");
    if (!code.trim()) { setCouponMsg("Enter a code."); return; }
    try { setApplied(await api("/coupons/check", { method: "POST", body: { code, subtotal } })); }
    catch (e) { setApplied(null); setCouponMsg(firstError(e)); }
  }
  // cart changed after a code was applied: check again
  useEffect(() => {
    if (!applied) return;
    api<{ code: string; title: string; discount: number }>("/coupons/check", { method: "POST", body: { code: applied.code, subtotal } })
      .then(setApplied).catch((e) => { setApplied(null); setCouponMsg(firstError(e)); });
  }, [subtotal]); // eslint-disable-line react-hooks/exhaustive-deps

  const discount = applied?.discount ?? 0;
  const afterCoupon = subtotal - discount;
  const maxByCap = cfg ? Math.floor((afterCoupon * cfg.max_redeem_percent) / 100 / cfg.point_value) : 0;
  const usable = cfg ? Math.min(balance, maxByCap) : 0;
  const canUsePoints = !!cfg && !!token && usable >= cfg.min_redeem;
  const pointsUsed = usePoints && canUsePoints ? usable : 0;
  const pointsOff = cfg ? Math.round(pointsUsed * cfg.point_value * 100) / 100 : 0;
  const fee = delivery && cfg && subtotal < cfg.free_delivery_above ? cfg.delivery_fee : 0;
  const total = subtotal - discount - pointsOff + fee;

  async function place() {
    const e: Record<string, string> = {};
    if (!f.customer_name.trim()) e.customer_name = "Enter your name.";
    if (!/^(?:\+?91|0)?[6-9]\d{9}$/.test(f.phone.replace(/[\s-]/g, ""))) e.phone = "Enter a valid 10-digit mobile number.";
    if (gift.on) {
      if (!gift.recipient_name.trim()) e.recipient_name = "Enter who the gift is for.";
      if (!/^(?:\+?91|0)?[6-9]\d{9}$/.test(gift.recipient_phone.replace(/[\s-]/g, ""))) e.recipient_phone = "Enter the receiver's 10-digit mobile number.";
    }
    if (delivery) {
      if (!f.address_line.trim()) e.address_line = "Enter the delivery address.";
      if (!f.city.trim()) e.city = "Enter the city.";
      if (!/^\d{6}$/.test(f.pincode)) e.pincode = "Pincode must be 6 digits.";
      else if (cfg?.service_pincodes.length && !cfg.service_pincodes.includes(f.pincode)) e.pincode = "Sorry, we do not deliver to this pincode yet. Choose pickup, or message us on WhatsApp.";
    }
    setErrors(e); setMsg("");
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const order = await api<Order>("/orders", {
        method: "POST", token,
        body: {
          ...f, fulfilment: delivery ? "delivery" : "pickup", coupon: applied?.code ?? null, use_points: pointsUsed,
          is_gift: gift.on, recipient_name: gift.on ? gift.recipient_name : null, recipient_phone: gift.on ? gift.recipient_phone : null, gift_message: gift.on ? gift.gift_message : null,
          items: lines.map((l) => ({ product_id: l.productId, option: l.option, qty: l.qty, choices: l.choices?.map((c) => c.id) })),
        },
      });
      clear();
      router.replace({ pathname: "/track", params: { number: order.number, phone: order.phone, placed: "1" } });
    } catch (ex) {
      if (ex instanceof ApiError && Object.keys(ex.errors).length) {
        const m: Record<string, string> = {};
        for (const [k, v] of Object.entries(ex.errors)) m[k.replace(/^items\.\d+\./, "")] = v[0];
        setErrors(m);
      }
      setMsg(firstError(ex));
    } finally { setBusy(false); }
  }

  if (!lines.length) return <Text style={{ padding: 24, fontSize: 17 }}>Your cart is empty.</Text>;
  const Err = ({ k }: { k: string }) => (errors[k] ? <Text accessibilityRole="alert" style={{ color: theme.gulab, marginTop: 4 }}>{errors[k]}</Text> : null);
  const Row = ({ a, b, bold, color }: { a: string; b: string; bold?: boolean; color?: string }) => (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color, fontWeight: bold ? "700" : "400", fontSize: bold ? 18 : 15 }}>{a}</Text><Text style={{ color, fontWeight: bold ? "700" : "600", fontSize: bold ? 18 : 15 }}>{b}</Text></View>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 17 }}>{delivery ? "Home delivery" : "I will pick up from the shop"}</Text>
        <Switch value={delivery} onValueChange={setDelivery} accessibilityLabel="Home delivery" />
      </View>
      <TextInput placeholder="Your name" value={f.customer_name} onChangeText={set("customer_name")} style={field(!!errors.customer_name)} /><Err k="customer_name" />
      <TextInput placeholder="Mobile number" keyboardType="phone-pad" value={f.phone} onChangeText={set("phone")} style={field(!!errors.phone)} /><Err k="phone" />
      {delivery && (
        <>
          <TextInput placeholder="Address" value={f.address_line} onChangeText={set("address_line")} style={field(!!errors.address_line)} /><Err k="address_line" />
          <TextInput placeholder="City" value={f.city} onChangeText={set("city")} style={field(!!errors.city)} /><Err k="city" />
          <TextInput placeholder="Pincode" keyboardType="number-pad" maxLength={6} value={f.pincode} onChangeText={set("pincode")} style={field(!!errors.pincode)} /><Err k="pincode" />
        </>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 17 }}>This is a gift</Text>
        <Switch value={gift.on} onValueChange={(v) => setGift({ ...gift, on: v })} accessibilityLabel="This is a gift" />
      </View>
      {gift.on && (
        <View style={{ backgroundColor: theme.pista, padding: 12, borderRadius: 12, gap: 8 }}>
          <TextInput placeholder="Receiver's name" value={gift.recipient_name} onChangeText={(v) => setGift({ ...gift, recipient_name: v })} style={field(!!errors.recipient_name)} /><Err k="recipient_name" />
          <TextInput placeholder="Receiver's mobile" keyboardType="phone-pad" value={gift.recipient_phone} onChangeText={(v) => setGift({ ...gift, recipient_phone: v })} style={field(!!errors.recipient_phone)} /><Err k="recipient_phone" />
          <TextInput placeholder="Gift message (optional)" maxLength={300} multiline value={gift.gift_message} onChangeText={(v) => setGift({ ...gift, gift_message: v })} style={field(false)} />
          <Text style={{ fontSize: 13 }}>Prices are not shown on the delivery slip.</Text>
        </View>
      )}

      <TextInput placeholder="Instructions (optional)" value={f.notes} onChangeText={set("notes")} style={field(false)} />

      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput placeholder="Offer code" autoCapitalize="characters" value={code} onChangeText={setCode} style={[field(!!couponMsg), { flex: 1 }]} />
        <Pressable accessibilityRole="button" onPress={apply} style={{ borderWidth: 2, borderColor: theme.ink, borderRadius: 12, paddingHorizontal: 18, justifyContent: "center" }}><Text style={{ fontWeight: "700" }}>Apply</Text></Pressable>
      </View>
      {couponMsg ? <Text accessibilityRole="alert" style={{ color: theme.gulab }}>{couponMsg}</Text> : null}
      {applied ? <Text style={{ color: "#166534" }}>{applied.title} applied: − {rupees(applied.discount)}</Text> : null}

      {token && cfg && (
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: "700" }}>Your points: {balance}</Text>
          {canUsePoints ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ flex: 1 }}>Use {usable} points ({rupees(usable * cfg.point_value)} off)</Text>
              <Switch value={usePoints} onValueChange={setUsePoints} accessibilityLabel="Use points" />
            </View>
          ) : <Text style={{ color: "#555" }}>Use points once you have {cfg.min_redeem} or more. You earn them when an order is delivered.</Text>}
          {errors.use_points ? <Text accessibilityRole="alert" style={{ color: theme.gulab }}>{errors.use_points}</Text> : null}
        </View>
      )}

      <View style={{ backgroundColor: theme.pista, padding: 12, borderRadius: 12, gap: 4 }}>
        <Row a="Items" b={rupees(subtotal)} />
        {discount > 0 && <Row a="Offer" b={`− ${rupees(discount)}`} color={theme.gulab} />}
        {pointsOff > 0 && <Row a={`${pointsUsed} points`} b={`− ${rupees(pointsOff)}`} color={theme.gulab} />}
        <Row a="Delivery" b={delivery ? (fee ? rupees(fee) : "Free") : "Pickup"} />
        <Row a="Total" b={rupees(total)} bold />
        <Text style={{ marginTop: 6 }}>Pay cash on delivery or at the shop. Online payment is coming soon. The shop confirms the final total.</Text>
      </View>
      {msg ? <Text accessibilityRole="alert" style={{ color: theme.gulab }}>{msg}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy} onPress={place} style={{ backgroundColor: theme.kesar, padding: 16, borderRadius: 999, alignItems: "center", opacity: busy ? 0.6 : 1 }}>
        <Text style={{ fontWeight: "700", fontSize: 17, color: theme.ink }}>{busy ? "Placing order…" : "Place order"}</Text>
      </Pressable>
    </ScrollView>
  );
}
