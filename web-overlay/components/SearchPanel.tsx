import { Category } from "@/lib/api";
import { BTN_GOLD, GLASS } from "@/lib/glass";

// Large glass search that sits over the bottom of the hero photo. Plain GET form, works without JavaScript.
export default function SearchPanel({ cats }: { cats: Category[] }) {
  return (
    <div className="relative z-10 mx-auto -mt-28 max-w-4xl px-4 sm:-mt-24">
      <form action="/products" role="search" className={`rounded-[2rem] p-3 shadow-2xl sm:p-4 ${GLASS}`}>
        <p className="mb-2 hidden px-2 text-sm font-bold uppercase tracking-[0.18em] text-white sm:block">Find your sweets</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="home-q" className="sr-only">Search sweets, SKU or barcode</label>
          <input id="home-q" name="q" placeholder="Search sweets, SKU or barcode" className="h-14 min-w-0 flex-1 rounded-2xl bg-white/95 px-5 text-lg text-text outline-none placeholder:text-muted focus:ring-4 focus:ring-kesar/60" />
          {cats.length > 0 && (
            <>
              <label htmlFor="home-cat" className="sr-only">Category</label>
              <select id="home-cat" name="category" defaultValue="" className="h-14 rounded-2xl bg-white/95 px-4 text-lg text-text sm:w-52">
                <option value="">All categories</option>
                {cats.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
            </>
          )}
          <button className={`h-14 rounded-2xl px-9 font-display text-xl font-bold ${BTN_GOLD}`}>Search</button>
        </div>
      </form>
    </div>
  );
}
