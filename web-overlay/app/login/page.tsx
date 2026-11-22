"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setUserToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const v: Record<string, string[]> = {};
    if (!email.trim()) v.email = ["Enter your email."];
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) v.email = ["Enter a valid email address, like name@example.com."];
    if (!password) v.password = ["Enter your password."];
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const r = await api<{ token: string }>("/login", { method: "POST", body: { email: email.trim(), password } });
      setUserToken(r.token);
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/account");
    } catch (ex) {
      if (ex instanceof ApiError) { setErrors(ex.errors); setMsg(Object.keys(ex.errors).length ? "" : ex.message); }
      else setMsg("Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-4xl">Log in</h1>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <div><label htmlFor="em" className="font-medium">Email</label><input id="em" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border-2 border-ink/20 bg-white px-4 py-3" />{errors.email?.[0] && <p className="mt-1 text-sm text-gulab">{errors.email[0]}</p>}</div>
        <div><label htmlFor="pw" className="font-medium">Password</label>
          <div className="relative"><input id="pw" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border-2 border-ink/20 bg-white py-3 pl-4 pr-20" />
            <button type="button" onClick={() => setShow(!show)} aria-pressed={show} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-sm font-semibold text-gulab">{show ? "Hide" : "Show"}</button></div>
          {errors.password?.[0] && <p className="mt-1 text-sm text-gulab">{errors.password[0]}</p>}</div>
        {msg && <p role="alert" className="text-gulab">{msg}</p>}
        <button disabled={busy} className="w-full rounded-full bg-kesar py-3 text-lg font-semibold text-ink hover:bg-kesar-deep disabled:opacity-60">{busy ? "Logging in…" : "Log in"}</button>
      </form>
      <p className="mt-5 text-sm">New here? <Link href="/register" className="font-semibold text-gulab underline">Create an account</Link></p>
    </main>
  );
}
