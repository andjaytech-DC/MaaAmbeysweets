"use client";
import { Badge, Column, FieldDef, ResourcePage } from "@/components/admin/marketing/kit";
import { CREATOR_STATUSES, CREATOR_TYPES, label } from "@/lib/marketing";

type Profile = { platform: string; url: string };
type Creator = {
  id: number; name: string; photo_url: string | null; type: string; status: string; blog_name: string | null; blog_url: string | null;
  instagram_url: string | null; youtube_url: string | null; facebook_url: string | null; other_profiles: string[]; email: string | null; phone: string | null;
  city: string | null; state: string | null; country: string | null; audience_size: number | null; audience_note: string | null; profiles?: Profile[];
};

const FIELDS: FieldDef[] = [
  { name: "name", label: "Creator name", required: true },
  { name: "type", label: "Creator type", type: "select", options: CREATOR_TYPES },
  { name: "status", label: "Status", type: "select", options: CREATOR_STATUSES },
  { name: "photo", label: "Profile photograph", type: "image", help: "JPG, PNG or WebP, up to 5 MB." },
  { name: "blog_name", label: "Blog name" },
  { name: "blog_url", label: "Blog URL", placeholder: "https://" },
  { name: "instagram_url", label: "Instagram profile", placeholder: "@name or full link" },
  { name: "youtube_url", label: "YouTube channel", placeholder: "@name or full link" },
  { name: "facebook_url", label: "Facebook page", placeholder: "name or full link" },
  { name: "other_profiles", label: "Other social profiles", type: "textarea", help: "One link per line." },
  { name: "email", label: "Email", type: "email", help: "Private. Never shown on the website." },
  { name: "phone", label: "Business contact number", type: "tel", help: "Private." },
  { name: "city", label: "City" }, { name: "state", label: "State" }, { name: "country", label: "Country" },
  { name: "language", label: "Preferred language" },
  { name: "content_category", label: "Content category", placeholder: "e.g. Street food, home cooking" },
  { name: "audience_size", label: "Audience size", type: "number", help: "Only what the creator told you. Leave empty if unknown." },
  { name: "audience_note", label: "Where did that number come from?", placeholder: "e.g. Creator-reported, Nov 2026" },
  { name: "avg_views", label: "Average views (if provided)", type: "number" },
  { name: "engagement_note", label: "Engagement information (if provided)" },
  { name: "collaboration_preferences", label: "Collaboration preferences", type: "textarea" },
  { name: "proposed_price", label: "Proposed pricing (₹)", type: "number", step: "0.01" },
  { name: "internal_notes", label: "Internal notes", type: "textarea", help: "Only visible to the shop team." },
];

const link = (u: string | null, text: string) => (u ? <a key={text} href={u} target="_blank" rel="noopener noreferrer" className="mr-2 text-blue-700 underline">{text}</a> : null);

const COLS: Column<Creator>[] = [
  { head: "Creator", cell: (c) => (
    <div className="flex items-center gap-2">
      {c.photo_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-stone-200 text-sm font-bold">{c.name.slice(0, 1)}</span>}
      <div><p className="font-semibold">{c.name}</p><p className="text-xs text-stone-500">{label(CREATOR_TYPES, c.type)}</p></div>
    </div>
  ) },
  { head: "Where", cell: (c) => [c.city, c.state].filter(Boolean).join(", ") || <span className="text-stone-400">Not given</span> },
  { head: "Links", cell: (c) => <>{link(c.blog_url, "Blog")}{link(c.instagram_url, "Instagram")}{link(c.youtube_url, "YouTube")}{link(c.facebook_url, "Facebook")}{!c.blog_url && !c.instagram_url && !c.youtube_url && !c.facebook_url && <span className="text-stone-400">None</span>}</> },
  { head: "Audience", cell: (c) => c.audience_size ? <><span className="font-medium">{c.audience_size.toLocaleString("en-IN")}</span><span className="block text-xs text-stone-500">{c.audience_note || "Source not recorded"}</span></> : <span className="text-stone-400">Not provided</span> },
  { head: "Status", cell: (c) => <Badge s={c.status} text={label(CREATOR_STATUSES, c.status)} /> },
];

export default function Creators() {
  return (
    <ResourcePage<Creator>
      title="Creator directory"
      help="Bloggers, YouTubers and influencers you work with. Audience numbers are only ever what the creator told you; nothing is estimated here. Contact details stay private."
      endpoint="/admin/marketing/creators"
      fields={FIELDS}
      columns={COLS}
      multipart
      search
      createLabel="Add creator"
      filters={[{ name: "status", label: "Status", options: CREATOR_STATUSES }, { name: "type", label: "Type", options: CREATOR_TYPES }]}
      defaults={{ type: "food_blogger", status: "new", country: "India" }}
      mapIn={(c) => ({ ...c, other_profiles: (c.other_profiles ?? []).join("\n") })}
      empty="No creators yet. Add one, or approve an application."
    />
  );
}
