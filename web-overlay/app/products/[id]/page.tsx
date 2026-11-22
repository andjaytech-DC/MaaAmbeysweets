import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import AddToCart from "@/components/AddToCart";
import PincodeCheck from "@/components/PincodeCheck";
import Reviews from "@/components/Reviews";
import { api, ApiError, fromPrice, Product, rupees, WHATSAPP } from "@/lib/api";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const p = await api<Product>(`/products/${id}`);
    return { title: `${p.name} | Maa Ambey Sweets` };
  } catch {
    return { title: "Sweets | Maa Ambey Sweets" };
  }
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-5xl px-4 py-10 text-ink/60 sm:px-6">Loading…</p>}>
      <ProductContent params={params} />
    </Suspense>
  );
}

async function ProductContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let p: Product;
  try {
    p = await api<Product>(`/products/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return <main className="mx-auto max-w-4xl px-4 py-10"><p className="text-ink/60">This product could not be loaded. Please try again in a moment.</p></main>;
  }
  const hasOptions = !!p.weight_options?.length;
  const ask = encodeURIComponent(`Hello, I have a question about ${p.name} (SKU ${p.sku}).`);
  return (
    <>
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-2">
      <div className="space-y-3">
        <div className="aspect-square overflow-hidden rounded-3xl bg-pista-soft">
          {p.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.images[0].url} srcSet={p.images[0].srcset ?? undefined} sizes="(min-width: 1024px) 50vw, 100vw" alt={p.images[0].alt || p.name} className="h-full w-full object-cover" />
          ) : <div className="grid h-full place-items-center px-6 text-center font-display text-3xl text-ink/30">{p.name}</div>}
        </div>
        {p.images.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {p.images.slice(1).map((im) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={im.id} src={im.thumb_url ?? im.url} alt={im.alt || ""} loading="lazy" className="aspect-square rounded-xl object-cover" />
            ))}
          </div>
        )}
      </div>
      <div>
        {p.category && <p className="font-semibold text-gulab">{p.category.name}</p>}
        <h1 className="mt-1 text-4xl leading-tight">{p.name}</h1>
        {!hasOptions && (
          <p className="mt-4 text-2xl font-semibold">
            {rupees(fromPrice(p))}
            {p.unit && <span className="ml-2 text-base font-normal text-ink/60">{p.unit}</span>}
            {p.mrp && Number(p.mrp) > Number(p.price) && <span className="ml-3 text-base font-normal text-ink/40 line-through">{rupees(p.mrp)}</span>}
          </p>
        )}
        {p.description && <p className="mt-4 max-w-prose whitespace-pre-line text-ink/80">{p.description}</p>}
        {p.batch && (
          <p className="mt-4 rounded-xl bg-pista px-4 py-2 text-sm">
            Made on <strong>{new Date(p.batch.made_on).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</strong>. Best before <strong>{new Date(p.batch.expires_on).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>.
          </p>
        )}
        {(p.shelf_life || p.ingredients) && (
          <dl className="mt-5 max-w-prose space-y-2 rounded-2xl bg-pista-soft p-4 text-sm">
            {p.shelf_life && <div><dt className="font-semibold">Shelf life</dt><dd>{p.shelf_life}</dd></div>}
            {p.ingredients && <div><dt className="font-semibold">Ingredients</dt><dd>{p.ingredients}</dd></div>}
          </dl>
        )}
        <AddToCart product={p} />
        <PincodeCheck />
        <p className="mt-6 text-sm text-ink/60">
          Questions about this sweet? <a className="font-semibold text-gulab underline" href={`https://wa.me/${WHATSAPP}?text=${ask}`}>Ask on WhatsApp</a>
        </p>
        <p className="mt-6 text-xs text-ink/40">SKU {p.sku}{p.barcode ? ` · Barcode ${p.barcode}` : ""}</p>
      </div>
    </main>
    <Reviews productId={p.id} />
    </>
  );
}
