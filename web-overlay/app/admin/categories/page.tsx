"use client";
import CategoryManager from "@/components/admin/CategoryManager";
import { useAdminToken } from "@/lib/auth";

export default function Categories() {
  const token = useAdminToken();
  if (!token) return null;
  return <CategoryManager token={token} />;
}
