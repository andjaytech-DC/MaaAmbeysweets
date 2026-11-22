"use client";
import { useEffect, useState } from "react";
import { api, Category } from "@/lib/api";
import { checkImage, errorText, MAX_UPLOAD_MB, sendForm } from "@/lib/media";

const POSITIONS = ["center", "top", "bottom", "left", "right"];

export default function CategoryManager({ token }: { token: string }) {
  const [cats, setCats] = useState<Category[] | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api<Category[]>("/admin/categories", { token }).then(setCats).catch((e) => { setCats([]); setNote({ ok: false, text: errorText(e) }); });
  }, [token]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Category pictures</h1>
      <p className="mt-1 max-w-2xl text-sm text-stone-600">The cover picture for each category on the home page. Without one, the site uses a product photo or a built-in picture. Switching a category off hides it from the website; its products are not deleted.</p>
      <p role="status" aria-live="polite" className={`mt-3 min-h-5 text-sm ${note ? (note.ok ? "text-green-700" : "text-red-600") : ""}`}>{note?.text}</p>
      {cats === null ? <p className="text-stone-500">Loading…</p> : (
        <ul className="mt-2 space-y-4">
          {cats.map((c) => (
            <Row key={c.id} c={c} token={token} say={(ok, text) => setNote({ ok, text })} onSaved={(n) => setCats((cur) => cur?.map((x) => (x.id === n.id ? n : x)) ?? cur)} />
          ))}
        </ul>
      )}
    </main>
  );
}

function Row({ c, token, say, onSaved }: { c: Category; token: string; say: (ok: boolean, t: string) => void; onSaved: (c: Category) => void }) {
  const [alt, setAlt] = useState(c.image_alt ?? "");
  const [pos, setPos] = useState(c.image_position ?? "center");
  const [on, setOn] = useState(c.is_active !== false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState<number | null>(null);
  const shown = file ? URL.createObjectURL(file) : c.image_url;

  function choose(f: File | undefined) {
    if (!f) return;
    const bad = checkImage(f);
    if (bad) return say(false, bad);
    setFile(f);
  }

  async function save(removeImage = false) {
    setBusy(true);
    const fd = new FormData();
    fd.append("image_alt", alt); fd.append("image_position", pos); fd.append("is_active", on ? "1" : "0");
    if (file) fd.append("image", file);
    if (removeImage) fd.append("remove_image", "1");
    try { const n = await sendForm<Category>(`/admin/categories/${c.id}`, token, fd, setPct); onSaved(n); setFile(null); say(true, `${c.name} saved.`); }
    catch (e) { say(false, errorText(e)); } finally { setBusy(false); setPct(null); }
  }

  const box = "mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm";
  return (
    <li className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-4">
        <div className="h-32 w-44 shrink-0 overflow-hidden rounded-lg bg-stone-100">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt={alt} style={{ objectPosition: pos }} className="h-full w-full object-cover" />
          ) : <div className="grid h-full place-items-center px-3 text-center text-xs text-stone-500">No picture yet</div>}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-lg font-semibold">{c.name} {!on && <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium">Switched off</span>}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded border px-3 py-1.5 text-sm hover:bg-stone-100">{c.image_url || file ? "Replace picture" : "Upload picture"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {c.image_url && !file && <button disabled={busy} onClick={() => save(true)} className="rounded border px-3 py-1.5 text-sm hover:bg-stone-100">Remove picture</button>}
            {file && <span className="text-xs text-stone-600">New picture ready — press Save.</span>}
            <span className="text-xs text-stone-500">JPG, PNG or WebP, up to {MAX_UPLOAD_MB} MB</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div><label htmlFor={`a${c.id}`} className="text-xs font-medium">Picture description</label><input id={`a${c.id}`} value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} className={box} /></div>
            <div><label htmlFor={`p${c.id}`} className="text-xs font-medium">Keep this part visible when cropped</label>
              <select id={`p${c.id}`} value={pos} onChange={(e) => setPos(e.target.value)} className={box}>{POSITIONS.map((p) => <option key={p}>{p}</option>)}</select></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> Show this category on the website</label>
          {pct !== null && <div className="h-1.5 overflow-hidden rounded bg-stone-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Saving"><div className="h-full bg-amber-600" style={{ width: `${pct}%` }} /></div>}
          <button disabled={busy} onClick={() => save()} className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </li>
  );
}
