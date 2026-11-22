"use client";
import Link from "next/link";
import ProductForm from "@/components/ProductForm";
import { useAdminToken } from "@/lib/auth";

export default function NewProduct() {
  const token = useAdminToken();
  if (!token) return null;
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/admin/products" className="text-sm text-amber-700 hover:underline">← Back to products</Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">Add product</h1>
      <ProductForm token={token} />
    </main>
  );
}
