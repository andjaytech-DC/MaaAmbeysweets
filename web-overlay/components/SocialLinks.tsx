"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SocialChannel } from "@/lib/marketing";

// Official accounts are added by the administrator (Admin > Marketing & Creators > Social channels).
// Nothing is shown until at least one is active, and no address is ever made up here.
let cache: SocialChannel[] | null = null;
let inflight: Promise<SocialChannel[]> | null = null;
function load(): Promise<SocialChannel[]> {
  if (cache) return Promise.resolve(cache);
  inflight ??= api<SocialChannel[]>("/social-channels").then((r) => (cache = Array.isArray(r) ? r : [])).catch(() => (cache = []));
  return inflight;
}

const NAMES: Record<string, string> = { instagram: "Instagram", youtube: "YouTube", facebook: "Facebook", whatsapp: "WhatsApp", google_business: "Google", pinterest: "Pinterest", linkedin: "LinkedIn", other: "Social" };

export default function SocialLinks({ variant = "pills", heading, className = "" }: { variant?: "pills" | "compact"; heading?: string; className?: string }) {
  const [list, setList] = useState<SocialChannel[]>(cache ?? []);
  useEffect(() => { let on = true; load().then((r) => on && setList(r)); return () => { on = false; }; }, []);
  if (!list.length) return null;
  const compact = variant === "compact";
  return (
    <div className={className}>
      {heading && <p className="mb-2 font-display text-lg font-bold">{heading}</p>}
      <ul aria-label="Our social media" className="flex flex-wrap gap-2">
        {list.map((c) => {
          const name = c.display_name || NAMES[c.platform] || c.account_name;
          return (
            <li key={c.id}>
              <a href={c.channel_url || c.profile_url} target="_blank" rel="noopener noreferrer" title={c.description ?? undefined}
                aria-label={`${name} on ${NAMES[c.platform] ?? "social media"} (opens in a new tab)`}
                className={compact ? "inline-flex h-9 items-center rounded-full border border-white/35 px-3 text-sm font-semibold hover:bg-white/15" : "inline-flex h-11 items-center rounded-full border border-current/30 px-4 font-semibold hover:bg-white/15"}>
                {compact ? NAMES[c.platform] ?? name : name}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
