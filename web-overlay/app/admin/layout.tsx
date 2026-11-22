import { Suspense } from "react";
import AdminNav from "@/components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}><AdminNav /></Suspense>
      {children}
    </>
  );
}
