"use client";
import { useState } from "react";
import { api, Img } from "@/lib/api";
import { checkImage, errorText, sendForm } from "@/lib/media";

/** Manage the pictures a product already has: primary picture, order, description, replace, delete. Changes are saved straight away. */
export default function ProductImageEditor({ token, productId, initial, onCount }: { token: string; productId: number; initial: Img[]; onCount: (n: number) => void }) {
  const [images, setImages] = useState<Img[]>(initial);
  const [alts, setAlts] = useState<Record<number, string>>(Object.fromEntries(initial.map((i) => [i.id, i.alt ?? ""])));
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);
  const base = `/admin/products/${productId}/images`;

  const apply = (list: Img[], text: string) => { setImages(list); onCount(list.length); setAlts((a) => ({ ...Object.fromEntries(list.map((i) => [i.id, i.alt ?? ""])), ...a })); setNote({ ok: true, text }); };
  const fail = (e: unknown) => setNote({ ok: false, text: errorText(e) });

  async function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    setImages(next);
    try { apply(await api<Img[]>(`${base}/reorder`, { method: "POST", token, body: { ids: next.map((x) => x.id) } }), "Order saved. The first picture is the main one."); }
    catch (e) { fail(e); setImages(images); }
  }

  async function update(im: Img, extra: Record<string, string | Blob>, done: string) {
    setBusy(im.id);
    const fd = new FormData();
    Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
    try { apply(await sendForm<Img[]>(`${base}/${im.id}`, token, fd), done); }
    catch (e) { fail(e); } finally { setBusy(null); }
  }

  async function remove(im: Img) {
    setBusy(im.id);
    try { apply(await api<Img[]>(`${base}/${im.id}`, { method: "DELETE", token }), "Picture deleted. The product itself is untouched."); }
    catch (e) { fail(e); } finally { setBusy(null); setConfirm(null); }
  }

  if (!images.length) return <p className="mt-2 text-sm text-stone-500">No pictures yet. Add some below.</p>;
  return (
    <div className="mt-2">
      <ul className="grid gap-3 sm:grid-cols-2">
        {images.map((im, i) => (
          <li key={im.id} className="flex gap-3 rounded-lg border bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={im.thumb_url ?? im.url} alt={alts[im.id] ?? ""} className="h-24 w-24 shrink-0 rounded object-cover" />
            <div className="min-w-0 flex-1">
              {i === 0 && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">Main picture</span>}
              <label htmlFor={`alt${im.id}`} className="mt-1 block text-xs font-medium">Picture description</label>
              <div className="flex gap-1">
                <input id={`alt${im.id}`} value={alts[im.id] ?? ""} maxLength={200} onChange={(e) => setAlts((a) => ({ ...a, [im.id]: e.target.value }))} className="w-full rounded border border-stone-300 px-2 py-1 text-sm" />
                <button type="button" disabled={busy === im.id || (alts[im.id] ?? "") === (im.alt ?? "")} onClick={() => update(im, { alt: alts[im.id] ?? "" }, "Description saved.")} className="rounded border px-2 text-sm hover:bg-stone-100 disabled:opacity-40">Save</button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <button type="button" aria-label="Move earlier" disabled={i === 0 || busy !== null} onClick={() => move(i, -1)} className="rounded border px-2 py-0.5 text-sm hover:bg-stone-100 disabled:opacity-40">↑</button>
                <button type="button" aria-label="Move later" disabled={i === images.length - 1 || busy !== null} onClick={() => move(i, 1)} className="rounded border px-2 py-0.5 text-sm hover:bg-stone-100 disabled:opacity-40">↓</button>
                {i !== 0 && <button type="button" disabled={busy !== null} onClick={() => update(im, { is_primary: "1" }, "Main picture changed.")} className="rounded border px-2 py-0.5 text-sm hover:bg-stone-100">Make main</button>}
                <label className="cursor-pointer rounded border px-2 py-0.5 text-sm hover:bg-stone-100">Replace
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; const bad = checkImage(f); if (bad) setNote({ ok: false, text: bad }); else update(im, { image: f }, "Picture replaced."); }} />
                </label>
                {confirm === im.id ? (
                  <span className="flex items-center gap-1 text-sm">Delete?
                    <button type="button" disabled={busy !== null} onClick={() => remove(im)} className="rounded bg-red-600 px-2 py-0.5 text-white">Yes</button>
                    <button type="button" onClick={() => setConfirm(null)} className="rounded border px-2 py-0.5">No</button>
                  </span>
                ) : <button type="button" disabled={busy !== null} onClick={() => setConfirm(im.id)} className="rounded border border-red-300 px-2 py-0.5 text-sm text-red-700 hover:bg-red-50">Delete</button>}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p role="status" aria-live="polite" className={`mt-2 min-h-5 text-sm ${note ? (note.ok ? "text-green-700" : "text-red-600") : ""}`}>{note?.text}</p>
    </div>
  );
}
