import { api } from "@/lib/api";
import { CONTENT_TYPES, CreatorStory, label } from "@/lib/marketing";
import { GLASS, GLASS_DARK } from "@/lib/glass";
import Pic from "@/components/Pic";

// Real, approved creator content only. If the administrator has featured nothing, this section does not appear.
export default async function CreatorStories() {
  const stories = await api<CreatorStory[]>("/creator-stories").catch(() => [] as CreatorStory[]);
  if (!Array.isArray(stories) || !stories.length) return null;
  const lead = stories[0];
  const rest = stories.slice(1, 7);
  return (
    <section aria-labelledby="stories" className="relative isolate overflow-hidden bg-jamun py-16 text-white">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_80%_-10%,rgba(246,213,122,.18),transparent)]" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-kesar">Creators</p>
        <h2 id="stories" className="mt-2 text-4xl text-white sm:text-5xl">Sweet Stories from Our Creators</h2>
        <p className="mt-3 max-w-2xl text-lg text-white/90">Food writers and video makers share what they thought of our sweets, in their own words and on their own pages.</p>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <Card s={lead} big />
          <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1 lg:grid-rows-2" aria-label="More stories">
            {rest.slice(0, 2).map((s) => <li key={s.id} className="min-h-64"><Card s={s} /></li>)}
          </ul>
          {rest.slice(2).map((s) => <div key={s.id} className="min-h-72"><Card s={s} /></div>)}
        </div>
      </div>
    </section>
  );
}

function Card({ s, big = false }: { s: CreatorStory; big?: boolean }) {
  const kind = label(CONTENT_TYPES, s.content_type);
  const title = s.title || `${kind} by ${s.creator_name}`;
  return (
    <article className={`group relative isolate flex h-full overflow-hidden rounded-[2rem] ${big ? "min-h-[28rem] lg:col-span-2" : ""}`}>
      {s.thumbnail_url ? (
        <Pic src={s.thumbnail_url} alt="" sizes={big ? "(min-width:1024px) 760px, 100vw" : "(min-width:1024px) 380px, 100vw"} className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          fallback="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='3'%3E%3Crect width='4' height='3' fill='%23245c40'/%3E%3C/svg%3E" />
      ) : <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-jamun to-[#245c40]" />}
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="mt-auto w-full p-3">
        <div className={`rounded-3xl p-4 sm:p-5 ${GLASS_DARK}`}>
          <div className="flex items-center gap-3">
            {s.creator_photo_url && <Pic src={s.creator_photo_url} alt="" className="h-11 w-11 rounded-full border-2 border-white/60 object-cover" />}
            <p className="leading-tight"><span className="block font-display text-lg font-bold">{s.creator_name}</span><span className="text-sm text-white/85">{kind}</span></p>
          </div>
          <h3 className={`mt-3 font-display font-bold leading-snug text-white ${big ? "text-2xl sm:text-3xl" : "text-xl"}`}>{title}</h3>
          {s.summary && <p className={`mt-1 text-white/90 ${big ? "line-clamp-3" : "line-clamp-2"}`}>{s.summary}</p>}
          {s.products.length > 0 && <p className="mt-2 text-sm text-white/85">Reviewed: {s.products.join(", ")}</p>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${GLASS}`}>{s.disclosure}</span>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-full bg-kesar px-5 font-display font-bold text-ink hover:bg-white">
              {s.content_type.startsWith("blog") ? "Read" : "Watch"}<span className="sr-only"> {title} (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
