"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, Category, Product, WeightOption } from "@/lib/api";
import { generateEan13 } from "@/lib/ean";
import ProductImageEditor from "@/components/admin/ProductImageEditor";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

type Errors = Record<string, string[]>;

export default function ProductForm({ token, product }: { token: string; product?: Product }) {
  const router = useRouter();
  const [cats, setCats] = useState<Category[]>([]);
  const [f, setF] = useState({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    category_id: product?.category_id ? String(product.category_id) : "",
    price: product?.price ?? "",
    mrp: product?.mrp ?? "",
    unit: product?.unit ?? "",
    shelf_life: product?.shelf_life ?? "",
    ingredients: product?.ingredients ?? "",
    stock: product ? String(product.stock) : "",
    hamper_capacity: product?.hamper_capacity ? String(product.hamper_capacity) : "",
    hamper_eligible: product?.hamper_eligible ?? false,
    description: product?.description ?? "",
    is_active: product?.is_active ?? true,
  });
  const [options, setOptions] = useState<{ label: string; price: string }[]>(
    (product?.weight_options ?? []).map((o: WeightOption) => ({ label: o.label, price: String(o.price) }))
  );
  const [files, setFiles] = useState<File[]>([]);
  const [existingCount, setExistingCount] = useState(product?.images.length ?? 0);
  const [remove, setRemove] = useState<number[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Category[]>("/admin/categories", { token }).then(setCats).catch(() => setMsg({ ok: false, text: "Could not load categories." }));
  }, []);

  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));
  const err = (k: string) => errors[k]?.[0];

  function validate(): Errors {
    const e: Errors = {};
    if (!f.name.trim()) e.name = ["Name is required."];
    if (!f.sku.trim()) e.sku = ["SKU is required."];
    if (f.price === "" || Number(f.price) < 0 || Number.isNaN(Number(f.price))) e.price = ["Enter a valid price."];
    if (f.mrp !== "" && Number(f.mrp) < Number(f.price)) e.mrp = ["MRP cannot be lower than the selling price."];
    if (f.stock !== "" && (!Number.isInteger(Number(f.stock)) || Number(f.stock) < 0)) e.stock = ["Stock must be a whole number, 0 or more."];
    const used = options.filter((o) => o.label.trim() || o.price !== "");
    if (used.some((o) => !o.label.trim() || o.price === "" || Number(o.price) < 0 || Number.isNaN(Number(o.price)))) e.weight_options = ["Each weight option needs a label and a valid price."];
    else if (new Set(used.map((o) => o.label.trim().toLowerCase())).size !== used.length) e.weight_options = ["Weight option labels must be different."];
    return e;
  }

  function pick(list: FileList | null) {
    if (!list) return;
    const bad: string[] = [];
    const ok: File[] = [];
    Array.from(list).forEach((file) => {
      if (!TYPES.includes(file.type)) bad.push(`${file.name}: only JPG, PNG or WebP`);
      else if (file.size > MAX_BYTES) bad.push(`${file.name}: larger than 5 MB`);
      else ok.push(file);
    });
    const existing = existingCount - remove.length;
    if (existing + files.length + ok.length > 8) bad.push("A product can have at most 8 images.");
    else setFiles((s) => [...s, ...ok]);
    setErrors((s) => ({ ...s, images: bad }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) { setMsg({ ok: false, text: "Please fix the highlighted fields." }); return; }

    const fd = new FormData();
    (["name", "sku", "barcode", "category_id", "price", "mrp", "unit", "shelf_life", "ingredients", "stock", "description"] as const).forEach((k) => fd.append(k, f[k]));
    fd.append("is_active", f.is_active ? "1" : "0");
    fd.append("hamper_capacity", f.hamper_capacity);
    fd.append("hamper_eligible", f.hamper_eligible ? "1" : "0");
    fd.append("weight_options", JSON.stringify(options.filter((o) => o.label.trim()).map((o) => ({ label: o.label.trim(), price: Number(o.price) }))));
    files.forEach((file) => fd.append("images[]", file));
    remove.forEach((id) => fd.append("remove_image_ids[]", String(id)));
    if (product) fd.append("_method", "PUT");

    setBusy(true);
    try {
      await api(product ? `/admin/products/${product.id}` : "/admin/products", { method: "POST", token, body: fd });
      setMsg({ ok: true, text: product ? "Product updated." : "Product added." });
      setTimeout(() => router.push("/admin/products"), 700);
    } catch (ex) {
      if (ex instanceof ApiError) {
        if (ex.status === 401 || ex.status === 403) setMsg({ ok: false, text: "Your session has expired or you lack admin access. Please log in again." });
        else {
          // Laravel returns keys like "images.0"; fold them into "images"
          const folded: Errors = {};
          Object.entries(ex.errors).forEach(([k, m]) => { const key = k.startsWith("images.") ? "images" : k.startsWith("weight_options") ? "weight_options" : k; folded[key] = [...(folded[key] ?? []), ...m]; });
          setErrors(folded);
          setMsg({ ok: false, text: Object.keys(folded).length ? "Please fix the highlighted fields." : ex.message });
        }
      }
    } finally { setBusy(false); }
  }

  const input = (k: string) => `mt-1 w-full rounded border px-3 py-2 ${err(k) ? "border-red-500" : "border-stone-300"}`;
  const Err = ({ k }: { k: string }) => (err(k) ? <p className="mt-1 text-sm text-red-600">{errors[k].join(" ")}</p> : null);

  return (
    <form onSubmit={submit} noValidate className="grid max-w-3xl gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="name" className="text-sm font-medium">Name *</label>
        <input id="name" value={f.name} onChange={(e) => set("name", e.target.value)} className={input("name")} />
        <Err k="name" />
      </div>
      <div>
        <label htmlFor="sku" className="text-sm font-medium">SKU *</label>
        <input id="sku" value={f.sku} onChange={(e) => set("sku", e.target.value)} className={input("sku")} />
        <Err k="sku" />
      </div>
      <div>
        <label htmlFor="barcode" className="text-sm font-medium">Barcode (optional)</label>
        <div className="flex gap-2">
          <input id="barcode" value={f.barcode} onChange={(e) => set("barcode", e.target.value)} className={input("barcode")} />
          <button type="button" onClick={() => set("barcode", generateEan13())} className="mt-1 whitespace-nowrap rounded border px-3 text-sm hover:bg-stone-100">Generate</button>
        </div>
        <Err k="barcode" />
      </div>
      <div>
        <label htmlFor="category" className="text-sm font-medium">Category</label>
        <select id="category" value={f.category_id} onChange={(e) => set("category_id", e.target.value)} className={input("category_id")}>
          <option value="">No category</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Err k="category_id" />
      </div>
      <div>
        <label htmlFor="unit" className="text-sm font-medium">Unit / pack size (optional)</label>
        <input id="unit" value={f.unit} placeholder="e.g. 500 g" onChange={(e) => set("unit", e.target.value)} className={input("unit")} />
        <Err k="unit" />
      </div>
      <div>
        <label htmlFor="shelf_life" className="text-sm font-medium">Shelf life (shown to customers)</label>
        <input id="shelf_life" value={f.shelf_life} placeholder="e.g. 7 days, keep cool" onChange={(e) => set("shelf_life", e.target.value)} className={input("shelf_life")} />
        <Err k="shelf_life" />
      </div>
      <div>
        <label htmlFor="ingredients" className="text-sm font-medium">Ingredients (optional)</label>
        <input id="ingredients" value={f.ingredients} placeholder="e.g. milk, sugar, desi ghee, cardamom" onChange={(e) => set("ingredients", e.target.value)} className={input("ingredients")} />
        <Err k="ingredients" />
      </div>
      <div className="sm:col-span-2">
        <p className="text-sm font-medium">Weight options (optional)</p>
        <p className="text-xs text-stone-500">Add sizes such as 250 g, 500 g, 1 kg with their own price. Customers must pick one. Leave empty for a single-price item.</p>
        {options.map((o, n) => (
          <div key={n} className="mt-2 flex gap-2">
            <input aria-label={`Option ${n + 1} label`} placeholder="500 g" value={o.label} onChange={(e) => setOptions((s) => s.map((x, i) => (i === n ? { ...x, label: e.target.value } : x)))} className="w-1/2 rounded border border-stone-300 px-3 py-2" />
            <input aria-label={`Option ${n + 1} price`} type="number" inputMode="decimal" step="0.01" min="0" placeholder="Price ₹" value={o.price} onChange={(e) => setOptions((s) => s.map((x, i) => (i === n ? { ...x, price: e.target.value } : x)))} className="w-1/2 rounded border border-stone-300 px-3 py-2" />
            <button type="button" aria-label={`Remove option ${n + 1}`} onClick={() => setOptions((s) => s.filter((_, i) => i !== n))} className="rounded border px-3 hover:bg-stone-100">×</button>
          </div>
        ))}
        {options.length < 8 && <button type="button" onClick={() => setOptions((s) => [...s, { label: "", price: "" }])} className="mt-2 rounded border px-3 py-1 text-sm hover:bg-stone-100">Add weight option</button>}
        <Err k="weight_options" />
      </div>
      <div>
        <label htmlFor="price" className="text-sm font-medium">Price (₹) *</label>
        <input id="price" type="number" inputMode="decimal" step="0.01" min="0" value={f.price} onChange={(e) => set("price", e.target.value)} className={input("price")} />
        <Err k="price" />
      </div>
      <div>
        <label htmlFor="mrp" className="text-sm font-medium">MRP (₹, optional)</label>
        <input id="mrp" type="number" inputMode="decimal" step="0.01" min="0" value={f.mrp} onChange={(e) => set("mrp", e.target.value)} className={input("mrp")} />
        <Err k="mrp" />
      </div>
      <div>
        <label htmlFor="stock" className="text-sm font-medium">Stock (optional, defaults to 0)</label>
        <input id="stock" type="number" inputMode="numeric" step="1" min="0" value={f.stock} onChange={(e) => set("stock", e.target.value)} className={input("stock")} />
        <Err k="stock" />
      </div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} className="h-5 w-5" />
        Visible on the website
      </label>
      <div>
        <label htmlFor="hamper_capacity" className="text-sm font-medium">Gift box: number of sweets it holds (leave empty if not a box)</label>
        <input id="hamper_capacity" type="number" inputMode="numeric" min="2" max="24" value={f.hamper_capacity} onChange={(e) => set("hamper_capacity", e.target.value)} className={input("hamper_capacity")} />
        <Err k="hamper_capacity" />
      </div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" checked={f.hamper_eligible} onChange={(e) => set("hamper_eligible", e.target.checked)} className="h-5 w-5" />
        Can be chosen to go inside a gift box
      </label>
      <div className="sm:col-span-2">
        <label htmlFor="description" className="text-sm font-medium">Description (optional)</label>
        <textarea id="description" rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} className={input("description")} />
        <Err k="description" />
      </div>

      <div className="sm:col-span-2">
        <p className="text-sm font-medium">Photos (up to 8, JPG/PNG/WebP, 5 MB each). New photos are added when you press Save.</p>
        {product && <ProductImageEditor token={token} productId={product.id} initial={product.images} onCount={setExistingCount} />}
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => { pick(e.target.files); e.target.value = ""; }} className="mt-2 block text-sm" />
        {files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {files.map((file, n) => (
              <div key={n} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={URL.createObjectURL(file)} alt="" className="h-20 w-20 rounded object-cover" />
                <button type="button" aria-label="Remove photo" onClick={() => setFiles((s) => s.filter((_, i) => i !== n))} className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-600 text-xs text-white">×</button>
              </div>
            ))}
          </div>
        )}
        {errors.images?.map((m, n) => <p key={n} className="mt-1 text-sm text-red-600">{m}</p>)}
      </div>

      <div className="sm:col-span-2">
        {msg && <p role="status" className={`mb-3 text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
        <button disabled={busy} className="rounded bg-amber-600 px-6 py-2.5 font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
          {busy ? "Saving…" : product ? "Save changes" : "Add product"}
        </button>
      </div>
    </form>
  );
}
