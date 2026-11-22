"use client";
import { Badge, Column, FieldDef, ResourcePage } from "@/components/admin/marketing/kit";
import { label, SOCIAL_PLATFORMS, SocialChannel } from "@/lib/marketing";

const FIELDS: FieldDef[] = [
  { name: "platform", label: "Platform", type: "select", options: SOCIAL_PLATFORMS, required: true },
  { name: "account_name", label: "Account name", required: true, placeholder: "e.g. the @handle or page name" },
  { name: "display_name", label: "Display name", help: "How it is labelled on the website. Optional." },
  { name: "profile_url", label: "Profile URL", type: "url", required: true, placeholder: "https://", help: "Enter your real link. The website shows exactly what you put here." },
  { name: "channel_url", label: "Channel URL", type: "url", help: "Optional second link, e.g. a YouTube channel page." },
  { name: "image", label: "Profile image", type: "image" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "sort_order", label: "Display order", type: "number", help: "Lowest number first." },
  { name: "is_active", label: "Show on the website", type: "checkbox" },
];

const COLS: Column<SocialChannel>[] = [
  { head: "Order", cell: (c) => c.sort_order },
  { head: "Account", cell: (c) => (
    <div className="flex items-center gap-2">
      {c.image_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.image_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-stone-200 text-xs font-bold">{c.platform.slice(0, 2).toUpperCase()}</span>}
      <div><p className="font-semibold">{c.display_name || c.account_name}</p><p className="text-xs text-stone-500">{label(SOCIAL_PLATFORMS, c.platform)} · {c.account_name}</p></div>
    </div>
  ) },
  { head: "Link", cell: (c) => <a href={c.profile_url} target="_blank" rel="noopener noreferrer" className="break-all text-blue-700 underline">{c.profile_url}</a> },
  { head: "Visible", cell: (c) => (c.is_active ? <Badge s="active" text="Shown" /> : <Badge s="draft" text="Hidden" />) },
];

export default function SocialChannels() {
  return (
    <ResourcePage<SocialChannel>
      title="Social media channels"
      help="Your official accounts. They appear in the website header, footer, Contact page and Creator Partnership page, in the order below. Nothing is pre-filled: only links you add are shown, and a hidden account is kept but not displayed."
      endpoint="/admin/marketing/social-channels"
      fields={FIELDS}
      columns={COLS}
      multipart
      createLabel="Add account"
      defaults={{ platform: "instagram", is_active: true }}
      mapIn={(c) => ({ ...c, display_name: c.display_name ?? "", channel_url: c.channel_url ?? "", description: c.description ?? "" })}
      empty="No accounts yet. Add your Instagram, YouTube, Facebook and other pages."
    />
  );
}
