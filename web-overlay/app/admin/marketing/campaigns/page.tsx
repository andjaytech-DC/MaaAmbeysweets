"use client";
import Link from "next/link";
import { Badge, Column, FieldDef, fmtDate, inr, ResourcePage, useAdmin, useLookups } from "@/components/admin/marketing/kit";
import { CAMPAIGN_STATUSES, CAMPAIGN_TYPES, label, PLATFORMS } from "@/lib/marketing";

type Campaign = {
  id: number; name: string; type: string; status: string; description: string | null; objective: string | null; image_url: string | null;
  starts_at: string | null; ends_at: string | null; budget: string | null; target_region: string | null; target_audience: string | null;
  creator_categories: string[] | null; platforms: string[] | null; language: string | null; collaborations_count?: number; products?: { id: number }[];
};

const FIELDS: FieldDef[] = [
  { name: "name", label: "Campaign name", required: true },
  { name: "type", label: "Campaign type", type: "select", options: CAMPAIGN_TYPES, required: true },
  { name: "status", label: "Status", type: "select", options: CAMPAIGN_STATUSES, help: "Set to Open, Recruiting or Active before inviting creators." },
  { name: "image", label: "Campaign image", type: "image" },
  { name: "description", label: "Campaign description", type: "textarea", help: "Creators see this in their invitation." },
  { name: "objective", label: "Campaign objective", type: "textarea" },
  { name: "starts_at", label: "Start date", type: "date" },
  { name: "ends_at", label: "End date", type: "date" },
  { name: "budget", label: "Budget (₹)", type: "number", step: "0.01" },
  { name: "target_region", label: "Target city or region" },
  { name: "target_audience", label: "Target audience" },
  { name: "creator_categories", label: "Preferred creator categories", help: "Comma separated, e.g. street food, home cooking", full: true },
  { name: "platforms", label: "Preferred platforms", type: "multicheck", options: PLATFORMS },
  { name: "language", label: "Preferred language" },
  { name: "product_ids", label: "Products included", type: "multicheck", lookup: "products", help: "Pick from your existing catalogue." },
];

const COLS: Column<Campaign>[] = [
  { head: "Campaign", cell: (c) => <div><p className="font-semibold">{c.name}</p><p className="text-xs text-stone-500">{label(CAMPAIGN_TYPES, c.type)}</p></div> },
  { head: "Dates", cell: (c) => (c.starts_at || c.ends_at ? `${fmtDate(c.starts_at) || "…"} – ${fmtDate(c.ends_at) || "…"}` : <span className="text-stone-400">Not set</span>) },
  { head: "Budget", cell: (c) => (c.budget ? inr(c.budget) : <span className="text-stone-400">—</span>) },
  { head: "Creators", cell: (c) => c.collaborations_count ?? 0 },
  { head: "Status", cell: (c) => <Badge s={c.status} text={label(CAMPAIGN_STATUSES, c.status)} /> },
];

export default function Campaigns() {
  const { token, call } = useAdmin();
  const lookups = useLookups(call, !!token);
  return (
    <ResourcePage<Campaign>
      title="Campaigns"
      help="Create a campaign, then open it to invite creators, send them sweets and collect their links."
      endpoint="/admin/marketing/campaigns"
      fields={FIELDS}
      columns={COLS}
      multipart
      arrayKeys={["product_ids", "platforms", "creator_categories"]}
      lookups={lookups}
      createLabel="New campaign"
      filters={[{ name: "status", label: "Status", options: CAMPAIGN_STATUSES }]}
      defaults={{ status: "draft", type: "product_tasting_review", platforms: [], product_ids: [] }}
      mapIn={(c) => ({ ...c, creator_categories: (c.creator_categories ?? []).join(", "), product_ids: (c.products ?? []).map((p) => String(p.id)), budget: c.budget ?? "" })}
      mapOut={(v) => ({ ...v, creator_categories: String(v.creator_categories ?? "").split(",").map((x) => x.trim()).filter(Boolean) })}
      rowActions={(c) => <Link href={`/admin/marketing/campaigns/${c.id}`} className="rounded bg-stone-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-stone-900">Creators</Link>}
      empty="No campaigns yet."
    />
  );
}
