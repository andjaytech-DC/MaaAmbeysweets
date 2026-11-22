import type { Metadata } from "next";
import CreatorRespond from "@/components/CreatorRespond";

// Private link sent to one creator. Not for search engines.
export const metadata: Metadata = { title: "Your collaboration | Maa Ambey Sweets", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <CreatorRespond token={token} />;
}
