"use client";
import { Badge, Column, FieldDef, ResourcePage, useAdmin, useLookups } from "@/components/admin/marketing/kit";
import { CONTENT_TYPES, label, METRIC_SOURCES } from "@/lib/marketing";

type Content = {
  id: number; creator_id: number; campaign_id: number | null; content_type: string; url: string; title: string | null; summary: string | null; thumbnail_url: string | null;
  approval_status: string; usage_permission: boolean; is_featured: boolean; views: number | null; metrics_source: string | null; submitted_by: string;
  creator?: { name: string }; campaign?: { name: string } | null; products?: { id: number; name: string }[];
};

const FIELDS: FieldDef[] = [
  { name: "creator_id", label: "Creator", type: "select", lookup: "creators", required: true },
  { name: "campaign_id", label: "Campaign", type: "select", lookup: "campaigns", blankLabel: "None" },
  { name: "content_type", label: "Content type", type: "select", options: CONTENT_TYPES, required: true },
  { name: "url", label: "Link to the content", placeholder: "https://", required: true, help: "Blog, YouTube, Instagram or Facebook link. Instagram Story: add the profile or highlight link, since stories expire." },
  { name: "published_on", label: "Published date", type: "date" },
  { name: "title", label: "Review title" },
  { name: "summary", label: "Review summary", type: "textarea", help: "A short line of your own. Do not paste someone else's full text." },
  { name: "thumbnail", label: "Thumbnail", type: "image", help: "Upload only a picture you have the right to use." },
  { name: "product_ids", label: "Products reviewed", type: "multicheck", lookup: "products" },
  { name: "approval_status", label: "Approval status", type: "select", options: [{ value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }] },
  { name: "usage_permission", label: "The creator has given permission to show this on our website", type: "checkbox" },
  { name: "permission_note", label: "How was permission given?", placeholder: "e.g. WhatsApp message, 3 Nov" },
  { name: "is_featured", label: "Feature on the website (needs approval and permission)", type: "checkbox" },
  { name: "featured_order", label: "Order on the website (lowest first)", type: "number" },
  { name: "views", label: "Views", type: "number" }, { name: "likes", label: "Likes", type: "number" }, { name: "comments", label: "Comments", type: "number" },
  { name: "shares", label: "Shares", type: "number" }, { name: "clicks", label: "Link clicks", type: "number" },
  { name: "metrics_source", label: "Where do these numbers come from?", type: "select", options: METRIC_SOURCES, help: "Required if you enter any number above. They are never mixed in analytics." },
  { name: "metrics_note", label: "Note on the numbers" },
];

const COLS: Column<Content>[] = [
  { head: "Content", cell: (c) => (
    <div className="flex items-center gap-2">
      {c.thumbnail_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.thumbnail_url} alt="" className="h-12 w-16 rounded object-cover" /> : <span aria-hidden className="grid h-12 w-16 place-items-center rounded bg-stone-200 text-xs">No image</span>}
      <div><p className="font-semibold">{c.title || label(CONTENT_TYPES, c.content_type)}</p><a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 underline">Open {label(CONTENT_TYPES, c.content_type).toLowerCase()}</a></div>
    </div>
  ) },
  { head: "Creator", cell: (c) => <div>{c.creator?.name}<span className="block text-xs text-stone-500">{c.campaign?.name ?? "No campaign"}{c.submitted_by === "creator" ? " · sent by creator" : ""}</span></div> },
  { head: "Products", cell: (c) => (c.products ?? []).map((p) => p.name).join(", ") || <span className="text-stone-400">—</span> },
  { head: "Approval", cell: (c) => <Badge s={c.approval_status} /> },
  { head: "Reuse permission", cell: (c) => (c.usage_permission ? <Badge s="approved" text="Given" /> : <Badge s="pending" text="Not given" />) },
  { head: "On website", cell: (c) => (c.is_featured ? <Badge s="active" text="Featured" /> : <span className="text-stone-400">No</span>) },
  { head: "Views", cell: (c) => (c.views != null ? <>{c.views.toLocaleString("en-IN")}<span className="block text-xs text-stone-500">{label(METRIC_SOURCES, c.metrics_source)}</span></> : <span className="text-stone-400">Not entered</span>) },
];

export default function Reviews() {
  const { token, call } = useAdmin();
  const lookups = useLookups(call, !!token);
  return (
    <ResourcePage<Content>
      title="Published reviews"
      help="Links to what creators published about your sweets. A review only appears on your website when it is approved, the creator has given permission, and you have switched on Feature. Always say where any numbers came from."
      endpoint="/admin/marketing/content"
      fields={FIELDS}
      columns={COLS}
      multipart
      arrayKeys={["product_ids"]}
      lookups={lookups}
      createLabel="Add review"
      filters={[{ name: "approval_status", label: "Approval", options: [{ value: "pending", label: "Pending" }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }] }]}
      defaults={{ approval_status: "pending", content_type: "instagram_reel", product_ids: [], usage_permission: false, is_featured: false }}
      mapIn={(c) => ({ ...c, product_ids: (c.products ?? []).map((p) => String(p.id)), creator_id: String(c.creator_id), campaign_id: c.campaign_id ? String(c.campaign_id) : "", published_on: (c as unknown as Record<string, string>).published_on ?? "" })}
      empty="No reviews yet. Creators can send their links from their private campaign page, or you can add them here."
    />
  );
}
