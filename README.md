# Maa Ambey Sweets — website + admin (first pass)

**Status: written but NOT run or tested.** The build environment could not install Laravel or Next.js, so nothing here has been executed. Expect small fixes on first run; see "Verify" below.

## Layout
- `api-overlay/` — Laravel files (migrations, models, controllers, routes, seeder). Copied over a Laravel project in `api/`.
- `web-overlay/` — Next.js files (hero slider, catalogue, admin). Copied over a Next.js project in `web/`.
- `setup.ps1` — creates `api/` and `web/` if missing, copies the overlays, migrates and seeds.

## Run
1. `.\setup.ps1`
2. Terminal 1: `cd api; php artisan serve`   Terminal 2: `cd web; npm run dev`
3. Site: http://localhost:3000   Admin: http://localhost:3000/admin/login
   Default admin: `admin@maaambeysweets.in` / `ChangeMe123!` (set `ADMIN_PASSWORD` in `api/.env` before seeding, change after login).
4. Put 4 real photos in `web/public/hero/` named `1.jpg` … `4.jpg`. Until then the hero shows the plain navy background.
5. Set your WhatsApp number in `web/.env.local` (`NEXT_PUBLIC_WHATSAPP`, digits with country code).
6. Database: Laravel defaults to SQLite. For MySQL, set `DB_CONNECTION=mysql` and the `DB_*` values in `api/.env`, then `php artisan migrate:fresh --seed`.

## What is included
- Hero: navy `#0B1220` background on the hero only, auto-sliding photos (6 s, crossfade), arrows and dots, pauses on hover/focus/touch, swipe, reduced-motion support, search box and CTAs.
- Catalogue: search by name/SKU/barcode, category filter, pagination (handles 500+ products).
- Product page with WhatsApp order button.
- Admin: login (Sanctum token, admin role only), product list with search and pagination, add/edit/delete, multi-image upload (JPG/PNG/WebP, 4 MB, max 8), per-field errors, SKU + optional barcode (generator), printable barcode + QR label, CSV import (export not built yet).
- Optional fields (barcode, category, MRP, unit, stock, description, photos) can stay empty.

## Phase 1 (added)
- Redesigned storefront: Rozha One + Hind fonts (both support Devanagari), palette: elaichi `#17301F`, kesar `#F2A900`, gulab `#B3124B`, pista `#DCE8C8`; navy `#0B1220` only in the hero. Tokens live in `web/app/globals.css`.
- Weight options per product (250 g / 500 g / 1 kg, each with its own price) set in the admin product form; weight picker, quantity and add-to-cart on the product page.
- Cart (saved in the browser), checkout (delivery or pickup, guest or logged in, cash on delivery), server-side pricing and stock checks, delivery fee from `api/config/shop.php` (CHANGE the placeholder values: ₹40 fee, free above ₹500).
- Order tracking page (order number + phone), customer register/login, account with order history and "Order again".
- Admin: Orders page with search, status filter and status updates (cancel puts stock back).
- Run `.\setup.ps1` again after pulling these files: it copies them over and runs the new migrations.
- Before launch, confirm the wording in `web/lib/site.ts` and the trust lines on the home page are true for the business.

## Lessons from competitors (added)
See `DESIGN-RESEARCH.md`. Built in: shelf life and ingredients per product, delivery only to your pincodes (`SHOP_PINCODES` in `api/.env`, e.g. `SHOP_PINCODES=208001,208002` and `SHOP_AREA_LABEL=Kanpur`), FSSAI number in the footer (`web/lib/site.ts`), a "Problem with this order?" WhatsApp link on every tracking page, and a change/cancel note at checkout. Re-run `.\setup.ps1` to apply the new migration.

## Logo and bulk orders (added)
- Logo files are in `web/public/brand/` (`logo.webp` for the site, `logo-large.png` for larger use) and `web/app/icon.png` is the browser-tab icon. They were cut from the shop's poster; get the original vector logo for print.
- `/bulk-orders` form: customer says what, how much, by when and how to be confirmed (WhatsApp, call or email). Requests are saved and listed in Admin > Bulk enquiries. To also get an email for each request, set `SHOP_NOTIFY_EMAIL` and the `MAIL_*` settings in `api/.env`.
- Run `.\setup.ps1` again to create the new `enquiries` table.

## Phase 2 (added)
- **Offers and coupons** (Admin > Offers): percentage or flat discounts, minimum order, maximum discount, start and end dates, total uses, active switch. Tick "Show on website" to put the offer in the strip under the hero. Festival offers are just coupons with dates. Customers enter the code at checkout; the server re-checks it on every order, and a cancelled order gives the use back.
- **Customers** (Admin > Customers): everyone who has ordered, grouped by mobile number, with order count, total spent, and WhatsApp and call links.
- **Reports** (Admin > Reports): orders, revenue, average order, discounts, revenue by day, best sellers, low stock, orders by status, and a CSV download of orders for any date range.
- One admin menu on every admin page.
- Run `.\setup.ps1` again to create the new tables and columns.

## Phase 4 (added)
- **Batches and expiry** (Admin > a product > Batches and expiry): add a batch each time you make a sweet (batch no., made on, expires on, quantity). Orders use the batch that expires first and never an expired one. The product page shows "Made on / Best before". "Who got this batch" lists the orders and phone numbers for a recall. Reports show an **Expiring soon** table.
- **Reviews**: only customers who received the sweet can review it. Reviews wait in Admin > Reviews until you approve them.
- **Loyalty points**: earned when an order is delivered, used at checkout (rates in `api/config/shop.php`, all placeholders to confirm). Cancelling an order reverses points.
- **Gift orders**: checkout has "This is a gift" with the receiver's name, mobile and message; admin orders show it.
- **Pincode check** on the product page (needs `SHOP_PINCODES` in `api/.env`).
- Run `.\setup.ps1` again to create the new tables and columns.

## Phase 5 (added)
- **Product CSV export** (Admin > Products > Export CSV): same columns as the import, so you can edit in Excel and import again.
- **Review photos**: customers can attach up to 3 photos (JPG/PNG/WebP, 4 MB each). You see them in Admin > Reviews before approving.
- **Gift boxes** ("Gift boxes" in the menu): on a product, fill "Gift box: number of sweets it holds" to make it a box, and tick "Can be chosen to go inside a gift box" on the sweets. Customers pick a box and choose the sweets; the box price is fixed. Stock of each chosen sweet goes down, and comes back if the order is cancelled.
- **Order messages**: set `SHOP_NOTIFY_DRIVER` in `api/.env`. `log` (default) only writes the messages to `api/storage/logs/laravel.log`. `webhook` sends each message as JSON to `SHOP_NOTIFY_WEBHOOK_URL` (a WhatsApp/SMS provider endpoint or Make/n8n/Zapier). Email goes through the `MAIL_*` settings when the driver is not `log`.
- Run `.\setup.ps1` again to create the new tables and columns.

## Mobile app (Android and iOS)
A customer app written with Expo / React Native, using the same API as the website.
1. Make sure `.\setup.ps1` has run and the API is running (`cd api; php artisan serve --host=0.0.0.0`).
2. Run `.\setup-mobile.ps1` once. It creates `mobile\` from `mobile-overlay\`.
3. `cd mobile; npx expo start`. Press `a` for an Android emulator, or scan the QR code with the Expo Go app on a phone on the same Wi-Fi (then set `EXPO_PUBLIC_API_URL` in `mobile\.env` to your PC's address, for example `http://192.168.1.10:8000/api`).
- Included: browse and search, offers on the home screen, product page (weights, shelf life, made-on/best-before, reviews with photos), gift box builder, cart, checkout (delivery or pickup, pincode check, offer code, loyalty points, gift option, cash), order tracking, account with orders and points, login and sign-up.
- Not in the app yet: push notifications, delivery-staff and shop-staff apps.
- If you already ran `setup-mobile.ps1`, run it again (it keeps your project and adds `expo-image-picker`), then `cd mobile; npx expo install --check`.
- To publish on Google Play and the App Store you need a Google Play developer account and an Apple Developer account, plus an app icon and store screenshots.

## Not included yet
Online payments, shipping across India, a chosen WhatsApp/SMS provider, push notifications, multiple branches, published mobile apps. The Laravel API is token-based so Android/iOS apps can use it later.

## Verify (please run)
- `cd api; php artisan route:list` shows `/api/admin/products` routes.
- Log in, add a product with photos and with all optional fields empty; check it appears in the list and on /products.
- Try a duplicate SKU: you should see "This SKU is already used…" under the SKU field.
- `cd web; npm run build` completes without errors.
