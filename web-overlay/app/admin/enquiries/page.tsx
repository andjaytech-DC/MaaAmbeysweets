"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, Enquiry, Page } from "@/lib/api";
import { clearToken, useAdminToken } from "@/lib/auth";

const STATUSES = ["new", "contacted", "quoted", "confirmed", "cancelled"];

export default function AdminEnquiries() {
  const token = useAdminToken();
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<Enquiry> | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try { setData(await api<Page<Enquiry>>(`/admin/enquiries?status=${status}&page=${page}`, { token })); setMsg(""); }
    catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { clearToken(); router.replace("/admin/login"); }
      else setMsg(e instanceof Error ? e.message : "Failed to load");
    }
  }, [token, status, page, router]);
  useEffect(() => { load(); }, [load]);

  async function change(e: Enquiry, next: string) {
    if (!token) return;
    try { await api(`/admin/enquiries/${e.id}/status`, { method: "PATCH", token, body: { status: next } }); load(); }
    catch (ex) { setMsg(ex instanceof Error ? ex.message : "Could not update"); }
  }

  if (!token) return null;
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Bulk enquiries {data && <span className="text-base text-ink/60">({data.total})</span>}</h1>
        <div className="flex gap-2">
          <Link href="/admin/orders" className="rounded-full border-2 border-ink/20 px-4 py-2 text-sm hover:bg-pista-soft">Orders</Link>
          <Link href="/admin/products" className="rounded-full border-2 border-ink/20 px-4 py-2 text-sm hover:bg-pista-soft">Products</Link>
        </div>
      </div>
      <select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="mb-4 rounded-xl border-2 border-ink/20 bg-white px-3 py-2">
        <option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {msg && <p role="alert" className="mb-3 text-gulab">{msg}</p>}
      <ul className="space-y-3">
        {data?.data.map((e) => {
          const wa = `https://wa.me/91${e.phone}?text=${encodeURIComponent(`Hello ${e.name}, this is Maa Ambey Sweets about your bulk order request ${e.reference}.`)}`;
          return (
            <li key={e.id} className="rounded-2xl border border-ink/15 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{e.reference} · {e.name}</p>
                  <p className="text-sm text-ink/70">{e.occasion} · {e.fulfilment}{e.city ? `, ${e.city}` : ""}{e.needed_by ? ` · needed by ${e.needed_by}` : ""}</p>
                </div>
                <select aria-label={`Status for ${e.reference}`} value={e.status} onChange={(ev) => change(e, ev.target.value)} className="rounded-xl border-2 border-ink/20 bg-white px-3 py-1.5">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <p className="mt-2 text-sm"><strong>{e.quantity_text}</strong>: {e.items_text}</p>
              {e.notes && <p className="mt-1 text-sm italic text-ink/70">Note: {e.notes}</p>}
              <p className="mt-3 text-sm">Customer wants confirmation by <strong>{e.contact_via}</strong>:
                <a className="ml-3 underline" href={wa}>WhatsApp</a>
                <a className="ml-3 underline" href={`tel:+91${e.phone}`}>Call {e.phone}</a>
                {e.email && <a className="ml-3 underline" href={`mailto:${e.email}?subject=${encodeURIComponent(`Your bulk order request ${e.reference}`)}`}>Email</a>}
              </p>
            </li>
          );
        })}
        {data && data.data.length === 0 && <li className="p-6 text-center text-ink/60">No enquiries yet.</li>}
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
