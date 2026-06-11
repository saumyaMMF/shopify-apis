'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StorefrontAPI, customerStore } from '@/lib/storefront';

// For OAuth, browser must go DIRECTLY to the API origin (tunnel) so PKCE cookies
// stay on the same domain as the Shopify callback redirect.
const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ||
  'https://dealt-occupations-money-zshops.trycloudflare.com';
const AUTH_LOGIN = `${API_ORIGIN}/api/storefront/customer/auth/login`;
const AUTH_REFRESH = `${API_ORIGIN}/api/storefront/customer/auth/refresh`;
const AUTH_LOGOUT = `${API_ORIGIN}/api/storefront/customer/auth/logout`;

export default function Account() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Capture access_token from URL fragment after OAuth callback redirect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash.startsWith('#access_token=')) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const t = params.get('access_token');
      if (t) {
        customerStore.set(t);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
    const t = customerStore.get();
    setToken(t);
    if (t) load(t);
  }, []);

  async function load(_t: string) {
    try {
      const [p, o] = await Promise.all([StorefrontAPI.customerProfile(), StorefrontAPI.customerOrders()]);
      setProfile(p);
      setOrders(o.edges?.map((e: any) => e.node) ?? []);
      setErr(null);
    } catch (e: any) {
      // Try refresh
      const ok = await tryRefresh();
      if (ok) {
        try {
          const [p, o] = await Promise.all([StorefrontAPI.customerProfile(), StorefrontAPI.customerOrders()]);
          setProfile(p);
          setOrders(o.edges?.map((e: any) => e.node) ?? []);
          setErr(null);
        } catch (e2: any) {
          setErr(e2?.response?.data?.message ?? 'Session expired');
        }
      } else {
        setErr(e?.response?.data?.message ?? 'Session expired. Sign in again.');
      }
    }
  }

  async function tryRefresh(): Promise<boolean> {
    try {
      const r = await fetch(AUTH_REFRESH, { method: 'POST', credentials: 'include' });
      if (!r.ok) return false;
      const j = await r.json();
      if (j.accessToken) {
        customerStore.set(j.accessToken);
        setToken(j.accessToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  function login() {
    window.location.href = AUTH_LOGIN;
  }

  async function logout() {
    setBusy(true);
    try {
      await fetch(AUTH_LOGOUT, { method: 'POST', credentials: 'include' });
    } finally {
      customerStore.clear();
      setToken(null);
      setProfile(null);
      setOrders([]);
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">Sign in</h1>
        <p className="text-sm text-gray-600">Continue with your store account to view orders, addresses, returns.</p>
        <button onClick={login} className="w-full bg-black text-white py-3 rounded font-medium">
          Sign in with test store
        </button>
        <p className="text-xs text-gray-400">You'll be redirected to a secure Shopify page.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {err && <div className="bg-red-50 text-red-700 text-xs p-2 rounded">{err}</div>}

      {profile && (
        <section>
          <h1 className="text-xl font-bold">Hi, {profile.firstName ?? profile.displayName ?? 'shopper'}</h1>
          <p className="text-sm text-gray-600">{profile.emailAddress?.emailAddress}</p>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2">Orders</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-500">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/shop/account/orders/${encodeURIComponent(o.id)}`}
                className="block border rounded p-3 text-sm hover:bg-gray-50"
              >
                <div className="flex justify-between">
                  <span className="font-medium">{o.name}</span>
                  <span className="text-gray-500 text-xs">{new Date(o.processedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>{o.financialStatus} · {o.fulfillmentStatus}</span>
                  <span>
                    {o.totalPrice.currencyCode === 'INR' ? '₹' : ''}
                    {Number(o.totalPrice.amount).toFixed(2)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <button onClick={logout} disabled={busy} className="w-full border py-2 rounded text-sm">
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
}
