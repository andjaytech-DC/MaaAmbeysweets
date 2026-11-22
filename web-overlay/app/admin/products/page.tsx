"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API, api, ApiError, Page, Product, rupees } from "@/lib/api";
import { clearToken, useAdminToken } from "@/lib/auth";

type ImportResult = { created: number; updated: number; errors: { line: number; messages: string[] }[] };

export default function AdminProducts() {
  const token = useAdminToken();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<Product> | null>(null);
  const [msg, setMsg] = useState("");
  const [imp, setImp] = useState<ImportResult | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setData(await api<Page<Product>>(`/admin/products?q=${encodeURIComponent(q)}&page=${page}`, { token }));
      setMsg("");
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { clearToken(); router.replace("/admin/login"); }
      else setMsg(e instanceof Error ? e.message : "Failed to load");
    }
  }, [token, q, page, router]);

  useEffect(() => { load(); }, [load]);

  async function del(p: Product) {
    if (!token || !confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try { await api(`/admin/products/${p.id}`, { method: "DELETE", token }); load(); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Delete failed"); }
  }

  async function exportCsv() {
    if (!token) return;
    try {
      const res = await fetch(`${API}/admin/products/export.csv`, { headers: { Authorization: `Bearer ${token}`, Accept: "text/csv" } });
      if (!res.ok) throw new Error("Could not download the file.");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url; a.download = "products.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Download failed"); }
  }

  async function upload(file: File | undefined) {
    if (!token || !file) return;
    const fd = new FormData();
    fd.append("file", file);
    try { setImp(await api<ImportResult>("/admin/products/import", { method: "POST", token, body: fd })); load(); }
    catch (e) { setMsg(e instanceof ApiError ? Object.values(e.errors).flat().join(" ") || e.message : "Import failed"); }
  }

  if (!token) return null;
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products {data && <span className="text-base font-normal text-stone-500">({data.total})</span>}</h1>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer rounded border px-4 py-2 text-sm hover:bg-stone-100">
            Import CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <button onClick={exportCsv} className="rounded border px-4 py-2 text-sm hover:bg-stone-100">Export CSV</button>
          <Link href="/admin/orders" className="rounded border px-4 py-2 text-sm hover:bg-stone-100">Orders</Link>
          <Link href="/admin/enquiries" className="rounded border px-4 py-2 text-sm hover:bg-stone-100">Bulk enquiries</Link>
          <Link href="/admin/products/new" className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">Add product</Link>
        </div>
      </div>
      <p className="mb-3 text-xs text-stone-500">CSV columns: name, sku, barcode, category, price, mrp, unit, shelf_life, ingredients, stock, description, is_active. Existing SKUs are updated.</p>

      <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name, SKU or barcode (scan a barcode here)" className="mb-4 w-full rounded border border-stone-300 bg-white px-4 py-2" />
      {msg && <p className="mb-3 text-sm text-red-600">{msg}</p>}
      {imp && (
        <div className="mb-4 rounded border bg-white p-3 text-sm">
          <p>Imported: {imp.created} new, {imp.updated} updated, {imp.errors.length} rows skipped.</p>
          {imp.errors.slice(0, 20).map((e) => <p key={e.line} className="text-red-600">Line {e.line}: {e.messages.join(" ")}</p>)}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr><th className="p-3">Name</th><th className="p-3">SKU</th><th className="p-3">Barcode</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Status</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {data?.data.map((p) => (
              <tr key={p.id} className="border-t border-stone-100">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">{p.sku}</td>
                <td className="p-3">{p.barcode ?? "—"}</td>
                <td className="p-3">{rupees(p.price)}</td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3">{p.is_active ? "Visible" : "Hidden"}</td>
                <td className="whitespace-nowrap p-3 text-right">
                  <Link href={`/admin/products/${p.id}`} className="mr-3 text-amber-700 hover:underline">Edit / label</Link>
                  <button onClick={() => del(p)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {data && data.data.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-stone-500">No products found.</td></tr>}
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
