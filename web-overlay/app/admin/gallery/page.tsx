"use client";
import MediaManager from "@/components/admin/MediaManager";
import { useAdminToken } from "@/lib/auth";

export default function GalleryAdmin() {
  const token = useAdminToken();
  if (!token) return null;
  return (
    <MediaManager
      token={token}
      kind="gallery"
      multiple
      heading="Festival gallery"
      help="Photos for the “From our shop” gallery on the home page. You can add many at once. Once at least one gallery photo is published, it replaces the built-in gallery. Use the arrows to change the order."
      fields={["title", "caption", "group", "alt", "position", "schedule"]}
      groupLabel="Category (for example Diwali, Weddings, Daily sweets)"
      groupSuggestions={["Diwali", "Karwa Chauth", "Holi", "Weddings", "Gift boxes", "Daily sweets"]}
    />
  );
}
