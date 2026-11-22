"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { checkImage, errorText, MAX_UPLOAD_MB, MAX_VIDEO_MB, sendForm, SiteMedia } from "@/lib/media";

type Field = "title" | "subtitle" | "caption" | "alt" | "cta" | "position" | "duration" | "schedule" | "group" | "mobile";

const POSITIONS = ["center", "top", "bottom", "left", "right"];

type Props = {
  token: string;
  kind: "hero" | "banner" | "gallery";
  heading: string;
  help: string;
  fields: Field[];
  multiple?: boolean;
  groupLabel?: string;
  groupSuggestions?: string[];
};

const labelOf = (m: SiteMedia) => {
  const today = new Date().toISOString().slice(0, 10);
  if (m.status === "draft") return { text: "Draft (not on the website)", cls: "bg-stone-200 text-stone-700" };
  if (!m.is_active) return { text: "Switched off", cls: "bg-stone-200 text-stone-700" };
  if (m.starts_at && m.starts_at > today) return { text: `Scheduled from ${m.starts_at}`, cls: "bg-blue-100 text-blue-800" };
  if (m.ends_at && m.ends_at < today) return { text: "Ended", cls: "bg-stone-200 text-stone-700" };
  return { text: "Live on the website", cls: "bg-green-100 text-green-800" };
};

/** One manager for hero slides, banners and the festival gallery. Talks to /admin/media?kind=... */
export default function MediaManager({ token, kind, heading, help, fields, multiple = false, groupLabel = "Category", groupSuggestions = [] }: Props) {
  const [items, setItems] = useState<SiteMedia[] | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api<SiteMedia[]>(`/admin/media?kind=${kind}`, { token }).then(setItems).catch((e) => { setItems([]); setNote({ ok: false, text: errorText(e) }); });
  }, [kind, token]);
  useEffect(load, [load]);

  const say = (ok: boolean, text: string) => setNote({ ok, text });

  async function upload(list: FileList | File[] | null) {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const bad = files.map((f) => checkImage(f, kind === "hero")).filter(Boolean) as string[];
    if (bad.length) return say(false, bad[0]);
    if (!multiple && files.length > 1) return say(false, "Add one picture at a time.");
    const fd = new FormData();
    if (multiple) files.forEach((f) => fd.append("images[]", f)); else fd.append("image", files[0]);
    setProgress(0); say(true, "Uploading…");
    try {
      fd.append("kind", kind);
      await sendForm("/admin/media", token, fd, setProgress);
      say(true, `Added ${files.length} picture${files.length > 1 ? "s" : ""} as a draft. Fill in the details, then Publish.`);
      load();
    } catch (e) { say(false, errorText(e)); } finally { setProgress(null); }
  }

  async function move(i: number, dir: -1 | 1) {
    if (!items) return;
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    try { setItems(await api<SiteMedia[]>("/admin/media/reorder", { method: "POST", token, body: { kind, ids: next.map((m) => m.id) } })); say(true, "Order saved."); }
    catch (e) { say(false, errorText(e)); load(); }
  }

  async function publishAll(status: "published" | "draft") {
    try {
      setItems(await api<SiteMedia[]>("/admin/media/publish", { method: "POST", token, body: { kind, status } }));
      say(true, status === "published" ? "Everything is published. It is now on the website." : "Everything is back to draft and hidden from the website.");
    } catch (e) { say(false, errorText(e)); }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{heading}</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">{help}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setPreview(!preview)} aria-pressed={preview} className="rounded border px-4 py-2 text-sm hover:bg-stone-100">{preview ? "Hide preview" : "Preview"}</button>
          <button onClick={() => publishAll("draft")} className="rounded border px-4 py-2 text-sm hover:bg-stone-100">Unpublish all</button>
          <button onClick={() => publishAll("published")} className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">Publish all changes</button>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
        className={`mt-5 rounded-xl border-2 border-dashed p-6 text-center ${drag ? "border-amber-600 bg-amber-50" : "border-stone-300 bg-white"}`}
      >
        <p className="font-medium">Drag {multiple ? "pictures" : "a picture"} here, or</p>
        <button type="button" onClick={() => input.current?.click()} className="mt-2 rounded bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-900">Choose {multiple ? "pictures" : "a picture"}</button>
        <input ref={input} type="file" accept={kind === "hero" ? "image/jpeg,image/png,image/webp,video/mp4,video/webm" : "image/jpeg,image/png,image/webp"} multiple={multiple} className="sr-only" aria-label="Choose pictures to upload" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
        <p className="mt-2 text-xs text-stone-500">JPG, PNG or WebP, up to {MAX_UPLOAD_MB} MB{kind === "hero" ? `; or an MP4 / WebM video, up to ${MAX_VIDEO_MB} MB (it plays muted, and the optional phone picture becomes its cover)` : ""}. New pictures start as a draft.</p>
        {progress !== null && (
          <div className="mx-auto mt-3 h-2 max-w-sm overflow-hidden rounded bg-stone-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
            <div className="h-full bg-amber-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <p role="status" aria-live="polite" className={`mt-3 min-h-5 text-sm ${note ? (note.ok ? "text-green-700" : "text-red-600") : ""}`}>{note?.text}</p>

      {preview && items && <Preview kind={kind} items={items} />}

      {items === null ? <p className="mt-6 text-stone-500">Loading…</p> : items.length === 0 ? (
        <p className="mt-6 rounded-xl bg-white p-6 text-stone-600">Nothing here yet. Until you add and publish a picture, the website keeps showing its built-in pictures.</p>
      ) : (
        <ul className="mt-4 grid gap-4 lg:grid-cols-2">
          {items.map((m, i) => (
            <Card key={m.id} m={m} i={i} last={items.length - 1} token={token} fields={fields} groupLabel={groupLabel} groupSuggestions={groupSuggestions}
              onMove={move} onChanged={(saved, text) => { setItems((cur) => cur?.map((x) => (x.id === saved.id ? saved : x)) ?? cur); say(true, text); }}
              onDeleted={(id) => { setItems((cur) => cur?.filter((x) => x.id !== id) ?? cur); say(true, "Picture deleted."); }}
              onError={(t) => say(false, t)} />
          ))}
        </ul>
      )}
    </main>
  );
}

function Preview({ kind, items }: { kind: Props["kind"]; items: SiteMedia[] }) {
  const live = items.filter((m) => m.is_active);
  if (!live.length) return <p className="mt-4 rounded-xl bg-white p-4 text-sm text-stone-600">Nothing switched on to preview.</p>;
  return (
    <section aria-label="Preview" className="mt-4 rounded-xl bg-stone-900 p-4">
      <p className="mb-2 text-xs text-stone-300">Preview of the pictures that are switched on (drafts included, so you can check before publishing).</p>
      {kind === "gallery" ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {live.map((m) => (
            <li key={m.id} className="relative aspect-[4/3] overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.thumb_url} alt={m.alt ?? ""} style={{ objectPosition: m.position }} className="h-full w-full object-cover" />
              {m.title && <span className="absolute inset-x-1 bottom-1 rounded bg-black/55 px-2 py-1 text-xs text-white">{m.title}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-3">
          {live.map((m) => (
            <li key={m.id} className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <div className="relative aspect-[16/7] overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.is_video ? <video src={m.url} poster={m.thumb_url || undefined} muted loop playsInline autoPlay className="h-full w-full object-cover" /> : <img src={m.url} alt="" style={{ objectPosition: m.position }} className="h-full w-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent p-4 text-white">
                  <p className="text-lg font-bold">{m.title}</p><p className="text-sm">{m.subtitle}</p>
                  {m.cta_text && <span className="mt-2 inline-block rounded bg-amber-500 px-3 py-1 text-sm font-semibold text-black">{m.cta_text}</span>}
                </div>
              </div>
              <div className="relative mx-auto hidden aspect-[9/16] w-24 overflow-hidden rounded-lg sm:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.mobile_url ?? m.url} alt="" style={{ objectPosition: m.position }} className="h-full w-full object-cover" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Card({ m, i, last, token, fields, groupLabel, groupSuggestions, onMove, onChanged, onDeleted, onError }: {
  m: SiteMedia; i: number; last: number; token: string; fields: Field[]; groupLabel: string; groupSuggestions: string[];
  onMove: (i: number, d: -1 | 1) => void; onChanged: (m: SiteMedia, text: string) => void; onDeleted: (id: number) => void; onError: (t: string) => void;
}) {
  const [f, setF] = useState({
    title: m.title ?? "", subtitle: m.subtitle ?? "", caption: m.caption ?? "", alt: m.alt ?? "", cta_text: m.cta_text ?? "", cta_url: m.cta_url ?? "",
    position: m.position, duration_ms: String(m.duration_ms), starts_at: m.starts_at ?? "", ends_at: m.ends_at ?? "", group: m.group ?? "", is_active: m.is_active,
  });
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<Record<string, string[]>>({});
  const [pct, setPct] = useState<number | null>(null);
  const has = (k: Field) => fields.includes(k);
  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));
  const id = `m${m.id}`;
  const st = labelOf(m);

  async function send(extra: Record<string, string | Blob> = {}, done = "Saved.") {
    setBusy(true); setErr({});
    const fd = new FormData();
    fd.append("title", f.title); fd.append("subtitle", f.subtitle); fd.append("caption", f.caption); fd.append("alt", f.alt);
    fd.append("cta_text", f.cta_text); fd.append("cta_url", f.cta_url); fd.append("position", f.position);
    fd.append("duration_ms", f.duration_ms || "6500"); fd.append("starts_at", f.starts_at); fd.append("ends_at", f.ends_at);
    fd.append("group", f.group); fd.append("is_active", f.is_active ? "1" : "0");
    Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
    try { onChanged(await sendForm<SiteMedia>(`/admin/media/${m.id}`, token, fd, setPct), done); }
    catch (e) { const ex = e as { errors?: Record<string, string[]> }; setErr(ex.errors ?? {}); onError(errorText(e)); }
    finally { setBusy(false); setPct(null); }
  }

  function pick(file: File | undefined, field: "image" | "mobile_image") {
    if (!file) return;
    const bad = checkImage(file, field === "image" && m.kind === "hero");
    if (bad) return onError(bad);
    send({ [field]: file }, field === "image" ? "Picture replaced." : "Mobile picture saved.");
  }

  async function remove() {
    setBusy(true);
    try { await api(`/admin/media/${m.id}`, { method: "DELETE", token }); onDeleted(m.id); }
    catch (e) { onError(errorText(e)); setBusy(false); setConfirm(false); }
  }

  const Err = ({ k }: { k: string }) => (err[k]?.[0] ? <p className="mt-1 text-xs text-red-600">{err[k][0]}</p> : null);
  const box = "mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm";

  return (
    <li className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <div className="relative h-28 w-40 shrink-0 overflow-hidden rounded-lg bg-stone-100">
          {m.is_video ? (
            <video src={m.url} poster={m.thumb_url || undefined} muted playsInline controls preload="metadata" aria-label="Video preview" className="h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.thumb_url} alt={m.alt ?? ""} style={{ objectPosition: f.position }} className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>{st.text}</span>
          <p className="mt-1 text-xs text-stone-500">{m.width && m.height ? `${m.width}×${m.height}px` : ""}{m.is_video ? "Video" : ""}{m.mobile_url ? (m.is_video ? " · has cover picture" : " · has mobile picture") : ""}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button type="button" aria-label="Move earlier" disabled={i === 0 || busy} onClick={() => onMove(i, -1)} className="rounded border px-2 py-1 text-sm hover:bg-stone-100 disabled:opacity-40">↑</button>
            <button type="button" aria-label="Move later" disabled={i === last || busy} onClick={() => onMove(i, 1)} className="rounded border px-2 py-1 text-sm hover:bg-stone-100 disabled:opacity-40">↓</button>
            <label className="cursor-pointer rounded border px-2.5 py-1 text-sm hover:bg-stone-100">{m.is_video ? "Replace video" : "Replace picture"}
              <input type="file" accept={m.kind === "hero" ? "image/jpeg,image/png,image/webp,video/mp4,video/webm" : "image/jpeg,image/png,image/webp"} className="sr-only" onChange={(e) => { pick(e.target.files?.[0], "image"); e.target.value = ""; }} />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {has("title") && <div><label htmlFor={`${id}t`} className="text-xs font-medium">Title</label><input id={`${id}t`} value={f.title} maxLength={120} onChange={(e) => set("title", e.target.value)} className={box} /><Err k="title" /></div>}
        {has("subtitle") && <div><label htmlFor={`${id}s`} className="text-xs font-medium">Subtitle</label><input id={`${id}s`} value={f.subtitle} maxLength={200} onChange={(e) => set("subtitle", e.target.value)} className={box} /><Err k="subtitle" /></div>}
        {has("caption") && <div className="sm:col-span-2"><label htmlFor={`${id}c`} className="text-xs font-medium">Caption</label><input id={`${id}c`} value={f.caption} maxLength={300} onChange={(e) => set("caption", e.target.value)} className={box} /><Err k="caption" /></div>}
        {has("group") && (
          <div><label htmlFor={`${id}g`} className="text-xs font-medium">{groupLabel}</label>
            <input id={`${id}g`} list={`${id}gl`} value={f.group} maxLength={60} onChange={(e) => set("group", e.target.value)} className={box} />
            <datalist id={`${id}gl`}>{groupSuggestions.map((g) => <option key={g} value={g} />)}</datalist><Err k="group" /></div>
        )}
        {has("cta") && <>
          <div><label htmlFor={`${id}ct`} className="text-xs font-medium">Button text</label><input id={`${id}ct`} value={f.cta_text} maxLength={40} onChange={(e) => set("cta_text", e.target.value)} className={box} placeholder="Shop now" /><Err k="cta_text" /></div>
          <div><label htmlFor={`${id}cu`} className="text-xs font-medium">Button goes to</label><input id={`${id}cu`} value={f.cta_url} maxLength={300} onChange={(e) => set("cta_url", e.target.value)} className={box} placeholder="/products or https://…" /><Err k="cta_url" /></div>
        </>}
        {has("alt") && <div className="sm:col-span-2"><label htmlFor={`${id}a`} className="text-xs font-medium">Picture description (for screen readers and Google)</label><input id={`${id}a`} value={f.alt} maxLength={200} onChange={(e) => set("alt", e.target.value)} className={box} placeholder="A plate of kaju katli with silver leaf" /><Err k="alt" /></div>}
        {has("position") && <div><label htmlFor={`${id}p`} className="text-xs font-medium">Keep this part visible when cropped</label>
          <select id={`${id}p`} value={f.position} onChange={(e) => set("position", e.target.value)} className={box}>{POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>}
        {has("duration") && <div><label htmlFor={`${id}d`} className="text-xs font-medium">Seconds on screen</label>
          <input id={`${id}d`} type="number" min={2} max={20} value={Math.round(Number(f.duration_ms || 6500) / 1000)} onChange={(e) => set("duration_ms", String(Number(e.target.value) * 1000))} className={box} /><Err k="duration_ms" /></div>}
        {has("schedule") && <>
          <div><label htmlFor={`${id}f`} className="text-xs font-medium">Show from (optional)</label><input id={`${id}f`} type="date" value={f.starts_at} onChange={(e) => set("starts_at", e.target.value)} className={box} /></div>
          <div><label htmlFor={`${id}e`} className="text-xs font-medium">Show until (optional)</label><input id={`${id}e`} type="date" value={f.ends_at} onChange={(e) => set("ends_at", e.target.value)} className={box} /><Err k="ends_at" /></div>
        </>}
        {has("mobile") && (
          <div className="sm:col-span-2 text-sm">
            <span className="text-xs font-medium">Phone picture (optional, tall crop works best)</span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded border px-2.5 py-1 hover:bg-stone-100">{m.is_video ? (m.mobile_url ? "Replace cover picture" : "Add cover picture") : m.mobile_url ? "Replace phone picture" : "Add phone picture"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { pick(e.target.files?.[0], "mobile_image"); e.target.value = ""; }} />
              </label>
              {m.mobile_url && <button type="button" onClick={() => send({ remove_mobile_image: "1" }, "Phone picture removed.")} className="rounded border px-2.5 py-1 hover:bg-stone-100">Remove</button>}
            </div>
          </div>
        )}
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Switched on</label>

      {pct !== null && <div className="mt-2 h-1.5 overflow-hidden rounded bg-stone-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Saving"><div className="h-full bg-amber-600" style={{ width: `${pct}%` }} /></div>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button disabled={busy} onClick={() => send()} className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
        <button disabled={busy} onClick={() => send({ status: m.status === "published" ? "draft" : "published" }, m.status === "published" ? "Hidden from the website (draft)." : "Published. It is now on the website.")}
          className="rounded border px-4 py-2 text-sm hover:bg-stone-100 disabled:opacity-60">{m.status === "published" ? "Unpublish" : "Publish"}</button>
        <span className="ml-auto" />
        {confirm ? (
          <span className="flex items-center gap-2 text-sm" role="alertdialog" aria-label="Confirm delete">
            Delete this picture for good?
            <button disabled={busy} onClick={remove} className="rounded bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700">Yes, delete</button>
            <button onClick={() => setConfirm(false)} className="rounded border px-3 py-1.5 hover:bg-stone-100">Keep</button>
          </span>
        ) : <button disabled={busy} onClick={() => setConfirm(true)} className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50">Delete</button>}
      </div>
    </li>
  );
}
