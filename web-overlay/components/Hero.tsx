"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BTN_GOLD, GLASS, GLASS_DARK } from "@/lib/glass";
import Pic from "@/components/Pic";
import type { SiteMedia } from "@/lib/media";
import { HERO_KEYS, photo, STOCK } from "@/lib/stock";

const SLIDE_MS = 6500;

type Slide = {
  key: string; src: string; srcSet?: string | null; mobileSrc?: string | null; mobileSrcSet?: string | null;
  title: string; subtitle?: string | null; alt: string; cta_text?: string | null; cta_url?: string | null;
  position?: string; ms: number; remote?: boolean; video?: string;
};
// Built-in pictures, used when no slide has been published from Admin (or the server cannot be reached).
const STOCK_SLIDES: Slide[] = HERO_KEYS.map((k) => ({ key: k, src: photo(k), title: STOCK[k].title, alt: STOCK[k].alt, ms: SLIDE_MS }));

export default function Hero({ media = [] }: { media?: SiteMedia[] }) {
  const SLIDES: Slide[] = useMemo(
    () => media.length
      ? media.map((m) => ({ key: `m${m.id}`, video: m.is_video ? m.url : undefined, src: m.is_video ? (m.mobile_url ?? photo(HERO_KEYS[0])) : m.url, srcSet: m.is_video ? null : m.srcset, mobileSrc: m.is_video ? null : m.mobile_url, mobileSrcSet: m.is_video ? null : m.mobile_srcset, title: m.title ?? "", subtitle: m.subtitle, alt: m.alt ?? m.title ?? "", cta_text: m.cta_text, cta_url: m.cta_url, position: m.position, ms: m.duration_ms || SLIDE_MS, remote: true }))
      : STOCK_SLIDES,
    [media],
  );
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const n = SLIDES.length;
  const go = useCallback((k: number) => setI(((k % n) + n) % n), [n]);

  useEffect(() => {
    if (paused || reduced) return;
    const t = setTimeout(() => go(i + 1), SLIDES[i]?.ms ?? SLIDE_MS);
    return () => clearTimeout(t);
  }, [paused, reduced, i, go, SLIDES]);

  const current = SLIDES[i] ?? SLIDES[0];

  return (
    <section className="relative isolate -mt-[76px] flex min-h-[88svh] items-center overflow-hidden bg-jamun text-white sm:-mt-[84px] lg:min-h-[calc(100svh-4rem)]" aria-roledescription="carousel" aria-label="Featured sweets">
      <div className="absolute inset-0 -z-10" role="group" aria-roledescription="slide" aria-label={`Photo ${i + 1} of ${n}: ${current.alt}`}>
        {SLIDES.map((s, k) => (
          s.remote ? (
            <div key={s.key} aria-hidden className={`absolute inset-0 ${reduced ? "" : "transition-opacity duration-[1400ms]"} ${k === i ? "opacity-100" : "opacity-0"}`}>
              <Pic src={s.src} srcSet={s.srcSet} mobileSrc={s.mobileSrc} mobileSrcSet={s.mobileSrcSet} position={s.position} sizes="100vw" eager={k === 0} fallback={photo(HERO_KEYS[0])} className="absolute inset-0 h-full w-full object-cover" />
              {/* Only the slide on screen loads and plays its video; the cover picture shows until it starts. */}
              {s.video && !reduced && k === i && (
                <video src={s.video} autoPlay muted loop playsInline preload="auto" style={{ objectPosition: s.position }} className="absolute inset-0 h-full w-full object-cover" />
              )}
            </div>
          ) : (
          <Image
            key={s.key}
            src={s.src}
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            priority={k === 0}
            className={`object-cover ${reduced ? "" : "transition-opacity duration-[1400ms]"} ${k === i ? "opacity-100" : "opacity-0"}`}
          />
          )
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-jamun/80 via-jamun/30 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-jamun/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-jamun/65 to-transparent" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 pb-36 pt-24 sm:px-6 sm:pt-32 lg:pb-28 lg:grid-cols-[minmax(0,46rem)_1fr] lg:pt-36">
        <div className="relative">
          {/* a second, offset pane behind the main one gives the glass real depth */}
          <div aria-hidden className="absolute inset-0 translate-x-3 translate-y-3 rounded-[2.5rem] border border-white/25 bg-white/10 sm:translate-x-5 sm:translate-y-5 supports-[backdrop-filter]:backdrop-blur-md" />
          <div className={`relative rounded-[2rem] p-5 sm:rounded-[2.5rem] sm:p-12 ${GLASS_DARK}`}>
          <p className={`inline-flex rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white ${GLASS}`}>
            Maa Ambey Sweets · Kanpur
          </p>
          <h1 className="mt-5 text-[2.3rem] font-extrabold leading-[1.0] text-white sm:text-7xl xl:text-[5.5rem]">
            A little sweetness. <span className="text-kesar">A lot of tradition.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/95 sm:text-xl sm:leading-relaxed">
            Discover authentic mithai, beautiful gift boxes and sweets for every celebration.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:flex sm:flex-wrap">
            <Link href="/products" className={`col-span-2 rounded-2xl px-6 py-3 text-center font-display text-lg font-bold sm:px-8 sm:py-4 sm:text-xl ${BTN_GOLD}`}>Shop sweets →</Link>
            <Link href="/hampers" className={`rounded-2xl px-3 py-3 text-center font-display text-base font-bold text-white hover:bg-white/25 sm:px-7 sm:text-xl sm:py-4 ${GLASS}`}>Explore gift boxes</Link>
            <Link href="/bulk-orders" className={`rounded-2xl px-3 py-3 text-center font-display text-base font-bold text-white hover:bg-white/25 sm:px-7 sm:text-xl sm:py-4 ${GLASS}`}>Bulk orders</Link>
          </div>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-6 lg:items-end">
          <ul className="hidden flex-col items-end gap-3 lg:flex">
            {["Pickup in store", "Local delivery", "Gift boxes & hampers"].map((t, k) => (
              <li key={t} className={`rounded-full px-5 py-2.5 font-display text-lg font-semibold text-white ${GLASS} ${k === 1 ? "-translate-x-6" : ""}`}>{t}</li>
            ))}
          </ul>
          <div className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-2.5 sm:w-auto sm:min-w-[22rem] ${GLASS_DARK}`}>
            <div className="min-w-0">
              <p className="font-display text-xl font-bold leading-tight text-white">{current.title}</p>
              {current.subtitle && <p className="text-sm text-white/85">{current.subtitle}</p>}
              {current.cta_text && current.cta_url && (
                current.cta_url.startsWith("/")
                  ? <Link href={current.cta_url} className="mt-1 inline-block rounded-full bg-kesar px-3 py-1 text-sm font-bold text-ink">{current.cta_text}</Link>
                  : <a href={current.cta_url} rel="noopener noreferrer" className="mt-1 inline-block rounded-full bg-kesar px-3 py-1 text-sm font-bold text-ink">{current.cta_text}</a>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Slide controls">
              <button aria-label="Previous photo" onClick={() => go(i - 1)} className="grid h-11 w-11 place-items-center rounded-full text-xl text-white shadow-[inset_1px_1px_2px_rgba(255,255,255,.3),inset_-1px_-1px_3px_rgba(0,0,0,.35)] hover:bg-white/20 focus-visible:outline-white">‹</button>
              <span className="flex items-center" aria-hidden>
                {SLIDES.map((s, k) => <span key={s.key} className={`mx-0.5 block h-2 rounded-full transition-all motion-reduce:transition-none ${k === i ? "w-5 bg-kesar" : "w-2 bg-white/50"}`} />)}
              </span>
              <button aria-label="Next photo" onClick={() => go(i + 1)} className="grid h-11 w-11 place-items-center rounded-full text-xl text-white shadow-[inset_1px_1px_2px_rgba(255,255,255,.3),inset_-1px_-1px_3px_rgba(0,0,0,.35)] hover:bg-white/20 focus-visible:outline-white">›</button>
              {!reduced && (
                <button onClick={() => setPaused(!paused)} aria-label={paused ? "Play slideshow" : "Pause slideshow"} className="grid h-11 w-11 place-items-center rounded-full text-sm text-white shadow-[inset_1px_1px_2px_rgba(255,255,255,.3),inset_-1px_-1px_3px_rgba(0,0,0,.35)] hover:bg-white/20 focus-visible:outline-white">{paused ? "▶" : "❚❚"}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
