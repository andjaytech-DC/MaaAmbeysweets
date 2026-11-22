export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
// 919999999999 was the setup placeholder; treat it as "not configured" so the shop's real number is always used.
const WA_ENV = process.env.NEXT_PUBLIC_WHATSAPP;
export const WHATSAPP = WA_ENV && WA_ENV !== "919999999999" ? WA_ENV : "919140888276";

export type Category = {
  id: number; name: string; slug: string;
  image_url?: string | null; image_srcset?: string | null; image_alt?: string | null; image_position?: string; is_active?: boolean;
};
export type Img = { id: number; url: string; srcset?: string | null; thumb_url?: string; alt?: string | null; is_primary?: boolean };
export type WeightOption = { label: string; price: number | string };
export type OrderStatus = "received" | "preparing" | "ready" | "dispatched" | "delivered" | "cancelled";
export type Order = {
  id: number;
  number: string;
  status: OrderStatus;
  customer_name: string;
  phone: string;
  email: string | null;
  fulfilment: "delivery" | "pickup";
  address_line: string | null;
  city: string | null;
  pincode: string | null;
  notes: string | null;
  subtotal: string;
  coupon_code: string | null;
  discount: string;
  points_redeemed: number;
  points_discount: string;
  is_gift: boolean;
  recipient_name: string | null;
  recipient_phone: string | null;
  gift_message: string | null;
  delivery_fee: string;
  total: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  items: { product_id: number | null; name: string; option_label: string | null; hamper_choices?: { product_id: number; name: string; count: number }[] | null; unit_price: string; qty: number; line_total: string }[];
  events: { status: OrderStatus; at: string }[];
};
export type Enquiry = {
  id: number; reference: string; name: string; phone: string; email: string | null; occasion: string;
  items_text: string; quantity_text: string; needed_by: string | null; fulfilment: string; city: string | null;
  notes: string | null; contact_via: "whatsapp" | "call" | "email"; status: string; created_at: string;
};
export type Coupon = {
  id: number; code: string; title: string; type: "percent" | "flat"; value: string; min_order: string; max_discount: string | null;
  starts_at: string | null; ends_at: string | null; usage_limit: number | null; used_count: number; is_active: boolean; is_public: boolean;
};
export type Offer = { code: string; title: string; type: "percent" | "flat"; value: string; min_order: string; ends_at: string | null };
export type Customer = { phone: string; name: string; email: string | null; orders_count: number; total_spent: string; last_order_at: string };
export type Summary = {
  from: string; to: string; orders: number; cancelled: number; revenue: number; average_order: number; discounts: number;
  by_status: Record<string, number>; by_fulfilment: Record<string, number>;
  daily: { date: string; orders: number; revenue: number }[];
  top_products: { name: string; qty: string; revenue: string }[];
  expiring: { batch_id: number; product: string | null; sku: string | null; batch_no: string; expires_on: string; quantity_left: number; expired: boolean }[];
  low_stock: { id: number; name: string; sku: string; stock: number }[];
};
export type ShopConfig = {
  delivery_fee: number; free_delivery_above: number; min_order: number; service_pincodes: string[]; service_area_label: string;
  points_per_rupee: number; point_value: number; min_redeem: number; max_redeem_percent: number;
};
export type ReviewList = { average: number; count: number; reviews: { name: string; rating: number; comment: string | null; photos: string[]; created_at: string }[] };
export type AdminReview = { id: number; rating: number; comment: string | null; photos: { id: number; url: string }[]; status: string; created_at: string; user: { name: string; email: string }; product: { name: string } };
export type Batch = { id: number; batch_no: string; made_on: string; expires_on: string; quantity_made: number; quantity_left: number };

export type Product = {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  price: string;
  mrp: string | null;
  unit: string | null;
  shelf_life: string | null;
  ingredients: string | null;
  weight_options: WeightOption[] | null;
  hamper_capacity?: number | null;
  hamper_eligible?: boolean;
  batch?: { made_on: string; expires_on: string } | null;
  stock: number;
  is_active: boolean;
  category_id: number | null;
  category: Category | null;
  images: Img[];
};
export type Page<T> = { data: T[]; current_page: number; last_page: number; total: number };

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;
  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

/** Maps raw HTTP failures to messages a customer can act on. Validation (422) and login (401) text from the server is kept. */
export function friendlyStatus(status: number, serverMessage?: string): string {
  if (status === 429) return "Too many attempts. Please wait a minute and try again.";
  if (status >= 500) return "Something went wrong on our side. Please try again in a moment.";
  if (status === 403) return serverMessage || "You don't have permission to do that.";
  return serverMessage || "Request failed. Please try again.";
}

export async function api<T>(
  path: string,
  opts: { method?: string; token?: string | null; body?: FormData | object } = {}
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) body = opts.body;
  else if (opts.body) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { method: opts.method ?? "GET", headers, body, cache: "no-store" });
  } catch {
    throw new ApiError(0, "We can't reach the server right now. Check your internet connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, friendlyStatus(res.status, json.message), json.errors ?? {});
  return json as T;
}

export const rupees = (v: string | number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(v));

export const fromPrice = (p: Product) =>
  p.weight_options?.length ? Math.min(...p.weight_options.map((o) => Number(o.price))) : Number(p.price);

export const priceFor = (p: Product, label: string | null) =>
  p.weight_options?.length ? Number(p.weight_options.find((o) => o.label === label)?.price ?? fromPrice(p)) : Number(p.price);
