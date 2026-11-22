"use client";
import { useEffect } from "react";
import { API } from "@/lib/api";

// When a visitor arrives from a creator's link (?ref=CODE), count the visit once per browser session.
// Only the code is sent; nothing about the visitor is stored.
export default function RefTracker() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase();
      if (!ref || !/^[A-Z0-9]{4,30}$/.test(ref)) return;
      const key = `maa_ref_${ref}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      fetch(`${API}/marketing/click`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ ref }), keepalive: true }).catch(() => {});
    } catch { /* storage blocked: skip tracking */ }
  }, []);
  return null;
}
