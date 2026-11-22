// Same API the website uses. Set EXPO_PUBLIC_API_URL in mobile/.env (see README).
export const API = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:8000/api"; // 10.0.2.2 = the PC, seen from the Android emulator

export type WeightOption = { label: string; price: number | string };
export type Product = {
  id: number; name: string; price: string; mrp: string | null; unit: string | null;
  shelf_life: string | null; ingredients: string | null; description: string | null;
  weight_options: WeightOption[] | null; stock: number; hamper_capacity?: number | null;
  images: { url: string }[]; batch?: { made_on: string; expires_on: string } | null;
};
export type ShopConfig = {
  delivery_fee: number; free_delivery_above: number; min_order: number; service_pincodes: string[]; service_area_label: string;
  point_value: number; min_redeem: number; max_redeem_percent: number;
};
export type Offer = { code: string; title: string; type: "percent" | "flat"; value: string; min_order: string; ends_at: string | null };
export type ReviewList = { average: number; count: number; reviews: { name: string; rating: number; comment: string | null; photos: string[] }[] };
export type Loyalty = { balance: number; history: { type: string; points: number; created_at: string }[] };
export type Order = {
  number: string; status: string; total: string; phone: string; created_at: string;
  items: { name: string; option_label: string | null; hamper_choices?: { name: string; count: number }[] | null; qty: number; line_total: string }[];
  points_discount?: string; discount?: string; is_gift?: boolean; recipient_name?: string | null;
  events: { status: string; at: string }[];
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors: Record<string, string[]> = {}) { super(message); }
}

export async function api<T>(path: string, opts: { method?: string; token?: string | null; body?: object | FormData } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData;
  if (opts.body && !isForm) headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { method: opts.method ?? "GET", headers, body: opts.body ? (isForm ? (opts.body as FormData) : JSON.stringify(opts.body)) : undefined });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check your internet connection.");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json.message ?? "Something went wrong", json.errors ?? {});
  return json as T;
}

export const rupees = (v: string | number) => `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const priceFor = (p: Product, option: string | null) => Number(p.weight_options?.find((o) => o.label === option)?.price ?? p.price);
export const firstError = (e: unknown) => (e instanceof ApiError ? Object.values(e.errors).flat()[0] ?? e.message : "Something went wrong");

export const theme = { ink: "#17301F", kesar: "#F2A900", gulab: "#B3124B", pista: "#EEF4E3", paper: "#FCFBF6" };
