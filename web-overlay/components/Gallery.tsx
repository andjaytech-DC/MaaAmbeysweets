"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { GLASS_DARK } from "@/lib/glass";
import { PHOTOS, stillLive } from "@/lib/gallery";
import { STOCK } from "@/lib/stock";
import type { SiteMedia } from "@/lib/media";

type Tile = { src: string; title: string; alt: string; span: string; video?: string; until?: string; by?: string };

const own = (src: string) => PHOTOS.find((p) => p.src === src)!;
const mine = (src: string, span: string): Tile => { const p = own(src); return { src: p.src, title: p.title, alt: p.alt, span, video: p.video, until: p.until }; };
const stock = (k: keyof typeof STOCK, span: string): Tile => ({ src: `/photos/${STOCK[k].file}`, title: STOCK[k].title, alt: STOCK[k].alt, span, by: STOCK[k].artist });

// Bento layout: your own photos mixed with a few free-licence atmosphere photos (credited).
const TILES: Tile[] = [
  // always shown: fills exactly 4 columns x 3 rows
  mine("/hero/kaju-katli.jpg", "col-span-2 row-span-2"),
  mine("/hero/modak-thaal.jpg", "row-span-2"),
  mine("/hero/gold-box-poster.jpg", "row-span-2"),
  stock("jalebimaking", "col-span-2"),
  stock("shopdisplay", ""),
  stock("gulabplate", ""),
  // festival items that drop out after their end date; together they fill one more row
  mine("/hero/motichoor-box.jpg", "col-span-2"),
  mine("/hero/shop-laddu-poster.jpg", ""),
  mine("/hero/karwa-chauth-thali-poster.jpg", ""),
];

// A clip that fades in over its still picture once it is actually playing, so a tile is never blank.
function Clip({ src, label }: { src: string; label: string }) {
  const [on, setOn] = useState(false);
  return <video src={src} muted loop playsInline autoPlay preload="metadata" aria-label={label} onPlaying={() => setOn(true)} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${on ? "opacity-100" : "opacity-0"}`} />;
}

// "From our shop": cinematic bento gallery on a blurred backdrop, with frosted captions.
const SPANS = ["col-span-2 row-span-2", "row-span-2", "row-span-2", "col-span-2", "", ""];

export default function Gallery({ media = [] }: { media?: SiteMedia[] }) {
  const managed: Tile[] = media.map((m, k) => ({ src: m.url, title: m.title ?? m.caption ?? "", alt: m.alt ?? m.title ?? "", span: SPANS[k % SPANS.length] }));
  const [items, setItems] = useState<Tile[]>(managed.length ? managed : TILES);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setItems(managed.length ? managed : TILES.filter((t) => !t.until || t.until >= today));
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  void stillLive;

  return (
    <section aria-labelledby="gallery" className="relative isolate overflow-hidden bg-jamun py-16 text-white sm:py-20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <Image src="/hero/kaju-katli.jpg" alt="" aria-hidden fill sizes="50vw" className="-z-10 scale-125 object-cover opacity-50 blur-3xl" />
      <div className="absolute inset-0 -z-10 bg-jamun/60" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-kesar">From our shop</p>
        <h2 id="gallery" className="mt-1 text-4xl text-white sm:text-5xl">Sweets, boxes and festive thals</h2>
        <ul className="mt-8 grid auto-rows-[11rem] grid-flow-dense grid-cols-2 gap-3 sm:auto-rows-[13rem] sm:gap-4 lg:grid-cols-4">
          {items.map((t) => (
            <li key={t.src} className={`${t.span}`}>
              <figure className="group relative h-full overflow-hidden rounded-3xl ring-1 ring-white/30">
                <Image src={t.src} alt={t.video ? "" : t.alt} aria-hidden={!!t.video} fill sizes="(min-width: 1024px) 25vw, 50vw" unoptimized={!t.src.startsWith("/")} className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none" />
                {t.video && !reduced && <Clip src={t.video} label={t.alt} />}
                <figcaption className={`absolute inset-x-3 bottom-3 rounded-2xl px-4 py-2 text-white ${GLASS_DARK}`}>
                  <span className="block font-display text-lg font-bold leading-tight">{t.title}</span>
                  {t.by && <span className="block text-[11px] text-white/80">Photo: {t.by}</span>}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-white/80">Photos marked with a photographer are free-licence pictures of Indian sweets, not Maa Ambey Sweets products. <Link href="/credits" className="underline hover:text-kesar">Photo credits</Link></p>
      </div>
    </section>
  );
}
