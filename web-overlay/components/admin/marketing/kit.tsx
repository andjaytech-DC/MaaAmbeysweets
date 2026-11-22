"use client";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { clearToken, useAdminToken } from "@/lib/auth";
import { errorText } from "@/lib/media";
import { MARKETING_LINKS, Opt } from "@/lib/marketing";

export const box = "mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm bg-white";
export const btnDark = "rounded bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-900 disabled:opacity-50";
export const btnLight = "rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 disabled:opacity-50";
export const btnDanger = "rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50";

/** Admin token plus an api() that signs the user out if the server says the login is no longer valid. */
export function useAdmin() {
  const token = useAdminToken();
  const router = useRouter();
  const call = useCallback(async <T,>(path: string, opts: { method?: string; body?: FormData | object } = {}): Promise<T> => {
    try { return await api<T>(path, { ...opts, token }); }
    catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { clearToken(); router.replace("/admin/login"); }
      throw e;
    }
  }, [token, router]);
  return { token, call };
}

/** Sub-menu shared by every page in the section. */
export function MarketingNav() {
  const path = usePathname();
  return (
    <nav aria-label="Marketing and creators" className="border-b bg-stone-100">
      <p className="mx-auto max-w-6xl px-4 pt-3 text-xs font-bold uppercase tracking-wider text-stone-500 sm:px-6">Marketing &amp; Creators</p>
      <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
        {MARKETING_LINKS.map((l) => {
          const on = l.exact ? path === l.href : path.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link href={l.href} aria-current={on ? "page" : undefined} className={`block whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${on ? "bg-stone-800 font-semibold text-white" : "hover:bg-stone-200"}`}>{l.label}</Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Page({ title, help, children, actions }: { title: string; help?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink">{title}</h1>
          {help && <p className="mt-1 max-w-3xl text-sm text-stone-600">{help}</p>}
        </div>
        {actions}
      </div>
      <div className="mt-5">{children}</div>
    </main>
  );
}

export type Note = { ok: boolean; text: string } | null;
export const Notice = ({ n }: { n: Note }) => (n ? <p role="status" className={`mb-3 rounded px-3 py-2 text-sm ${n.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{n.text}</p> : null);

const TONE: Record<string, string> = {
  new: "bg-blue-100 text-blue-800", contacted: "bg-sky-100 text-sky-800", interested: "bg-amber-100 text-amber-800", negotiating: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800", active: "bg-green-100 text-green-800", completed: "bg-stone-200 text-stone-700", rejected: "bg-red-100 text-red-800",
  draft: "bg-stone-200 text-stone-700", open: "bg-blue-100 text-blue-800", recruiting: "bg-amber-100 text-amber-800", cancelled: "bg-red-100 text-red-800",
  invited: "bg-sky-100 text-sky-800", accepted: "bg-green-100 text-green-800", declined: "bg-red-100 text-red-800", content_submitted: "bg-amber-100 text-amber-800", content_approved: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800", paid: "bg-green-100 text-green-800", void: "bg-stone-200 text-stone-600",
  dispatched: "bg-sky-100 text-sky-800", delivered: "bg-green-100 text-green-800", requested: "bg-blue-100 text-blue-800", preparing: "bg-amber-100 text-amber-800",
  review_pending: "bg-amber-100 text-amber-800", review_submitted: "bg-green-100 text-green-800",
  verified: "bg-green-100 text-green-800", recorded: "bg-stone-200 text-stone-700", creator_reported: "bg-amber-100 text-amber-800", estimated: "bg-purple-100 text-purple-800",
};
export const Badge = ({ s, text }: { s: string; text?: string }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[s] ?? "bg-stone-200 text-stone-700"}`}>{text ?? s.replace(/_/g, " ")}</span>
);

/** Plain object -> FormData. Arrays become key[], booleans 1/0, empty/undefined are skipped. */
export function toForm(values: Record<string, unknown>, arrayKeys: string[] = []): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined || v === null) continue;
    if (v instanceof File) fd.append(k, v);
    else if (Array.isArray(v)) { v.forEach((x) => fd.append(`${k}[]`, String(x))); if (arrayKeys.includes(k)) fd.append(`${k}_present`, "1"); }
    else if (typeof v === "boolean") fd.append(k, v ? "1" : "0");
    else if (typeof v === "string" && v === "") fd.append(k, "");
    else fd.append(k, String(v));
  }
  return fd;
}

export type FieldDef = {
  name: string; label: string; help?: string; placeholder?: string; full?: boolean; required?: boolean;
  type?: "text" | "textarea" | "number" | "date" | "email" | "url" | "tel" | "select" | "checkbox" | "image" | "multicheck";
  options?: Opt[]; lookup?: string; step?: string; blankLabel?: string;
};

export function FieldInput({ f, value, onChange, error, lookups, imageUrl }: {
  f: FieldDef; value: unknown; onChange: (v: unknown) => void; error?: string; lookups?: Record<string, Opt[]>; imageUrl?: string | null;
}) {
  const id = `f-${f.name}`;
  const opts = f.options ?? (f.lookup ? lookups?.[f.lookup] ?? [] : []);
  const t = f.type ?? "text";
  const label = <label htmlFor={id} className="text-xs font-medium text-stone-700">{f.label}{f.required && <span aria-hidden className="text-red-600"> *</span>}</label>;
  let input: ReactNode;
  if (t === "textarea") input = <textarea id={id} rows={3} value={String(value ?? "")} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} className={box} />;
  else if (t === "select") input = (
    <select id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={box}>
      <option value="">{f.blankLabel ?? "Choose…"}</option>
      {opts.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
    </select>
  );
  else if (t === "checkbox") input = (
    <label className="mt-2 flex items-center gap-2 text-sm"><input id={id} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {f.label}</label>
  );
  else if (t === "multicheck") {
    const sel = (value as string[] | undefined) ?? [];
    input = (
      <fieldset className="mt-1 max-h-44 overflow-y-auto rounded border border-stone-300 bg-white p-2">
        <legend className="sr-only">{f.label}</legend>
        {opts.length === 0 && <p className="text-xs text-stone-500">Nothing to choose from yet.</p>}
        {opts.map((x) => (
          <label key={x.value} className="flex items-center gap-2 py-0.5 text-sm">
            <input type="checkbox" checked={sel.includes(x.value)} onChange={(e) => onChange(e.target.checked ? [...sel, x.value] : sel.filter((y) => y !== x.value))} /> {x.label}
          </label>
        ))}
      </fieldset>
    );
  } else if (t === "image") input = (
    <div className="mt-1 flex items-center gap-3">
      {(value instanceof File || imageUrl) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value instanceof File ? URL.createObjectURL(value) : imageUrl ?? ""} alt="" className="h-16 w-16 rounded object-cover" />
      )}
      <input id={id} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onChange(e.target.files?.[0] ?? null)} className="text-sm" />
    </div>
  );
  else input = <input id={id} type={t} step={f.step} value={String(value ?? "")} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} className={box} />;
  return (
    <div className={f.full || t === "textarea" || t === "multicheck" ? "sm:col-span-2" : ""}>
      {t !== "checkbox" && label}
      {input}
      {f.help && <p className="mt-0.5 text-xs text-stone-500">{f.help}</p>}
      {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export type Column<T> = { head: string; cell: (row: T) => ReactNode };

/**
 * A list with a create/edit form, for resources that are simple records.
 * Every action goes to the real API; nothing is held only in the browser.
 */
export function ResourcePage<T extends { id: number }>({
  title, help, endpoint, fields, columns, multipart = false, filters = [], search = false, lookups, rowActions, canDelete = true,
  mapIn, createLabel = "Add", arrayKeys = [], imageKey, extraTop, noCreate = false, defaults = {}, empty = "Nothing here yet.", mapOut,
}: {
  title: string; help?: string; endpoint: string; fields: FieldDef[]; columns: Column<T>[]; multipart?: boolean;
  filters?: { name: string; label: string; options: Opt[] }[]; search?: boolean; lookups?: Record<string, Opt[]>;
  rowActions?: (row: T, reload: () => void, say: (ok: boolean, text: string) => void) => ReactNode; canDelete?: boolean;
  mapIn?: (row: T) => Record<string, unknown>; createLabel?: string; arrayKeys?: string[]; imageKey?: string; extraTop?: ReactNode;
  noCreate?: boolean; defaults?: Record<string, unknown>; empty?: string; mapOut?: (v: Record<string, unknown>) => Record<string, unknown>;
}) {
  const { token, call } = useAdmin();
  const [rows, setRows] = useState<T[] | null>(null);
  const [q, setQ] = useState("");
  const [flt, setFlt] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [v, setV] = useState<Record<string, unknown>>({});
  const [row, setRow] = useState<T | null>(null);
  const [errs, setErrs] = useState<Record<string, string[]>>({});
  const [note, setNote] = useState<Note>(null);
  const [busy, setBusy] = useState(false);
  const say = useCallback((ok: boolean, text: string) => setNote({ ok, text }), []);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    Object.entries(flt).forEach(([k, x]) => x && p.set(k, x));
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [q, flt]);

  const load = useCallback(async () => {
    if (!token) return;
    try { setRows(await call<T[]>(`${endpoint}${query}`)); }
    catch (e) { setRows([]); say(false, errorText(e)); }
  }, [token, call, endpoint, query, say]);
  useEffect(() => { load(); }, [load]);

  const blank = useMemo(() => {
    const b: Record<string, unknown> = {};
    fields.forEach((f) => { b[f.name] = f.type === "checkbox" ? false : f.type === "multicheck" ? [] : ""; });
    return { ...b, ...defaults };
  }, [fields, defaults]);

  function openNew() { setV(blank); setRow(null); setErrs({}); setEditing("new"); setNote(null); }
  function openEdit(r: T) {
    const base: Record<string, unknown> = mapIn ? mapIn(r) : { ...(r as unknown as Record<string, unknown>) };
    const next: Record<string, unknown> = {};
    fields.forEach((f) => {
      const x = base[f.name];
      next[f.name] = f.type === "image" ? "" : f.type === "checkbox" ? !!x : f.type === "multicheck" ? (Array.isArray(x) ? x.map(String) : []) : x ?? "";
    });
    setV(next); setRow(r); setErrs({}); setEditing(r.id); setNote(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErrs({}); setNote(null);
    try {
      const body = mapOut ? mapOut({ ...v }) : { ...v };
      fields.forEach((f) => { if (f.type === "image" && !(body[f.name] instanceof File)) delete body[f.name]; });
      const isNew = editing === "new";
      const path = isNew ? endpoint : `${endpoint}/${editing}`;
      if (multipart) await call(path, { method: "POST", body: toForm(body, arrayKeys) });
      else await call(path, { method: isNew ? "POST" : "PUT", body });
      say(true, isNew ? "Added." : "Saved.");
      setEditing(null);
      load();
    } catch (er) {
      if (er instanceof ApiError) setErrs(er.errors);
      say(false, errorText(er));
    } finally { setBusy(false); }
  }

  async function del(r: T) {
    if (!window.confirm("Delete this? This cannot be undone.")) return;
    try { await call(`${endpoint}/${r.id}`, { method: "DELETE" }); say(true, "Deleted."); load(); }
    catch (er) { say(false, errorText(er)); }
  }

  const errOf = (n: string) => errs[n]?.[0];

  return (
    <Page title={title} help={help} actions={!noCreate && editing === null ? <button type="button" onClick={openNew} className={btnDark}>{createLabel}</button> : undefined}>
      <Notice n={note} />
      {extraTop}
      {editing !== null && (
        <form onSubmit={save} className="mb-6 rounded-xl border bg-white p-4 shadow-sm" aria-label={editing === "new" ? "Add" : "Edit"}>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <FieldInput key={f.name} f={f} value={v[f.name]} onChange={(x) => setV((s) => ({ ...s, [f.name]: x }))} error={errOf(f.name)} lookups={lookups}
                imageUrl={f.type === "image" && row ? (row as unknown as Record<string, string | null>)[imageKey ?? `${f.name}_url`] : null} />
            ))}
          </div>
          {Object.keys(errs).some((k) => !fields.find((f) => f.name === k)) && <p className="mt-2 text-xs text-red-600">{Object.entries(errs).filter(([k]) => !fields.find((f) => f.name === k)).map(([, m]) => m[0]).join(" ")}</p>}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={busy} className={btnDark}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => setEditing(null)} className={btnLight}>Cancel</button>
          </div>
        </form>
      )}

      {(search || filters.length > 0) && (
        <div className="mb-3 flex flex-wrap items-end gap-3">
          {search && <div><label htmlFor="q" className="text-xs font-medium">Search</label><input id="q" value={q} onChange={(e) => setQ(e.target.value)} className={`${box} w-56`} placeholder="Name, email, city…" /></div>}
          {filters.map((f) => (
            <div key={f.name}>
              <label htmlFor={`flt-${f.name}`} className="text-xs font-medium">{f.label}</label>
              <select id={`flt-${f.name}`} value={flt[f.name] ?? ""} onChange={(e) => setFlt((s) => ({ ...s, [f.name]: e.target.value }))} className={`${box} w-44`}>
                <option value="">All</option>
                {f.options.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {rows === null ? <p className="text-sm text-stone-600">Loading…</p> : rows.length === 0 ? <p className="rounded-xl border bg-white p-6 text-center text-sm text-stone-600">{empty}</p> : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>{columns.map((c) => <th key={c.head} scope="col" className="px-3 py-2 font-semibold">{c.head}</th>)}<th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  {columns.map((c) => <td key={c.head} className="px-3 py-2">{c.cell(r)}</td>)}
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {rowActions?.(r, load, say)}
                      <button type="button" onClick={() => openEdit(r)} className={btnLight}>Edit</button>
                      {canDelete && <button type="button" onClick={() => del(r)} className={btnDanger}>Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}

/** Loads {value,label} options for pickers (creators, campaigns, products...). */
export function useLookups(call: <T>(p: string) => Promise<T>, ready: boolean) {
  const [l, setL] = useState<Record<string, Opt[]>>({});
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const get = async <T,>(p: string): Promise<T | null> => { try { return await call<T>(p); } catch { return null; } };
      const [cr, ca, pr] = await Promise.all([
        get<{ id: number; name: string; city?: string | null }[]>("/admin/marketing/creators"),
        get<{ id: number; name: string }[]>("/admin/marketing/campaigns"),
        get<{ data: { id: number; name: string; sku: string }[] }>("/admin/products?per_page=100"),
      ]);
      setL({
        creators: (cr ?? []).map((x) => ({ value: String(x.id), label: x.city ? `${x.name} (${x.city})` : x.name })),
        campaigns: (ca ?? []).map((x) => ({ value: String(x.id), label: x.name })),
        products: (pr?.data ?? []).map((x) => ({ value: String(x.id), label: `${x.name} (${x.sku})` })),
      });
    })();
  }, [call, ready]);
  return l;
}

export const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
export const inr = (n: number | string | null | undefined) => `₹${Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
