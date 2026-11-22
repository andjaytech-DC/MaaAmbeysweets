"use client";
import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { Product } from "@/lib/api";

/** Printable label: barcode (or SKU as Code128 when no barcode) + QR that opens the product page. */
export default function BarcodeLabel({ p }: { p: Pick<Product, "id" | "name" | "sku" | "barcode"> }) {
  const svg = useRef<SVGSVGElement>(null);
  const [qr, setQr] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const code = p.barcode || p.sku;
    try {
      const isEan = /^\d{13}$/.test(code);
      if (svg.current) JsBarcode(svg.current, code, { format: isEan ? "EAN13" : "CODE128", height: 50, fontSize: 14, margin: 4 });
      setErr("");
    } catch {
      setErr("This barcode value is not valid for the chosen format.");
    }
    QRCode.toDataURL(`${window.location.origin}/products/${p.id}`, { margin: 1, width: 160 }).then(setQr).catch(() => {});
  }, [p.id, p.sku, p.barcode]);

  return (
    <div>
      <div className="inline-block rounded border border-stone-300 bg-white p-3 text-center">
        <p className="mb-1 max-w-[220px] truncate text-sm font-semibold">{p.name}</p>
        <svg ref={svg} />
        {qr && /* eslint-disable-next-line @next/next/no-img-element */ <img src={qr} alt="QR code" className="mx-auto mt-2 h-24 w-24" />}
        <p className="text-xs text-stone-500">SKU {p.sku}</p>
      </div>
      {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
      <div className="no-print mt-2"><button type="button" onClick={() => window.print()} className="rounded border px-3 py-1 text-sm hover:bg-stone-100">Print label</button></div>
    </div>
  );
}
