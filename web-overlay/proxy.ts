import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

/**
 * Product pages stream their content, so a notFound() inside them still sends HTTP 200.
 * Ask the API first and answer with a real 404 when the product does not exist.
 */
export async function proxy(req: NextRequest) {
  const id = req.nextUrl.pathname.split("/")[2];
  if (id) {
    try {
      const r = await fetch(`${API}/products/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (r.status === 404) return NextResponse.rewrite(new URL("/product-not-found", req.url), { status: 404 });
    } catch {
      // API unreachable: let the page render its own "could not be loaded" message
    }
  }
  return NextResponse.next();
}

export const config = { matcher: "/products/:id" };
