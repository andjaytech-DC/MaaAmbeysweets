import type { Metadata } from "next";
import Link from "next/link";
import { STOCK } from "@/lib/stock";

export const metadata: Metadata = { title: "Photo credits | Maa Ambey Sweets" };

export default function Credits() {
  const items = Object.values(STOCK);
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl text-ink">Photo credits</h1>
      <p className="mt-3 text-lg text-text">
        Some background and category pictures on this site are free-licence photographs from Wikimedia Commons. They show Indian sweets in general and are not photos of Maa Ambey Sweets products. Product pictures in our shop are the shop&apos;s own.
      </p>
      <ul className="mt-8 divide-y divide-line rounded-3xl border border-line bg-white">
        {items.map((s) => (
          <li key={s.file} className="flex flex-wrap items-center gap-4 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/photos/${s.file}`} alt={s.alt} loading="lazy" className="h-20 w-28 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl font-bold text-ink">{s.title}</p>
              <p className="text-text">
                Photo by {s.artist}. {s.licenseUrl ? <a href={s.licenseUrl} className="underline hover:text-gulab" rel="noopener noreferrer">{s.license}</a> : s.license}.{" "}
                <a href={s.source} className="underline hover:text-gulab" rel="noopener noreferrer">Original on Wikimedia Commons</a>
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6"><Link href="/" className="font-display text-lg font-bold text-ink underline hover:text-gulab">← Back to home</Link></p>
    </main>
  );
}
