"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import BarcodeLabel from "@/components/BarcodeLabel";
import BatchManager from "@/components/BatchManager";
import ProductForm from "@/components/ProductForm";
import { api, Product } from "@/lib/api";
import { useAdminToken } from "@/lib/auth";

export default function EditProduct() {
  return (
    <Suspense fallback={<p className="p-8 text-stone-500">Loading…</p>}>
      <EditProductInner />
    </Suspense>
  );
}

function EditProductInner() {
  const { id } = useParams<{ id: string }>();
  const token = useAdminToken();
  const [p, setP] = useState<Product | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api<Product>(`/admin/products/${id}`, { token }).then(setP).catch((e) => setError(e.message));
  }, [token, id]);

  if (!token) return null;
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/admin/products" className="no-print text-sm text-amber-700 hover:underline">← Back to products</Link>
      <h1 className="no-print mb-6 mt-2 text-2xl font-bold">Edit product</h1>
      {error && <p className="text-red-600">{error}</p>}
      {p && (
        <div className="grid gap-10 lg:grid-cols-[1fr_auto]">
          <div className="no-print"><ProductForm token={token} product={p} /></div>
          <div><h2 className="no-print mb-2 font-semibold">Label</h2><BarcodeLabel p={p} /></div>
        </div>
      )}
      {p && <BatchManager token={token} productId={p.id} />}
    </main>
  );
}
