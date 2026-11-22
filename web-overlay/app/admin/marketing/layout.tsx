import { MarketingNav } from "@/components/admin/marketing/kit";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingNav />
      {children}
    </>
  );
}
