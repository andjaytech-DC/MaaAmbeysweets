"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError, ReviewList } from "@/lib/api";
import { useOptionalUserToken } from "@/lib/auth";

const Stars = ({ n }: { n: number }) => <span aria-label={`${n} out of 5 stars`} className="text-kesar-deep">{"★".repeat(Math.round(n))}<span className="text-ink/20">{"★".repeat(5 - Math.round(n))}</span></span>;

export default function Reviews({ productId }: { productId: number }) {
  const { token, ready } = useOptionalUserToken();
  const [data, setData] = useState<ReviewList | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const load = useCallback(() => { api<ReviewList>(`/products/${productId}/reviews`).then(setData).catch(() => {}); }, [productId]);
  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setMsg({ ok: false, text: "Choose a star rating." }); return; }
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append("rating", String(rating));
      if (comment) fd.append("comment", comment);
      files.forEach((f) => fd.append("photos[]", f));
      const r = await api<{ message: string }>(`/products/${productId}/reviews`, { method: "POST", token, body: fd });
      setMsg({ ok: true, text: r.message }); setComment(""); setRating(0); setFiles([]);
    } catch (ex) {
      if (ex instanceof ApiError) setMsg({ ok: false, text: Object.values(ex.errors).flat()[0] ?? ex.message });
    } finally { setBusy(false); }
  }

  return (
    <section aria-labelledby="rev" className="mx-auto mt-12 max-w-5xl px-4 sm:px-6">
      <h2 id="rev" className="text-3xl">Reviews</h2>
      {data && data.count > 0 ? (
        <p className="mt-2"><Stars n={data.average} /> <strong>{data.average}</strong> from {data.count} review{data.count === 1 ? "" : "s"}</p>
      ) : <p className="mt-2 text-ink/60">No reviews yet.</p>}

      <ul className="mt-4 space-y-4">
        {data?.reviews.map((r, i) => (
          <li key={i} className="rounded-2xl bg-pista-soft p-4">
            <p><Stars n={r.rating} /> <strong className="ml-2">{r.name}</strong></p>
            {r.comment && <p className="mt-1 max-w-prose">{r.comment}</p>}
            {r.photos?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {r.photos.map((u) => (
                  <a key={u} href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt={`Photo from ${r.name}`} loading="lazy" className="h-24 w-24 rounded-xl object-cover" /></a>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {ready && (token ? (
        <form onSubmit={submit} className="mt-6 max-w-xl rounded-2xl border border-ink/15 bg-white p-4">
          <p className="font-semibold">Tried this sweet? Tell others.</p>
          <div role="radiogroup" aria-label="Your rating" className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n === 1 ? "" : "s"}`} onClick={() => setRating(n)} className={`h-11 w-11 text-2xl ${n <= rating ? "text-kesar-deep" : "text-ink/25"}`}>★</button>
            ))}
          </div>
          <label htmlFor="rc" className="sr-only">Your review</label>
          <textarea id="rc" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What did you like? (optional)" className="mt-2 w-full rounded-xl border-2 border-ink/20 px-3 py-2" />
          <label htmlFor="rph" className="mt-3 block text-sm font-medium">Add photos (optional, up to 3)</label>
          <input id="rph" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            if (list.length > 3) setMsg({ ok: false, text: "You can add up to 3 photos." });
            else if (list.some((f) => f.size > 4 * 1024 * 1024)) setMsg({ ok: false, text: "Each photo must be under 4 MB." });
            else { setMsg(null); setFiles(list); return; }
            e.target.value = ""; setFiles([]);
          }} className="mt-1 block text-sm" />
          {msg && <p role="status" className={`mt-2 text-sm ${msg.ok ? "text-green-800" : "text-gulab"}`}>{msg.text}</p>}
          <button disabled={busy} className="mt-3 rounded-full bg-kesar px-6 py-2 font-semibold text-ink hover:bg-kesar-deep disabled:opacity-60">{busy ? "Sending…" : "Send review"}</button>
          <p className="mt-2 text-xs text-ink/60">Only customers who have received this sweet can review it.</p>
        </form>
      ) : (
        <p className="mt-6 text-sm"><Link href="/login" className="font-semibold text-gulab underline">Log in</Link> to review a sweet you have bought.</p>
      ))}
    </section>
  );
}
