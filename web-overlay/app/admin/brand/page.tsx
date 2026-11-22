"use client";
import BrandManager from "@/components/admin/BrandManager";
import { useAdminToken } from "@/lib/auth";

export default function Brand() {
  const token = useAdminToken();
  if (!token) return null;
  return <BrandManager token={token} />;
}
