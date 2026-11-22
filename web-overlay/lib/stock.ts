// Atmosphere photography from Wikimedia Commons (free licences). These are NOT Maa Ambey Sweets products.
// They are used only for backgrounds, category tiles and editorial sections. Product listings use the shop's own photos.
// Files live in web/public/photos/. Full credits are shown at /credits and in public/photos/CREDITS.md.
export type Stock = {
  file: string;
  title: string; // short caption
  alt: string;
  artist: string;
  license: string;
  licenseUrl?: string;
  source: string; // Wikimedia Commons file page
};

const c = (name: string) => `https://commons.wikimedia.org/wiki/File:${name}`;
const BY2 = "https://creativecommons.org/licenses/by/2.0/";
const BYSA2 = "https://creativecommons.org/licenses/by-sa/2.0/";
const BYSA4 = "https://creativecommons.org/licenses/by-sa/4.0/";
const CC0 = "https://creativecommons.org/publicdomain/zero/1.0/";

export const STOCK: Record<string, Stock> = {
  jalebi: { file: "jalebi.jpg", title: "Jalebi", alt: "Golden jalebi piled in a glass bowl", artist: "Haroldandkumar", license: "Public domain", source: c("Jalebi_2.jpg") },
  diya: { file: "fest-2.jpg", title: "Peda and diyas", alt: "Peda on silver trays beside lit diyas", artist: "Abhinaba Basu", license: "CC BY 2.0", licenseUrl: BY2, source: c("Peda_and_Diya_(15123615204).jpg") },
  counter: { file: "fest-3.jpg", title: "The mithai counter", alt: "Shelves of mithai in a sweet shop in Rajasthan", artist: "Felipe Skroski", license: "CC BY 2.0", licenseUrl: BY2, source: c("Street_shop_for_sweets,_mithai_Rajasthan_India.jpg") },
  box: { file: "cat-gift.jpg", title: "A box of burfi", alt: "A box of assorted burfi", artist: "secretlondon123", license: "CC BY-SA 2.0", licenseUrl: BYSA2, source: c("A_box_full_of_burfis,_Mithai_Indian_Sweets_London_November_2009.jpg") },
  assorted: { file: "fest-1.jpg", title: "Assorted mithai", alt: "Close-up of assorted colourful mithai", artist: "robertsharp", license: "CC BY 2.0", licenseUrl: BY2, source: c("Diwali_sweets_India_2009.jpg") },
  pedaburfi: { file: "hero-6.jpg", title: "Peda and burfi", alt: "Trays of peda and burfi with price signs", artist: "Melanie M", license: "CC BY 2.0", licenseUrl: BY2, source: c("Burfi_and_Peda,_Indian_Sweets_Mithai_Chennai_India.jpg") },
  barfi: { file: "cat-barfi.jpg", title: "Barfi", alt: "Pieces of barfi on a plate", artist: "Miansari66", license: "Public domain", source: c("Barfi.JPG") },
  laddu: { file: "cat-laddu.jpg", title: "Motichoor laddu", alt: "A heap of motichoor laddu", artist: "Planetvyom", license: "CC BY-SA 4.0", licenseUrl: BYSA4, source: c("Motichoor_ladoo.JPG") },
  namkeen: { file: "cat-namkeen.jpg", title: "Bhujia and namkeen", alt: "Bikaneri bhujia and sev in a shop", artist: "Nagarjun Kandukuru", license: "CC BY 2.0", licenseUrl: BY2, source: c("Shop_selling_Bikaneri_bhujia_in_Jaipur.jpg") },
  bakery: { file: "cat-bakery.jpg", title: "Cupcakes", alt: "Pink frosted cupcakes", artist: "Jess Watters", license: "CC0", licenseUrl: CC0, source: c("Pink_Cupcakes.jpg") },
  making: { file: "story.jpg", title: "Sweet making", alt: "A sweet maker stirring a very large pan of sweets", artist: "Satdeep Gill", license: "CC BY-SA 4.0", licenseUrl: BYSA4, source: c("Laddu_making.jpg") },
  gulabheap: { file: "gulab-heap.jpg", title: "Gulab jamun", alt: "A tray piled with gulab jamun and silver leaf", artist: "Irfan ali k c", license: "CC BY-SA 4.0", licenseUrl: BYSA4, source: c("Gulab_Jamun_Delhi.JPG") },
  gulabthali: { file: "gulab-thali.jpg", title: "Festive thali", alt: "A festive thali with gulab jamun, barfi, marigolds and lit diyas", artist: "Sayantan Sarkar", license: "CC BY-SA 4.0", licenseUrl: BYSA4, source: c("Diwali_greetings_shot_with_Gulab_Jamun_and_Milk_Cake.jpg") },
  kajubasket: { file: "kaju-basket.jpg", title: "Kaju katli", alt: "A cane basket of silver-leaf kaju katli beside gift boxes", artist: "najeeb shaik", license: "CC BY-SA 4.0", licenseUrl: BYSA4, source: c("Kaju_katli_sweet.jpg") },
  kajubowl: { file: "kaju-bowl.jpg", title: "Kaju katli", alt: "Kaju katli pieces with silver leaf in a yellow bowl", artist: "1989bhaveshv", license: "CC BY-SA 4.0", licenseUrl: BYSA4, source: c("Kaju_Katli.JPG") },
  jalebimaking: { file: "jalebi-making.jpg", title: "Jalebi being fried", alt: "Jalebi being fried in a very large pan", artist: "Sumita Roy Dutta", license: "CC BY-SA 4.0", licenseUrl: BYSA4, source: c("Jalebi_making_process_at_Old_and_famous_Jalebiwala_shop_at_Chandni_Chowk,_DelhiIMG_20150401_135545.jpg") },
  shopdisplay: { file: "shop-display.jpg", title: "A mithai display", alt: "A glass display counter full of mithai trays", artist: "Anushka10patel", license: "CC BY-SA 4.0", licenseUrl: BYSA4, source: c("Sweet_shop.jpg") },
  gulabplate: { file: "gulab-plate.jpg", title: "Gulab jamun", alt: "Two gulab jamun in syrup on a plate", artist: "Suyash.dwivedi", license: "CC BY-SA 4.0", licenseUrl: BYSA4, source: c("Two_Gulab_Jamun_in_a_plate_01.jpg") },
};

export const photo = (k: keyof typeof STOCK | string) => `/photos/${STOCK[k].file}`;

export const HERO_KEYS = ["jalebi", "kajubasket", "gulabheap", "diya", "counter", "pedaburfi"] as const;

// Pick an atmosphere photo for a category from its slug or name.
export function stockForCategory(slugOrName?: string | null): string | null {
  const s = (slugOrName ?? "").toLowerCase();
  if (/bar?fi|burfi/.test(s)) return "barfi";
  if (/ladd?oo?|laddu/.test(s)) return "laddu";
  if (/namkeen|snack|bhujia|sev/.test(s)) return "namkeen";
  if (/gift|hamper|box/.test(s)) return "box";
  if (/bakery|cake|cookie|pastry/.test(s)) return "bakery";
  if (/jalebi/.test(s)) return "jalebi";
  if (/gulab|jamun/.test(s)) return "gulabheap";
  if (/mithai|sweet/.test(s)) return "assorted";
  return null;
}
