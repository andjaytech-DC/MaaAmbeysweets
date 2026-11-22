"use client";
import MediaManager from "@/components/admin/MediaManager";
import { useAdminToken } from "@/lib/auth";

export default function HeroSlides() {
  const token = useAdminToken();
  if (!token) return null;
  return (
    <MediaManager
      token={token}
      kind="hero"
      heading="Homepage hero slides"
      help="The big pictures that slide across the top of the home page. Add a picture, fill in the title, button and how long it stays, then Publish. Pictures about 1920 px wide look best. If nothing is published, the built-in pictures are shown."
      fields={["title", "subtitle", "cta", "alt", "position", "duration", "mobile"]}
    />
  );
}
