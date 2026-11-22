import OrderTracker from "@/components/OrderTracker";
import { Order, rupees, WHATSAPP } from "@/lib/api";

export default function OrderView({ order, placed = false }: { order: Order; placed?: boolean }) {
  return (
    <div className="space-y-6">
      {placed && (
        <div role="status" className="rounded-2xl bg-pista p-5">
          <p className="font-display text-2xl">Thank you, your order is placed.</p>
          <p className="mt-1">Your order number is <strong>{order.number}</strong>. Save it. You need it with your phone number to track this order.</p>
        </div>
      )}
      <div className="grid gap-8 md:grid-cols-2">
        <section aria-labelledby="st">
          <h2 id="st" className="mb-1 text-2xl">Order {order.number}</h2>
          <p className="mb-5 text-sm text-ink/60">Placed {new Date(order.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
          <OrderTracker order={order} />
        </section>
        <section aria-labelledby="dt" className="rounded-2xl bg-pista-soft p-6">
          <h2 id="dt" className="mb-3 text-2xl">Details</h2>
          <ul className="space-y-1 text-sm">
            {order.items.map((i, n) => (
              <li key={n} className="flex justify-between gap-3"><span>{i.qty} × {i.name}{i.option_label ? ` (${i.option_label})` : ""}{i.hamper_choices?.length ? <span className="block text-sm font-normal text-ink/60">Inside: {i.hamper_choices.map((c) => `${c.count} × ${c.name}`).join(", ")}</span> : null}</span><span className="font-semibold">{rupees(i.line_total)}</span></li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 border-t border-ink/15 pt-3 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{rupees(order.subtotal)}</dd></div>
            {Number(order.points_discount) > 0 && <div className="flex justify-between text-gulab"><dt>{order.points_redeemed} points</dt><dd>− {rupees(order.points_discount)}</dd></div>}
            {Number(order.discount) > 0 && <div className="flex justify-between text-gulab"><dt>Offer {order.coupon_code}</dt><dd>− {rupees(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{Number(order.delivery_fee) ? rupees(order.delivery_fee) : order.fulfilment === "pickup" ? "Not needed" : "Free"}</dd></div>
            <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd>{rupees(order.total)}</dd></div>
          </dl>
          <p className="mt-3 text-sm">{order.fulfilment === "pickup" ? "Pay at the shop when you collect." : "Pay by cash on delivery."}</p>
          {order.fulfilment === "delivery" && <p className="mt-3 text-sm text-ink/70">Delivering to {order.address_line}, {order.city} {order.pincode}</p>}
          {order.is_gift && <p className="mt-3 rounded-xl bg-pista p-3 text-sm">Gift for <strong>{order.recipient_name}</strong>{order.gift_message ? <>: &ldquo;{order.gift_message}&rdquo;</> : null}</p>}
          {order.notes && <p className="mt-2 text-sm text-ink/70">Your note: {order.notes}</p>}
          <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hello, I need help with order ${order.number}.`)}`} className="mt-4 inline-block rounded-full border-2 border-ink/25 px-5 py-2 text-sm font-semibold hover:bg-pista">
            Problem with this order? Message us
          </a>
        </section>
      </div>
    </div>
  );
}
