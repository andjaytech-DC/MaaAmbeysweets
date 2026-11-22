"use client";
import { useState } from "react";

/**
 * A picture from the backend with desktop/mobile versions, responsive sizes, lazy loading and a fallback:
 * if the picture is missing or fails to load, `fallback` is shown instead (or nothing).
 */
export default function Pic({
  src, srcSet, mobileSrc, mobileSrcSet, alt = "", fallback, position = "center", sizes = "100vw", eager = false, className = "",
}: {
  src: string; srcSet?: string | null; mobileSrc?: string | null; mobileSrcSet?: string | null; alt?: string;
  fallback?: string; position?: string; sizes?: string; eager?: boolean; className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const shown = failed && fallback ? fallback : src;
  if (failed && !fallback) return null;
  return (
    <picture>
      {!failed && (mobileSrcSet || mobileSrc) && <source media="(max-width: 767px)" srcSet={mobileSrcSet ?? mobileSrc ?? undefined} sizes="100vw" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={shown}
        srcSet={failed ? undefined : srcSet ?? undefined}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
        style={{ objectPosition: position }}
        className={className}
      />
    </picture>
  );
}
