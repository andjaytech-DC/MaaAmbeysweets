import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import Gallery from "@/components/Gallery";
import Hero from "@/components/Hero";
import Pic from "@/components/Pic";
import { publicMedia } from "@/lib/media";
import ProductCard from "@/components/ProductCard";
import CreatorStories from "@/components/CreatorStories";
import SocialLinks from "@/components/SocialLinks";
import SearchPanel from "@/components/SearchPanel";
import { api, Category, Offer, Page, Product, rupees, WHATSAPP } from "@/lib/api";
import { BTN_GOLD, CLAY, GLASS, GLASS_DARK, TAG } from "@/lib/glass";
import { SITE } from "@/lib/site";
import { photo, STOCK, stockForCategory } from "@/lib/stock";

const Icon = ({ d }: { d: string }) => (
  <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const TRUST = [
  { title: "Pickup & Delivery", text: "Choose at checkout. Delivery charges are shown before you order.", d: "M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a1.5 1.5 0 1 0 0-.01M17 19a1.5 1.5 0 1 0 0-.01" },
  { title: "Order Tracking", text: "See when it is being prepared, ready and on its way.", d: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" },
  { title: "Bulk & Gift Orders", text: "Tell us the quantity and date on WhatsApp and we will send a quote.", d: "M4 9h16v4H4zM12 9v11M6 13v7h12v-7M12 9c-2 0-4-1-4-3s3-2 4 3zM12 9c2 0 4-1 4-3s-3-2-4 3z" },
];

const Eyebrow = ({ children, className = "text-gulab" }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-xs font-extrabold uppercase tracking-[0.2em] ${className}`}>{children}</p>
);

export default function Home() {
  return (
    <main className="-mb-20">
      <Suspense fallback={<Hero media={[]} />}>
        <HeroData />
      </Suspense>
      <Suspense fallback={<SearchPanel cats={[]} />}>
        <Catalogue />
      </Suspense>
      <Suspense fallback={<Gallery media={[]} />}>
        <GalleryData />
      </Suspense>
      <Celebrate />

      {/* Benefits: ivory */}
      <section aria-label="Why order from us" className="bg-paper py-14">
        <ul className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-3 sm:px-6">
          {TRUST.map((t) => (
            <li key={t.title} className="flex gap-4 rounded-3xl border border-line bg-white p-6 shadow-sm">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-ink ${CLAY}`}><Icon d={t.d} /></span>
              <div>
                <h3 className="font-display text-xl font-bold text-ink">{t.title}</h3>
                <p className="mt-1 text-text">{t.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Suspense fallback={null}>
        <CreatorStories />
      </Suspense>

      <Story />
    </main>
  );
}

// Festival and gifting: text on deep green, three overlapping editorial photos, clay cards.
function Celebrate() {
  const pics = [
    { k: "gulabthali", cls: "left-0 top-0 w-[56%] -rotate-3" },
    { k: "assorted", cls: "right-0 top-[12%] w-[50%] rotate-3" },
    { k: "kajubowl", cls: "bottom-0 left-[20%] w-[46%] -rotate-1" },
  ] as const;
  const cards = [
    { t: "Festival hampers", href: "/hampers" },
    { t: "Wedding sweets", href: "/bulk-orders" },
    { t: "Office gifts", href: "/bulk-orders" },
  ];
  return (
    <section aria-labelledby="celebrate" className="relative overflow-hidden bg-ink text-white">
      <span aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[22px] border-kesar/25" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
        <div>
          <span className={`${TAG} text-white`}>✦ Festivals &amp; gifting ✦</span>
          <h2 id="celebrate" className="mt-5 text-4xl text-white sm:text-6xl">Make every celebration sweeter.</h2>
          <p className="mt-4 max-w-xl text-lg text-white/90">Planning a wedding, festival or office gift? Tell us what you need, how much and by when. The notice we need depends on the quantity, so we confirm it with you by WhatsApp, phone or email.</p>
          <ul className="mt-6 grid max-w-xl grid-cols-3 gap-3">
            {cards.map((c) => (
              <li key={c.t}>
                <Link href={c.href} className={`grid h-full place-items-center rounded-3xl px-2 py-4 text-center font-display text-lg font-bold leading-tight text-ink transition hover:-translate-y-0.5 motion-reduce:transition-none ${CLAY}`}>{c.t}</Link>
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/hampers" className={`inline-flex h-14 items-center rounded-2xl px-7 font-display text-lg font-bold ${BTN_GOLD}`}>Explore gift boxes →</Link>
            <Link href="/bulk-orders" className={`inline-flex h-14 items-center rounded-2xl px-7 font-display text-lg font-bold text-white hover:bg-white/25 ${GLASS}`}>Request a bulk order quote</Link>
          </div>
          <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hello, I want to ask about a bulk order.")}`} className="mt-4 inline-block font-display text-lg font-bold text-kesar underline underline-offset-4 hover:text-white">Or chat with us on WhatsApp</a>
        </div>
        <div className="relative mx-auto h-[22rem] w-full max-w-xl sm:h-[30rem]">
          {pics.map(({ k, cls }) => (
            <figure key={k} className={`absolute aspect-[4/5] overflow-hidden rounded-3xl shadow-2xl ring-4 ring-white/80 ${cls}`}>
              <Image src={photo(k)} alt={STOCK[k].alt} fill sizes="(min-width: 640px) 18rem, 45vw" className="object-cover" />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

// Story: full-width photograph, glass panel with the shop's verified details.
function Story() {
  return (
    <section aria-labelledby="story" className="relative isolate flex min-h-[34rem] items-center overflow-hidden bg-jamun text-white">
      <Image src={photo("making")} alt={STOCK.making.alt} fill sizes="100vw" className="-z-10 object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-jamun/90 via-jamun/55 to-jamun/15" />
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <div className={`max-w-xl rounded-[2rem] p-7 shadow-2xl sm:p-10 ${GLASS_DARK}`}>
          <Eyebrow className="text-kesar">Our story</Eyebrow>
          <h2 id="story" className="mt-2 text-4xl text-white sm:text-5xl">Made fresh in Kanpur</h2>
          <p className="mt-4 text-lg text-white/95">{SITE.intro}</p>
          <p className="mt-3 text-lg text-white/95">Visit us at {SITE.address}, or order here and we will get it to you.</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <a href={`https://wa.me/${WHATSAPP}`} className="inline-flex h-14 items-center rounded-2xl bg-kesar px-7 font-display text-lg font-bold text-ink hover:bg-white">Order on WhatsApp</a>
            <a href={`tel:+91${SITE.phone}`} className="font-display text-lg font-bold text-white underline decoration-kesar decoration-2 underline-offset-4 hover:text-kesar">Call {SITE.phone}</a>
          </div>
          <SocialLinks variant="compact" heading="Find us online" className="mt-6" />
        </div>
      </div>
    </section>
  );
}

async function HeroData() {
  return <Hero media={await publicMedia("hero")} />;
}

async function GalleryData() {
  return <Gallery media={await publicMedia("gallery")} />;
}

// Promotional banners from Admin; only active, in-schedule, published ones are returned by the API.
async function Banners() {
  const list = await publicMedia("banner");
  if (!list.length) return null;
  return (
    <section aria-label="Promotions" className="mx-auto mt-6 grid max-w-6xl gap-4 px-4 sm:px-6">
      {list.map((b) => {
        const inner = (
          <>
            <Pic src={b.url} srcSet={b.srcset} mobileSrc={b.mobile_url} mobileSrcSet={b.mobile_srcset} alt={b.alt ?? b.title ?? ""} position={b.position} sizes="(min-width: 1152px) 1152px, 100vw" className="h-full w-full object-cover" />
            {(b.title || b.subtitle || b.cta_text) && (
              <span className={`absolute inset-x-3 bottom-3 rounded-2xl px-4 py-3 text-white ${GLASS_DARK}`}>
                {b.title && <span className="block font-display text-2xl font-bold leading-tight">{b.title}</span>}
                {b.subtitle && <span className="block text-base text-white/95">{b.subtitle}</span>}
                {b.cta_text && <span className="block text-base font-bold text-kesar">{b.cta_text} →</span>}
              </span>
            )}
          </>
        );
        const cls = "relative block aspect-[16/7] overflow-hidden rounded-3xl bg-pista-soft shadow-md ring-1 ring-ink/10 sm:aspect-[16/5]";
        return b.cta_url ? (
          b.cta_url.startsWith("/") ? <Link key={b.id} href={b.cta_url} className={cls}>{inner}</Link> : <a key={b.id} href={b.cta_url} className={cls}>{inner}</a>
        ) : <div key={b.id} className={cls}>{inner}</div>;
      })}
    </section>
  );
}

async function Catalogue() {
  const [cats, latest, offers] = await Promise.all([
    api<Category[]>("/categories").catch(() => [] as Category[]),
    api<Page<Product>>("/products?per_page=8").catch(() => null),
    api<Offer[]>("/offers").catch(() => [] as Offer[]),
  ]);
  return (
    <>
      <SearchPanel cats={cats} />

      <Banners />

      {offers.length > 0 && (
        <section aria-label="Offers" className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 rounded-2xl bg-lemon px-4 py-3 text-center text-ink">
            {offers.slice(0, 3).map((o) => (
              <li key={o.code}>
                <span className={`${TAG} mr-2 text-ink`}>Offer</span>
                <strong>{o.title}</strong>: {o.type === "percent" ? `${Number(o.value)}% off` : `${rupees(o.value)} off`}
                {Number(o.min_order) > 0 ? ` on orders above ${rupees(o.min_order)}` : ""}. Use code <strong className="rounded-full bg-gulab px-2.5 py-0.5 text-white">{o.code}</strong> at checkout
                {o.ends_at ? `, until ${new Date(o.ends_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}.
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Categories: photo cards with glass labels */}
      {cats.length > 0 && (
        <section aria-labelledby="cats" className="bg-paper py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-7">
              <Eyebrow>Shop by category</Eyebrow>
              <h2 id="cats" className="mt-1 text-3xl text-ink sm:text-5xl">Explore our sweets</h2>
            </div>
            <ul className="grid auto-rows-[11rem] grid-flow-dense grid-cols-2 gap-3 sm:auto-rows-[13rem] sm:gap-4 lg:grid-cols-4">
              {cats.map((c) => {
                const mine = c.image_url;
                const own = latest?.data.find((p) => p.category_id === c.id && p.images[0])?.images[0].url;
                const k = stockForCategory(c.slug) ?? stockForCategory(c.name);
                const src = mine ?? own ?? (k ? photo(k) : null);
                const big = cats.length >= 4 && c.id === (cats.find((x) => /gift|hamper/i.test(x.slug + x.name)) ?? cats[0]).id;
                return (
                  <li key={c.id} className={big ? "col-span-2 row-span-2" : ""}>
                    <Link href={`/products?category=${c.slug}`} className="group relative block h-full overflow-hidden rounded-3xl bg-ink shadow-md ring-1 ring-ink/10 transition hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none">
                      {src && (
                        <Image src={src} alt={c.image_alt ?? ""} fill sizes="(min-width: 1024px) 25vw, 50vw" style={{ objectPosition: c.image_position ?? "center" }} unoptimized={!src.startsWith("/")} className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
                      )}
                      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-jamun/70 via-transparent to-transparent" />
                      <span className={`absolute inset-x-3 bottom-3 rounded-2xl px-4 py-3 text-white ${GLASS_DARK}`}>
                        <span className={`block font-display font-bold leading-tight ${big ? "text-3xl sm:text-4xl" : "text-2xl"}`}>{c.name}</span>
                        <span className="text-base font-bold text-kesar">Shop now →</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* Products: white band */}
      <section aria-labelledby="latest" className="border-y border-line bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <Eyebrow>Fresh &amp; featured</Eyebrow>
              <h2 id="latest" className="mt-1 text-3xl text-ink sm:text-5xl">Fresh on the shelf</h2>
            </div>
            <Link href="/products" className="shrink-0 font-display text-lg font-bold text-ink hover:text-gulab">View all →</Link>
          </div>
          {latest === null ? (
            <p className="text-muted">Sweets could not be loaded right now. Please try again in a moment.</p>
          ) : latest.data.length === 0 ? (
            <p className="text-muted">No sweets listed yet. Please check back soon.</p>
          ) : (
            <ul className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {latest.data.map((p) => (
                <li key={p.id} className="flex w-[calc(50%-0.375rem)] sm:w-[calc(33.333%-0.667rem)] lg:w-[calc(25%-0.75rem)] [&>*]:w-full">
                  <ProductCard p={p} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
