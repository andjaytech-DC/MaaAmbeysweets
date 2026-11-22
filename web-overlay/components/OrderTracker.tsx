import { Order, OrderStatus } from "@/lib/api";

const FLOW: Record<"delivery" | "pickup", { status: OrderStatus; label: string; hint: string }[]> = {
  delivery: [
    { status: "received", label: "Order received", hint: "We have your order." },
    { status: "preparing", label: "Being prepared", hint: "Your sweets are being made and packed." },
    { status: "ready", label: "Packed and ready", hint: "Waiting for the delivery rider." },
    { status: "dispatched", label: "On its way", hint: "Your order has left the shop." },
    { status: "delivered", label: "Delivered", hint: "Enjoy your sweets." },
  ],
  pickup: [
    { status: "received", label: "Order received", hint: "We have your order." },
    { status: "preparing", label: "Being prepared", hint: "Your sweets are being made and packed." },
    { status: "ready", label: "Ready for pickup", hint: "Come to the shop and show your order number." },
    { status: "delivered", label: "Picked up", hint: "Enjoy your sweets." },
  ],
};

const when = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

export default function OrderTracker({ order }: { order: Pick<Order, "status" | "fulfilment" | "events"> }) {
  if (order.status === "cancelled") {
    return <p className="rounded-xl bg-gulab/10 p-4 font-semibold text-gulab">This order was cancelled. Please contact us if this is unexpected.</p>;
  }
  const steps = FLOW[order.fulfilment];
  const current = Math.max(0, steps.findIndex((s) => s.status === order.status));
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => {
        const done = i <= current;
        const at = order.events.find((e) => e.status === s.status)?.at;
        return (
          <li key={s.status} className="relative flex gap-4 pb-6 last:pb-0" aria-current={i === current ? "step" : undefined}>
            {i < steps.length - 1 && <span aria-hidden className={`absolute left-[13px] top-7 h-full w-0.5 ${i < current ? "bg-ink" : "bg-ink/15"}`} />}
            <span aria-hidden className={`relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? "bg-ink text-paper" : "bg-ink/10 text-ink/40"} ${i === current ? "ring-4 ring-kesar" : ""}`}>
              {done ? "✓" : ""}
            </span>
            <div>
              <p className={`font-semibold ${done ? "" : "text-ink/50"}`}>{s.label}{done && at ? <span className="ml-2 text-sm font-normal text-ink/60">{when(at)}</span> : null}</p>
              {i === current && <p className="text-sm text-ink/70">{s.hint}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
