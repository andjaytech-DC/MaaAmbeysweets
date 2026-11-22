"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, AdminReview, Page } from "@/lib/api";
import { clearToken, useAdminToken } from "@/lib/auth";

export default function AdminReviews() {
  const token = useAdminToken();
  const router = useRouter();
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<AdminReview> | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try { setData(await api<Page<AdminReview>>(`/admin/reviews?status=${status}&page=${page}`, { token })); setMsg(""); }
    catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { clearToken(); router.replace("/admin/login"); }
      else setMsg(e instanceof Error ? e.message : "Failed to load");
    }
  }, [token, status, page, router]);
  useEffect(() => { load(); }, [load]);

  async function set(r: AdminReview, next: string) {
    if (!token) return;
    try { await api(`/admin/reviews/${r.id}/status`, { method: "PATCH", token, body: { status: next } }); load(); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Could not update"); }
  }

  if (!token) return null;
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl">Reviews</h1>
      <p className="mt-1 text-ink/70">New reviews wait here until you approve them. Only customers who received the sweet can write one.</p>
      <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="mt-4 rounded-xl border-2 border-ink/20 bg-white px-3 py-2">
        <option value="pending">Waiting for approval</option><option value="approved">Approved</option><option value="hidden">Hidden</option>
      </select>
      {msg && <p role="alert" className="mt-3 text-gulab">{msg}</p>}
      <ul className="mt-4 space-y-3">
        {data?.data.map((r) => (
          <li key={r.id} className="rounded-2xl border border-ink/15 bg-white p-4">
            <p className="font-semibold">{r.product.name} <span className="ml-2 text-kesar-deep" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}</span></p>
            <p className="text-sm text-ink/60">{r.user.name} · {r.user.email}</p>
            {r.comment && <p className="mt-1">{r.comment}</p>}
            {r.photos.length > 0 && <div className="mt-2 flex gap-2">{r.photos.map((ph) => <a key={ph.id} href={ph.url} target="_blank" rel="noopener noreferrer"><img src={ph.url} alt="Review photo" className="h-20 w-20 rounded-lg object-cover" /></a>)}</div>}
            <div className="mt-3 flex gap-2">
              {r.status !== "approved" && <button onClick={() => set(r, "approved")} className="rounded-full bg-kesar px-4 py-1.5 text-sm font-semibold text-ink hover:bg-kesar-deep">Approve</button>}
              {r.status !== "hidden" && <button onClick={() => set(r, "hidden")} className="rounded-full border-2 border-ink/25 px-4 py-1.5 text-sm font-medium hover:bg-pista-soft">Hide</button>}
            </div>
          </li>
        ))}
        {data && data.data.length === 0 && <li className="p-6 text-center text-ink/60">Nothing here.</li>}
      </ul>
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
