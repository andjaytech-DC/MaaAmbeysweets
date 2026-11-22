import type { Metadata } from "next";
import { Suspense } from "react";
import CreatorApplyForm from "@/components/CreatorApplyForm";
import SocialLinks from "@/components/SocialLinks";
import { api } from "@/lib/api";
import { CLAY, GLASS_DARK } from "@/lib/glass";

export const metadata: Metadata = {
  title: "Creator partnership | Maa Ambey Sweets",
  description: "We love working with food bloggers, creators and sweet enthusiasts who enjoy discovering and sharing authentic Indian sweets.",
};

const BENEFITS = [
  { t: "Product tasting", d: "Taste our sweets and namkeen fresh from the kitchen and tell your audience what you honestly think." },
  { t: "Festival campaigns", d: "Work with us around Diwali, Raksha Bandhan, Holi and other festivals when families look for mithai." },
  { t: "Gift box collaborations", d: "Create content around our gift boxes and hampers for weddings, offices and celebrations." },
  { t: "Content creation", d: "Blog articles, videos, Reels, photographs. You choose the format that suits your style." },
  { t: "Paid collaborations", d: "Some campaigns include a fee. When one does, it is agreed with you in advance and written down." },
  { t: "Fair and open", d: "Every collaboration is labelled as free sweets, paid or affiliate wherever it appears. We only share your content with your permission." },
];

async function Program() {
  const p = await api<{ applications_open: boolean; disclosure_text: string }>("/creator-program").catch(() => null);
  return <CreatorApplyForm open={p ? p.applications_open : true} disclosure={p?.disclosure_text} />;
}

export default function CreatorPartnership() {
  return (
    <main>
      <section className="relative isolate overflow-hidden bg-jamun py-16 text-white sm:py-24">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(50rem_26rem_at_85%_-10%,rgba(246,213,122,.25),transparent),radial-gradient(40rem_24rem_at_0%_110%,rgba(185,21,75,.35),transparent)]" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-kesar">Creator partnership</p>
          <h1 className="mt-3 max-w-3xl text-5xl text-white sm:text-6xl">Create Something Sweet with Maa Ambey</h1>
          <p className="mt-5 max-w-2xl text-xl text-white/95">We love working with food bloggers, creators and sweet enthusiasts who enjoy discovering and sharing authentic Indian sweets.</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a href="#apply" className="inline-flex h-14 items-center rounded-2xl bg-kesar px-8 font-display text-lg font-bold text-ink hover:bg-white">Apply to collaborate</a>
            <SocialLinks variant="compact" />
          </div>
        </div>
      </section>

      <section aria-labelledby="why" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 id="why" className="text-3xl sm:text-4xl">What working with us looks like</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <li key={b.t} className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              <span aria-hidden className={`mb-3 block h-3 w-12 rounded-full ${CLAY}`} />
              <h3 className="font-display text-xl font-bold text-ink">{b.t}</h3>
              <p className="mt-1 text-text">{b.d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="apply" aria-labelledby="apply-h" className="mx-auto max-w-4xl scroll-mt-28 px-4 pb-6 sm:px-6">
        <div className={`mb-6 rounded-3xl p-6 text-white ${GLASS_DARK}`}>
          <h2 id="apply-h" className="text-3xl text-white sm:text-4xl">Tell us about yourself</h2>
          <p className="mt-2 text-white/95">It takes a few minutes. You do not need a large audience. We look at the quality and honesty of your work.</p>
        </div>
        <Suspense fallback={<p className="rounded-3xl border border-line bg-white p-8">Loading the form…</p>}>
          <Program />
        </Suspense>
      </section>
      <SocialLinks heading="Follow Maa Ambey Sweets" className="mx-auto max-w-4xl px-4 pt-8 sm:px-6" />
    </main>
  );
}
