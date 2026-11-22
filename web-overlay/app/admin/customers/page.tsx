"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, Customer, Page, rupees } from "@/lib/api";
import { clearToken, useAdminToken } from "@/lib/auth";

export default function AdminCustomers() {
  const token = useAdminToken();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<Customer> | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try { setData(await api<Page<Customer>>(`/admin/customers?q=${encodeURIComponent(q)}&page=${page}`, { token })); setMsg(""); }
    catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { clearToken(); router.replace("/admin/login"); }
      else setMsg(e instanceof Error ? e.message : "Failed to load");
    }
  }, [token, q, page, router]);
  useEffect(() => { load(); }, [load]);

  if (!token) return null;
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl">Customers {data && <span className="text-base text-ink/60">({data.total})</span>}</h1>
      <p className="mt-1 text-ink/70">Everyone who has placed an order, grouped by mobile number.</p>
      <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name or mobile number" className="mt-4 w-full rounded-xl border-2 border-ink/20 bg-white px-4 py-2" />
      {msg && <p role="alert" className="mt-3 text-gulab">{msg}</p>}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-ink/15 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-pista-soft"><tr><th className="p-3">Name</th><th className="p-3">Mobile</th><th className="p-3">Email</th><th className="p-3">Orders</th><th className="p-3">Total spent</th><th className="p-3">Last order</th><th className="p-3" /></tr></thead>
          <tbody>
            {data?.data.map((c) => (
              <tr key={c.phone} className="border-t border-ink/10">
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3">{c.phone}</td>
                <td className="p-3">{c.email ?? "—"}</td>
                <td className="p-3">{c.orders_count}</td>
                <td className="p-3">{rupees(c.total_spent)}</td>
                <td className="p-3">{new Date(c.last_order_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                <td className="whitespace-nowrap p-3 text-right"><a className="mr-3 underline" href={`https://wa.me/91${c.phone}`}>WhatsApp</a><a className="underline" href={`tel:+91${c.phone}`}>Call</a></td>
              </tr>
            ))}
            {data && data.data.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-ink/60">No customers yet. They appear after the first order.</td></tr>}
          </tbody>
        </table>
      </div>
      {data && data.last_page > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-4 py-2 disabled:opacity-40">Previous</button>
          <span>Page {data.current_page} of {data.last_page}</span>
          <button disabled={page >= data.last_page} onClick={() => setPage(page + 1)} className="rounded border px-4 py-2 disabled:opacity-40">Next</button>
        </div>
      )}
    </main>
  );
}
