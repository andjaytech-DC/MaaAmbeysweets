// The shop's own photos and clips (files in web/public/hero/). Edit this list to change the home page.
// Festival items carry an `until` date so the site never shows an old festival.
export type Photo = {
  src: string;
  title: string;
  alt: string;
  until?: string; // YYYY-MM-DD, hidden after this date
  video?: string; // optional clip; `src` is then the still frame
  hero?: boolean; // large enough to use as the full-screen background
};

export const PHOTOS: Photo[] = [
  { src: "/hero/kaju-katli.jpg", title: "Festive sweets", alt: "A festive plate of silver-leaf sweets on a deep blue cloth", hero: true },
  { src: "/hero/modak-thaal.jpg", title: "Ganesh Ji's Modak Thaal", alt: "A large plate of sweets arranged in rings", hero: true },
  { src: "/hero/motichoor-box.jpg", title: "Motichoor Laddu", alt: "A box of silver-leaf motichoor laddu", until: "2026-11-05", hero: true },
  { src: "/hero/rooted-in-tradition.jpg", title: "Happy Karwa Chauth", alt: "A festival greeting over a spread of mithai", until: "2026-11-05", hero: true },
  { src: "/hero/gold-box-poster.jpg", video: "/hero/gold-box.mp4", title: "Festive thali", alt: "A thali with a box of sweets and a lit diya" },
  { src: "/hero/karwa-chauth-thali-poster.jpg", video: "/hero/karwa-chauth-thali.mp4", title: "Karwa Chauth special", alt: "Karwa Chauth thali with sweets and a lit diya", until: "2026-11-05" },
  { src: "/hero/shop-laddu-poster.jpg", video: "/hero/shop-laddu.mp4", title: "Fresh from our counter", alt: "A box of laddu at the Maa Ambey Sweets counter", until: "2026-11-05" },
];

export const stillLive = (list: Photo[]) => {
  const today = new Date().toISOString().slice(0, 10);
  return list.filter((p) => !p.until || p.until >= today);
};
