// Shared labels and types for the Marketing & Creators section.
export type Opt = { value: string; label: string };
const o = (pairs: [string, string][]): Opt[] => pairs.map(([value, label]) => ({ value, label }));

export const CREATOR_TYPES = o([
  ["food_blogger", "Food blogger"], ["youtube_creator", "YouTube creator"], ["instagram_influencer", "Instagram influencer"],
  ["facebook_creator", "Facebook creator"], ["local_food_influencer", "Local food influencer"], ["food_photographer", "Food photographer"],
  ["regional_content_creator", "Regional content creator"],
]);
export const CREATOR_STATUSES = o([
  ["new", "New"], ["contacted", "Contacted"], ["interested", "Interested"], ["negotiating", "Negotiating"],
  ["approved", "Approved"], ["active", "Active"], ["completed", "Completed"], ["rejected", "Rejected"],
]);
export const CAMPAIGN_TYPES = o([
  ["product_tasting_review", "Product tasting and review"], ["festival_promotion", "Festival promotion"], ["wedding_gifting", "Wedding gifting promotion"],
  ["corporate_gifting", "Corporate gifting"], ["local_food_blogger", "Local food blogger campaign"], ["instagram_reels", "Instagram Reels campaign"],
  ["youtube_review", "YouTube review campaign"], ["blog_article", "Blog article campaign"], ["paid_collaboration", "Paid creator collaboration"],
  ["affiliate_promotion", "Affiliate promotion"],
]);
export const CAMPAIGN_STATUSES = o([["draft", "Draft"], ["open", "Open"], ["recruiting", "Recruiting"], ["active", "Active"], ["completed", "Completed"], ["cancelled", "Cancelled"]]);
export const PLATFORMS = o([["instagram", "Instagram"], ["youtube", "YouTube"], ["facebook", "Facebook"], ["blog", "Blog"], ["other", "Other"]]);
export const SAMPLE_STATUSES = o([
  ["requested", "Requested"], ["approved", "Approved"], ["preparing", "Preparing"], ["dispatched", "Dispatched"], ["delivered", "Delivered"],
  ["review_pending", "Review pending"], ["review_submitted", "Review submitted"], ["completed", "Completed"],
]);
export const CONTENT_TYPES = o([
  ["blog_article", "Blog article"], ["youtube_video", "YouTube video"], ["youtube_short", "YouTube Shorts"], ["instagram_reel", "Instagram Reel"],
  ["instagram_post", "Instagram post"], ["facebook_video", "Facebook video"], ["facebook_post", "Facebook post"], ["other", "Other approved content"],
]);
export const METRIC_SOURCES = o([["verified", "Verified (checked by us)"], ["creator_reported", "Reported by the creator"], ["estimated", "Estimate"]]);
export const SOCIAL_PLATFORMS = o([
  ["instagram", "Instagram"], ["youtube", "YouTube"], ["facebook", "Facebook"], ["whatsapp", "WhatsApp"], ["google_business", "Google Business Profile"],
  ["pinterest", "Pinterest"], ["linkedin", "LinkedIn"], ["other", "Other"],
]);
export const COMPENSATION = o([["gifted", "Gifted sweets"], ["paid", "Paid collaboration"], ["affiliate", "Affiliate (discount code + commission)"]]);
export const COLLAB_STATUS_LABEL: Record<string, string> = {
  invited: "Invited", accepted: "Accepted", declined: "Declined", approved: "Approved", content_submitted: "Content submitted",
  content_approved: "Content approved", completed: "Completed", cancelled: "Cancelled",
};
export const label = (opts: Opt[], v: string | null | undefined) => opts.find((x) => x.value === v)?.label ?? (v ?? "").replace(/_/g, " ");

export const MARKETING_LINKS = [
  { href: "/admin/marketing", label: "Dashboard", exact: true },
  { href: "/admin/marketing/creators", label: "Creators" },
  { href: "/admin/marketing/applications", label: "Applications" },
  { href: "/admin/marketing/campaigns", label: "Campaigns" },
  { href: "/admin/marketing/product-sampling", label: "Product sampling" },
  { href: "/admin/marketing/reviews", label: "Published reviews" },
  { href: "/admin/marketing/social-channels", label: "Social channels" },
  { href: "/admin/marketing/affiliate-codes", label: "Affiliate & discount codes" },
  { href: "/admin/marketing/analytics", label: "Analytics" },
  { href: "/admin/marketing/settings", label: "Settings" },
];

export type SocialChannel = {
  id: number; platform: string; account_name: string; display_name: string | null; profile_url: string; channel_url: string | null;
  image_url?: string | null; description: string | null; sort_order?: number; is_active?: boolean;
};
export type CreatorStory = {
  id: number; creator_name: string; creator_photo_url: string | null; content_type: string; url: string; title: string | null; summary: string | null;
  thumbnail_url: string | null; products: string[]; published_on: string | null; disclosure: string;
};
