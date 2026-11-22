import { useEffect, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api, ApiError, firstError, ReviewList, theme } from "@/lib/api";
import { useStore } from "@/lib/store";

// Used inside the product screen: shows approved reviews and lets a logged-in customer add one with up to 3 photos.
export function Reviews({ productId }: { productId: number }) {
  const { token } = useStore();
  const [data, setData] = useState<ReviewList | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<ReviewList>(`/products/${productId}/reviews`).then(setData).catch(() => {}); }, [productId]);

  async function pick() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 3, quality: 0.7 });
    if (r.canceled) return;
    if (r.assets.length > 3) { setMsg({ ok: false, text: "You can add up to 3 photos." }); return; }
    setPhotos(r.assets.slice(0, 3));
  }

  async function send() {
    if (!rating) { setMsg({ ok: false, text: "Choose a star rating." }); return; }
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append("rating", String(rating));
      if (comment) fd.append("comment", comment);
      photos.forEach((p, i) => fd.append("photos[]", { uri: p.uri, name: p.fileName ?? `photo${i}.jpg`, type: p.mimeType ?? "image/jpeg" } as unknown as Blob));
      const r = await api<{ message: string }>(`/products/${productId}/reviews`, { method: "POST", token, body: fd });
      setMsg({ ok: true, text: r.message }); setRating(0); setComment(""); setPhotos([]);
    } catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? firstError(e) : "Could not send. Try again." }); } finally { setBusy(false); }
  }

  return (
    <View style={{ gap: 10, marginTop: 8 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: theme.ink }}>Reviews</Text>
      {data && data.count > 0 ? <Text>{"★".repeat(Math.round(data.average))} {data.average} from {data.count} review{data.count === 1 ? "" : "s"}</Text> : <Text style={{ color: "#555" }}>No reviews yet.</Text>}
      {data?.reviews.map((r, i) => (
        <View key={i} style={{ backgroundColor: theme.pista, padding: 12, borderRadius: 12, gap: 4 }}>
          <Text style={{ fontWeight: "700" }}><Text style={{ color: theme.kesar }}>{"★".repeat(r.rating)}</Text> {r.name}</Text>
          {r.comment ? <Text>{r.comment}</Text> : null}
          {r.photos?.length ? <View style={{ flexDirection: "row", gap: 6 }}>{r.photos.map((u) => <Image key={u} source={{ uri: u }} style={{ width: 70, height: 70, borderRadius: 10 }} accessibilityLabel={`Photo from ${r.name}`} />)}</View> : null}
        </View>
      ))}
      {token ? (
        <View style={{ gap: 8, borderWidth: 1, borderColor: "#17301F22", borderRadius: 14, padding: 12, backgroundColor: "#fff" }}>
          <Text style={{ fontWeight: "700" }}>Tried this sweet? Tell others.</Text>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => <Pressable key={n} accessibilityRole="radio" accessibilityLabel={`${n} star${n === 1 ? "" : "s"}`} accessibilityState={{ selected: rating === n }} onPress={() => setRating(n)}><Text style={{ fontSize: 34, color: n <= rating ? theme.kesar : "#17301F33" }}>★</Text></Pressable>)}
          </View>
          <TextInput multiline placeholder="What did you like? (optional)" value={comment} onChangeText={setComment} style={{ borderWidth: 2, borderColor: "#17301F33", borderRadius: 12, padding: 10, minHeight: 70 }} />
          <Pressable accessibilityRole="button" onPress={pick}><Text style={{ color: theme.gulab, textDecorationLine: "underline" }}>{photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"} chosen (tap to change)` : "Add photos (up to 3)"}</Text></Pressable>
          {msg ? <Text accessibilityRole="alert" style={{ color: msg.ok ? "#166534" : theme.gulab }}>{msg.text}</Text> : null}
          <Pressable accessibilityRole="button" disabled={busy} onPress={send} style={{ backgroundColor: theme.kesar, padding: 12, borderRadius: 999, alignItems: "center", opacity: busy ? 0.6 : 1 }}><Text style={{ fontWeight: "700", color: theme.ink }}>{busy ? "Sending…" : "Send review"}</Text></Pressable>
          <Text style={{ fontSize: 12, color: "#555" }}>Only customers who have received this sweet can review it. We check reviews before they appear.</Text>
        </View>
      ) : <Text style={{ color: "#555" }}>Log in from the Account button to review a sweet you have bought.</Text>}
    </View>
  );
}
