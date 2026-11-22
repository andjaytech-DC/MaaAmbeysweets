import { SITE } from "@/lib/site";

export const metadata = { title: `Terms and conditions | ${SITE.name}` };

export default function Terms() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl">Terms and conditions</h1>
      <p className="mt-2 text-muted">Last updated: 2 November 2026</p>
      <div className="mt-6 space-y-5 text-lg">
        <h2 className="text-2xl">Orders and prices</h2>
        <p>Prices and availability are shown on each product page. We check every order against our current prices and stock, so the final total is the one shown when you place the order.</p>
        <h2 className="text-2xl">Delivery and pickup</h2>
        <p>You can pick up from the shop or choose delivery where we deliver. Delivery charges are shown before you order. We confirm the delivery time with you.</p>
        <h2 className="text-2xl">Changes and cancellations</h2>
        <p>{SITE.changePolicy}</p>
        <h2 className="text-2xl">Freshness</h2>
        <p>Our sweets are made fresh. The shelf life and made-on and best-before dates are shown on the product page when we have them. Please store sweets as advised and eat them before the best-before date.</p>
        <h2 className="text-2xl">Payment</h2>
        <p>At the moment you pay cash on delivery or at the shop.</p>
        <h2 className="text-2xl">Problems with an order</h2>
        <p>Tell us as soon as you can on <a className="underline" href={`tel:+91${SITE.phone}`}>{SITE.phone}</a> or WhatsApp and we will put it right.</p>
        {SITE.fssai && <p className="text-sm text-muted">FSSAI Lic. No. {SITE.fssai}</p>}
      </div>
    </main>
  );
}
