"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setUserToken } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const v: Record<string, string[]> = {};
    if (!f.name.trim()) v.name = ["Enter your name."];
    if (!/^\S+@\S+\.\S+$/.test(f.email)) v.email = ["Enter a valid email."];
    if (!/^(?:\+?91|0)?[6-9]\d{9}$/.test(f.phone.replace(/[\s-]/g, ""))) v.phone = ["Enter a valid 10-digit mobile number."];
    if (f.password.length < 8) v.password = ["Password must be at least 8 characters."];
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const r = await api<{ token: string }>("/register", { method: "POST", body: f });
      setUserToken(r.token);
      router.push("/account");
    } catch (ex) {
      if (ex instanceof ApiError) { setErrors(ex.errors); setMsg(Object.keys(ex.errors).length ? "" : ex.message); }
    } finally { setBusy(false); }
  }

  const fields: [keyof typeof f, string, string, string][] = [
    ["name", "Name", "text", "name"], ["email", "Email", "email", "email"], ["phone", "Mobile number", "tel", "tel"], ["password", "Password (8+ characters)", "password", "new-password"],
  ];
  return (
    <main className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-4xl">Create an account</h1>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        {fields.map(([k, label, type, ac]) => (
          <div key={k}>
            <label htmlFor={k} className="font-medium">{label}</label>
            <input id={k} type={type} autoComplete={ac} value={f[k]} onChange={(e) => set(k, e.target.value)} className={`mt-1 w-full rounded-xl border-2 bg-white px-4 py-3 ${errors[k] ? "border-gulab" : "border-ink/20"}`} />
            {errors[k]?.[0] && <p className="mt-1 text-sm text-gulab">{errors[k][0]}</p>}
          </div>
        ))}
        {msg && <p role="alert" className="text-gulab">{msg}</p>}
        <button disabled={busy} className="w-full rounded-full bg-kesar py-3 text-lg font-semibold text-ink hover:bg-kesar-deep disabled:opacity-60">{busy ? "Creating…" : "Create account"}</button>
      </form>
      <p className="mt-5 text-sm">Already have an account? <Link href="/login" className="font-semibold text-gulab underline">Log in</Link></p>
    </main>
  );
}
