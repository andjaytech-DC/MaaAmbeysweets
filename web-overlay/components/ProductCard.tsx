import Image from "next/image";
import Link from "next/link";
import { fromPrice, Product, rupees } from "@/lib/api";
import QuickAdd from "@/components/QuickAdd";
import { GLASS_DARK } from "@/lib/glass";
import { photo, stockForCategory } from "@/lib/stock";

export default function ProductCard({ p }: { p: Product }) {
  const primary = p.images.find((i) => i.is_primary) ?? p.images[0];
  const img = primary?.url;
  const options = p.weight_options ?? [];
  const out = p.stock <= 0;
  const low = !out && p.stock <= 5;
  const mrp = Number(p.mrp ?? 0);
  const price = fromPrice(p);
  const off = !options.length && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const weight = options.length ? options.map((o) => o.label).join(" · ") : p.unit;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none">
      <Link href={`/products/${p.id}`} className="relative block aspect-[4/3] overflow-hidden bg-pista-soft" aria-label={p.name} tabIndex={-1}>
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} srcSet={primary?.srcset ?? undefined} sizes={primary?.srcset ? "(min-width: 1024px) 25vw, 50vw" : undefined} alt={primary?.alt || p.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none" />
        ) : (
          <NoPhoto cat={p.category?.slug ?? p.category?.name} />
        )}
        {out && <span className="absolute left-3 top-3 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">Sold out</span>}
        {low && <span className="absolute left-3 top-3 rounded-full bg-kesar px-3 py-1 text-xs font-bold text-ink">Only {p.stock} left</span>}
        {off > 0 && <span className="absolute right-3 top-3 rounded-full bg-gulab px-3 py-1 text-xs font-bold text-white">{off}% off</span>}
      </Link>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {p.category && <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{p.category.name}</p>}
        <h3 className="mt-1 text-lg font-bold leading-snug sm:text-xl"><Link href={`/products/${p.id}`} className="hover:text-gulab">{p.name}</Link></h3>
        {weight && <p className="mt-0.5 text-sm text-muted">{weight}</p>}
        <p className="mt-2 flex items-baseline gap-2 font-display text-xl font-bold text-gulab">
          {options.length > 0 && <span className="text-sm font-normal text-muted">From</span>}
          {rupees(price)}
          {off > 0 && <s className="text-sm font-normal text-muted">{rupees(mrp)}</s>}
        </p>
        <div className="mt-auto"><QuickAdd p={p} /></div>
      </div>
    </article>
  );
}

// Shown until the shop uploads a real photo: an illustrative photo of that kind of sweet, clearly labelled.
function NoPhoto({ cat }: { cat?: string | null }) {
  const k = stockForCategory(cat);
  return (
    <div className="relative h-full overflow-hidden bg-jamun">
      {k ? (
        <Image src={photo(k)} alt="" aria-hidden fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
      ) : (
        <div className="grid h-full place-items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.webp" alt="" aria-hidden className="h-20 w-auto" />
        </div>
      )}
      <span className={`absolute bottom-2 left-2 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide text-white ${GLASS_DARK}`}>Illustrative photo</span>
    </div>
  );
}
