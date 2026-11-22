"use client";
import MediaManager from "@/components/admin/MediaManager";
import { useAdminToken } from "@/lib/auth";

export default function Banners() {
  const token = useAdminToken();
  if (!token) return null;
  return (
    <MediaManager
      token={token}
      kind="banner"
      heading="Promotional banners"
      help="Banners for offers and festivals. Set the dates and they appear and disappear by themselves. Only banners that are published, switched on and inside their dates are shown to customers."
      fields={["title", "subtitle", "cta", "alt", "position", "schedule", "mobile"]}
    />
  );
}
