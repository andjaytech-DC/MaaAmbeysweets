import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput } from "react-native";
import { api, firstError, theme } from "@/lib/api";
import { useStore } from "@/lib/store";

const box = { borderWidth: 2, borderColor: "#17301F33", borderRadius: 12, padding: 12, backgroundColor: "#fff", fontSize: 16 } as const;

export default function Login() {
  const router = useRouter();
  const { token, setToken } = useStore();
  const [register, setRegister] = useState(false);
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setMsg("");
    try {
      const r = await api<{ token: string }>(register ? "/register" : "/login", { method: "POST", body: register ? { ...f, password_confirmation: f.password } : { email: f.email, password: f.password } });
      setToken(r.token); router.back();
    } catch (e) { setMsg(firstError(e)); } finally { setBusy(false); }
  }

  if (token) return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18 }}>You are logged in.</Text>
      <Pressable accessibilityRole="button" onPress={() => setToken(null)} style={{ borderWidth: 2, borderColor: theme.ink, padding: 14, borderRadius: 999, alignItems: "center" }}><Text style={{ fontWeight: "700" }}>Log out</Text></Pressable>
    </ScrollView>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
      {register && <TextInput placeholder="Your name" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} style={box} />}
      <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} style={box} />
      {register && <TextInput placeholder="Mobile number" keyboardType="phone-pad" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} style={box} />}
      <TextInput placeholder="Password" secureTextEntry value={f.password} onChangeText={(v) => setF({ ...f, password: v })} style={box} />
      {msg ? <Text accessibilityRole="alert" style={{ color: theme.gulab }}>{msg}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy} onPress={submit} style={{ backgroundColor: theme.kesar, padding: 16, borderRadius: 999, alignItems: "center", opacity: busy ? 0.6 : 1 }}><Text style={{ fontWeight: "700", fontSize: 17, color: theme.ink }}>{register ? "Create account" : "Log in"}</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setRegister(!register)}><Text style={{ color: theme.gulab, textDecorationLine: "underline", textAlign: "center" }}>{register ? "I already have an account" : "Create an account"}</Text></Pressable>
    </ScrollView>
  );
}
