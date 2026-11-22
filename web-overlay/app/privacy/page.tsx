import { SITE } from "@/lib/site";

export const metadata = { title: `Privacy policy | ${SITE.name}` };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl">Privacy policy</h1>
      <p className="mt-2 text-muted">Last updated: 2 November 2026</p>
      <div className="mt-6 space-y-5 text-lg">
        <p>This explains what {SITE.name} collects when you use this website and what we do with it.</p>
        <h2 className="text-2xl">What we collect</h2>
        <p>Your name, mobile number, email (if you give it), delivery address and the items you order. If you create an account we also keep your login details and your loyalty points. If you leave a review we keep the review and any photos you add. If you send a bulk-order request we keep what you tell us in it.</p>
        <h2 className="text-2xl">Why we collect it</h2>
        <p>To prepare and deliver your order, to contact you about it, to let you track it, and to run your account, points and reviews.</p>
        <h2 className="text-2xl">Who sees it</h2>
        <p>Our shop team and the people delivering your order. We do not sell your details. When online payments are added, the payment provider will handle your payment details and we will not store card numbers.</p>
        <h2 className="text-2xl">On your device</h2>
        <p>Your cart and login are kept in your browser so they are still there when you come back. You can clear them from your browser settings.</p>
        <h2 className="text-2xl">Your choices</h2>
        <p>To see, correct or delete your details, call us on <a className="underline" href={`tel:+91${SITE.phone}`}>{SITE.phone}</a> or message us on WhatsApp.</p>
        <p className="text-sm text-muted">{SITE.address}</p>
      </div>
    </main>
  );
}
