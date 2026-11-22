"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { checkImage, errorText, MAX_UPLOAD_MB, sendForm, SiteMedia } from "@/lib/media";

const SLOTS = [
  { slot: "logo", label: "Main logo", help: "Shown in the top bar. A PNG with a transparent background looks best." },
  { slot: "mobile_logo", label: "Phone logo", help: "Optional smaller or simpler logo for phones." },
  { slot: "footer_logo", label: "Footer logo", help: "Shown at the bottom of every page." },
  { slot: "favicon", label: "Browser tab icon", help: "A square picture, at least 64 × 64 px." },
] as const;

export default function BrandManager({ token }: { token: string }) {
  const [items, setItems] = useState<SiteMedia[] | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    api<SiteMedia[]>("/admin/media?kind=brand", { token }).then(setItems).catch((e) => { setItems([]); setNote({ ok: false, text: errorText(e) }); });
  }, [token]);
  useEffect(load, [load]);

  async function upload(slot: string, file: File | undefined) {
    if (!file) return;
    const bad = checkImage(file);
    if (bad) return setNote({ ok: false, text: bad });
    setBusy(slot); setNote({ ok: true, text: "Uploading…" });
    const fd = new FormData();
    fd.append("kind", "brand"); fd.append("group", slot); fd.append("image", file); fd.append("status", "published"); fd.append("is_active", "1");
    if (slot !== "promo") fd.append("alt", "Maa Ambey Sweets");
    try { await sendForm("/admin/media", token, fd); setNote({ ok: true, text: "Saved. It is now on the website." }); load(); }
    catch (e) { setNote({ ok: false, text: errorText(e) }); } finally { setBusy(null); }
  }

  async function remove(m: SiteMedia) {
    setBusy(String(m.id));
    try { await api(`/admin/media/${m.id}`, { method: "DELETE", token }); setNote({ ok: true, text: "Removed. The website goes back to its built-in picture." }); load(); }
    catch (e) { setNote({ ok: false, text: errorText(e) }); } finally { setBusy(null); }
  }

  const of = (slot: string) => items?.filter((m) => m.group === slot) ?? [];
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Logo and brand pictures</h1>
      <p className="mt-1 max-w-2xl text-sm text-stone-600">Upload a picture and it replaces the old one on the whole website straight away. JPG, PNG or WebP, up to {MAX_UPLOAD_MB} MB. If you remove one, the built-in logo is used again.</p>
      <p role="status" aria-live="polite" className={`mt-3 min-h-5 text-sm ${note ? (note.ok ? "text-green-700" : "text-red-600") : ""}`}>{note?.text}</p>
      {items === null ? <p className="text-stone-500">Loading…</p> : (
        <ul className="mt-2 grid gap-4 sm:grid-cols-2">
          {SLOTS.map(({ slot, label, help }) => {
            const cur = of(slot)[0];
            return (
              <li key={slot} className="rounded-xl border bg-white p-4 shadow-sm">
                <h2 className="font-semibold">{label}</h2>
                <p className="text-xs text-stone-500">{help}</p>
                <div className="mt-3 grid h-28 place-items-center rounded-lg bg-stone-200">
                  {cur ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cur.thumb_url} alt={label} className="max-h-24 max-w-full object-contain" />
                  ) : <span className="text-xs text-stone-500">Using the built-in picture</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className={`cursor-pointer rounded bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 ${busy === slot ? "opacity-60" : ""}`}>{cur ? "Replace" : "Upload"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy === slot} onChange={(e) => { upload(slot, e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                  {cur && <button disabled={busy !== null} onClick={() => remove(cur)} className="rounded border px-3 py-1.5 text-sm hover:bg-stone-100">Remove</button>}
                </div>
              </li>
            );
          })}
          <li className="rounded-xl border bg-white p-4 shadow-sm sm:col-span-2">
            <h2 className="font-semibold">Brand pictures</h2>
            <p className="text-xs text-stone-500">Extra promotional pictures you want to keep handy.</p>
            <ul className="mt-3 flex flex-wrap gap-3">
              {of("promo").map((m) => (
                <li key={m.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.thumb_url} alt="" className="h-24 w-32 rounded object-cover" />
                  <button aria-label="Delete brand picture" disabled={busy !== null} onClick={() => remove(m)} className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-600 text-xs text-white">×</button>
                </li>
              ))}
            </ul>
            <label className="mt-3 inline-block cursor-pointer rounded border px-3 py-1.5 text-sm hover:bg-stone-100">Add a picture
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { upload("promo", e.target.files?.[0]); e.target.value = ""; }} />
            </label>
          </li>
        </ul>
      )}
    </main>
  );
}
