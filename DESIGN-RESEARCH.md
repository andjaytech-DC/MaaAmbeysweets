# What other mithai brands get wrong, and what we do instead

Research date: 2 Nov 2026. Method: competitor websites could not be opened from the build environment (blocked), so this is based on the pages that could be read: a consumer-court report, a buyer's guide, a brand FAQ, a gifting page and a "brands that ship pan-India" article. Nothing here is copied from any brand. Treat it as evidence about customer worries, not a full audit of any site.

## What went wrong elsewhere (evidence)
| Problem | Evidence | Our answer |
|---|---|---|
| Stale or spoiled sweets after a festival order, weak response, partial replacement | A Delhi consumer commission held Haldiram liable after a Diwali order of ₹10,520 arrived with fungus; the buyer was offered replacement for only 3 bags and later got a refund with interest plus compensation ([LiveLaw](https://www.livelaw.in/consumer-cases/southwest-delhi-commission-haldiram-stale-sweets-deficiency-service-unfair-trade-practice-255618)) | Shelf life and ingredients shown on every product page (done). "Problem with this order? Message us" on every tracking page, with the order number filled in (done). Batch, manufacture and expiry dates are Phase 4. |
| Vague freshness and shelf-life information | A buyer's guide calls missing preparation and expiry information "a red flag", and lists packaging, FSSAI licence number, delivery estimates and tracking as what shoppers look for ([Tahoora Sweets guide](https://www.tahoorasweets.com/top-things-to-consider-before-ordering-mithai-online/)) | Shelf life field (done). FSSAI licence number shown in the footer once you add it to `web/lib/site.ts` (done, needs your number). |
| Late delivery and non-delivery | A complaint listing exists for Bikanervala non-delivery on time ([ComplaintBox](http://www.complaintbox.in/bikanervala-sweets-non-delivery-of-items-on-time/)); the page itself could not be read, so only the title is evidence | Order tracking with timestamps (done). Delivery only to pincodes you serve, checked at checkout before the customer pays attention to anything else (done, set `SHOP_PINCODES`). Festival lead-time banner is Phase 2. |
| Promising delivery you cannot make | One brand's Diwali delivery was limited to Mumbai while it advertised pan-India ([LBB](https://lbb.in/mumbai/mithai-brands-online-pan-india-delivery)) | Pincode list and a plain "We deliver in …" line at checkout (done). |
| Unclear cancellation | A Mumbai brand states confirmed orders cannot be changed or cancelled because the products are perishable, and tells customers to place a new order ([Bombay Sweet Shop FAQ](https://bombaysweetshop.com/pages/faqs)) | A short change and cancel note at checkout (done; wording in `web/lib/site.ts`, confirm it matches your real policy). |

## What others do well, adapted
- **Shelf life and a pincode check on the product page.** Bombay Sweet Shop lists shelf life per product and checks delivery by PIN code ([FAQ](https://bombaysweetshop.com/pages/faqs)). Pincode check is done at checkout; moving it to the product page is a Phase 2 item.
- **Shelf-life filter and "keeps 15+ days" for gifting.** Almond House filters by shelf life, price and pan-India delivery, tags products by occasion, and runs one enquiry form for corporate gifting asking name, mobile, occasion and message ([Almond House gifting](https://almondhouse.com/pages/gifting)). We will do the same in Phase 4, and also state what they did not: minimum quantity, notice needed and reply time.
- **Packaging as a selling point.** Reviewers single out spill-proof packaging, separate pods and well-portioned gift boxes for shipping ([LBB](https://lbb.in/mumbai/mithai-brands-online-pan-india-delivery)). Phase 4: pack-size options for gift boxes and a packaging line on product pages.
- **Free delivery above a threshold** (Haldiram's, per LBB). Done: free above ₹500, shown in the cart. Change the numbers in `api/config/shop.php`.
- **Ordering over WhatsApp.** Several smaller brands take orders only by Instagram DM or WhatsApp, with no tracking ([LBB](https://lbb.in/mumbai/mithai-brands-online-pan-india-delivery)). We keep WhatsApp for bulk orders and questions but give normal orders a tracked order number.

## Bulk and festival orders: how notice should work
| What others do | Source | What we do |
|---|---|---|
| Bombay Sweet Shop asks for at least one week's notice for bulk orders and at least a week before the date for All India shipping; requests go through a contact form or hotline | [FAQ](https://bombaysweetshop.com/pages/faqs) | The notice depends on the quantity, so we do not print one fixed number. The bulk form asks what, how much and by when, then the shop confirms the notice by the customer's chosen channel. |
| Almond House uses one enquiry form (name, email, mobile, occasion, message) and separate phone lines for business and retail orders, but publishes no minimum quantity, notice or reply time | [Gifting page](https://almondhouse.com/pages/gifting) | Our form also asks quantity and needed-by date, and the customer picks how to be confirmed: WhatsApp, phone call or email. Every request gets a reference number and shows up in Admin > Bulk enquiries with WhatsApp, call and email buttons. |
Once the shop decides its notice for each quantity band, add it as a small table on the bulk-order page.

## Decisions from the client (2 Nov 2026)
- FSSAI number and delivery pincodes: to be provided in a letter. Until then the footer hides the FSSAI line and checkout accepts any pincode.
- Logo: cut out of the shop's own kaju katli poster (633 px wide) and cleaned up. It is used in the header, footer and browser tab. For print or large signage, ask the client for the original vector file (AI, PDF or CDR); this file is a photo-quality crop.
- Bulk orders: the shop confirms notice and price with the customer by WhatsApp, call or email.

## Still open (decide with the client)
1. Real delivery pincodes and charges.
2. FSSAI licence number.
3. Cancellation and change policy wording.
4. Notice for each bulk quantity band, and how fast you reply. State both on the bulk-order page.
5. Shelf life and ingredients for every product (500+ products: add them in the CSV import later).
