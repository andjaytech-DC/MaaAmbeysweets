// Frosted-glass class strings, kept in one place so every glass surface looks the same.
// Where the browser cannot blur what is behind, the surface falls back to a solid deep green so text stays readable.
// Layered "liquid glass": a light sheen from the top-left, a thin bright edge, an inner highlight and a soft outer shadow.
// Where the browser cannot blur what is behind, the surface falls back to solid deep green so text stays readable.
const EDGE = "shadow-[inset_0_1px_0_rgba(255,255,255,.55),inset_0_-1px_0_rgba(255,255,255,.12),0_24px_48px_-24px_rgba(0,0,0,.55)]";
const BLUR = "supports-[backdrop-filter]:backdrop-blur-2xl supports-[backdrop-filter]:backdrop-saturate-150";
// light glass: pills, buttons, chips
export const GLASS = `border border-white/40 not-supports-[backdrop-filter]:bg-jamun/85 supports-[backdrop-filter]:bg-gradient-to-br supports-[backdrop-filter]:from-white/30 supports-[backdrop-filter]:to-white/8 ${BLUR} ${EDGE}`;
// green glass: big panels and captions, sheen on top, deep green underneath so text always reads
export const GLASS_DARK = `border border-white/30 not-supports-[backdrop-filter]:bg-jamun/95 supports-[backdrop-filter]:bg-gradient-to-br supports-[backdrop-filter]:from-white/20 supports-[backdrop-filter]:via-jamun/50 supports-[backdrop-filter]:to-jamun/70 ${BLUR} ${EDGE}`;
export const GLASS_HEADER = `border border-white/35 not-supports-[backdrop-filter]:bg-jamun/95 supports-[backdrop-filter]:bg-gradient-to-b supports-[backdrop-filter]:from-white/25 supports-[backdrop-filter]:to-jamun/70 ${BLUR} ${EDGE}`;

// Raised gold button (skeuomorphic): light top edge, soft drop shadow.
export const BTN_GOLD = "bg-gradient-to-b from-[#f6d57a] to-[#e2aa30] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_8px_16px_-8px_rgba(110,70,0,.8)] hover:from-white hover:to-[#f6d57a]";
// Soft clay surface for small promotional cards.
export const CLAY = "bg-lemon shadow-[inset_-6px_-6px_12px_rgba(0,0,0,.07),inset_6px_6px_12px_rgba(255,255,255,.75),0_14px_24px_-12px_rgba(23,61,43,.45)]";
// Neobrutalist label for festival and offer tags only.
export const TAG = "inline-block -rotate-2 border-2 border-current bg-kesar px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-ink shadow-[3px_3px_0_#b9154b]";
