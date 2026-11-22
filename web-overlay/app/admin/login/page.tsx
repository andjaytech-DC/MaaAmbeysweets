"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({}); setMsg("");
    if (!email || !password) { setErrors({ email: email ? [] : ["Enter your email."], password: password ? [] : ["Enter your password."] }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErrors({ email: ["Enter a valid email address."] }); return; }
    setBusy(true);
    try {
      const r = await api<{ token: string; user: { role: string } }>("/login", { method: "POST", body: { email: email.trim(), password } });
      if (r.user.role !== "admin") { setMsg("This account does not have admin access."); return; }
      setToken(r.token);
      router.push("/admin/products");
    } catch (err) {
      if (err instanceof ApiError) { setErrors(err.errors); setMsg(Object.keys(err.errors).length ? "" : err.message); }
      else setMsg("Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">Admin login</h1>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded border border-stone-300 px-3 py-2" />
          {errors.email?.[0] && <p className="mt-1 text-sm text-red-600">{errors.email[0]}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded border border-stone-300 px-3 py-2" />
          {errors.password?.[0] && <p className="mt-1 text-sm text-red-600">{errors.password[0]}</p>}
        </div>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <button disabled={busy} className="w-full rounded bg-amber-600 py-2.5 font-semibold text-white hover:bg-amber-700 disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
