import { Suspense } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { api, Category, Page, Product } from "@/lib/api";

type SP = Promise<{ q?: string; category?: string; page?: string }>;

export default function Products({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-10 text-ink/60 sm:px-6">Loading sweets…</p>}>
      <ProductsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ProductsContent({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.q) qs.set("q", sp.q);
  if (sp.category) qs.set("category", sp.category);
  qs.set("page", sp.page ?? "1");

  const [cats, res] = await Promise.all([
    api<Category[]>("/categories").catch(() => [] as Category[]),
    api<Page<Product>>(`/products?${qs}`).catch(() => null),
  ]);

  const link = (page: number) => {
    const p = new URLSearchParams(qs);
    p.set("page", String(page));
    return `/products?${p}`;
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-4 text-4xl">Our sweets</h1>
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search by name, SKU or barcode" className="min-w-0 flex-1 rounded-lg border border-ink/20 bg-white px-4 py-2" />
        {sp.category && <input type="hidden" name="category" value={sp.category} />}
        <button className="rounded-lg bg-kesar px-5 py-2 font-semibold text-ink hover:bg-kesar-deep">Search</button>
      </form>
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/products" className={`rounded-full border px-4 py-1.5 text-sm ${!sp.category ? "border-ink bg-ink text-paper" : "border-ink/20 bg-white"}`}>All</Link>
        {cats.map((c) => (
          <Link key={c.id} href={`/products?category=${c.slug}`} className={`rounded-full border px-4 py-1.5 text-sm ${sp.category === c.slug ? "border-ink bg-ink text-paper" : "border-ink/20 bg-white"}`}>
            {c.name}
          </Link>
        ))}
      </div>

      {res === null ? (
        <p className="text-ink/60">Products could not be loaded right now. Please try again shortly.</p>
      ) : res.data.length === 0 ? (
        <p className="text-ink/60">No sweets found. Try a different search.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink/60">{res.total} items</p>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {res.data.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
          <div className="mt-8 flex items-center justify-center gap-4 text-sm">
            {res.current_page > 1 && <Link href={link(res.current_page - 1)} className="rounded border px-4 py-2 hover:bg-pista-soft">Previous</Link>}
            <span>Page {res.current_page} of {res.last_page}</span>
            {res.current_page < res.last_page && <Link href={link(res.current_page + 1)} className="rounded border px-4 py-2 hover:bg-pista-soft">Next</Link>}
          </div>
        </>
      )}
    </main>
  );
}
