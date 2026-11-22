"use client";
import { useEffect, useState } from "react";
import { publicMedia, SiteMedia } from "@/lib/media";

const FALLBACK = "/brand/logo.webp";

/**
 * The logo chosen in Admin → Brand, falling back to the built-in logo if none is set
 * or if the picture fails to load. `slot` picks the main, phone or footer version.
 */
export default function BrandLogo({ slot = "logo", className = "" }: { slot?: "logo" | "mobile_logo" | "footer_logo"; className?: string }) {
  const [src, setSrc] = useState(FALLBACK);
  useEffect(() => {
    let live = true;
    publicMedia("brand").then((list: SiteMedia[]) => {
      if (!live) return;
      const pick = list.find((m) => m.group === slot) ?? (slot !== "logo" ? list.find((m) => m.group === "logo") : undefined);
      if (pick) setSrc(pick.url);
      const fav = list.find((m) => m.group === "favicon");
      if (fav && slot === "logo") {
        let l = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (!l) { l = document.createElement("link"); l.rel = "icon"; document.head.appendChild(l); }
        l.href = fav.url;
      }
    });
    return () => { live = false; };
  }, [slot]);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={320} height={311} onError={() => setSrc(FALLBACK)} className={className} />;
}
