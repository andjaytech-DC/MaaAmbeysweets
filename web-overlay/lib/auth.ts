"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ADMIN = "mas_admin_token";
const USER = "mas_user_token";

const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };
const del = (k: string) => { try { localStorage.removeItem(k); } catch {} };

export const getToken = () => get(ADMIN);
export const setToken = (t: string) => set(ADMIN, t);
export const clearToken = () => del(ADMIN);

export const getUserToken = () => get(USER);
export const setUserToken = (t: string) => set(USER, t);
export const clearUserToken = () => del(USER);

/** Returns the admin token, or redirects to the admin login page. */
export function useAdminToken() {
  const router = useRouter();
  const [token, setT] = useState<string | null>(null);
  useEffect(() => {
    const t = getToken();
    if (!t) router.replace("/admin/login");
    else setT(t);
  }, [router]);
  return token;
}

/** Returns the customer token, or redirects to /login. */
export function useCustomerToken() {
  const router = useRouter();
  const [token, setT] = useState<string | null>(null);
  useEffect(() => {
    const t = getUserToken();
    if (!t) router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    else setT(t);
  }, [router]);
  return token;
}

/** Customer token if present; never redirects (guest checkout). */
export function useOptionalUserToken() {
  const [token, setT] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { setT(getUserToken()); setReady(true); }, []);
  return { token, ready };
}
