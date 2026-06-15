'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StorefrontAPI, customerStore, apiErrorMessage } from '@/lib/storefront';
import { money, formatDate } from '@/lib/format';
import { Button, LinkButton, Skeleton, EmptyState, ErrorState, Spinner } from '@/components/ui';
import { UserIcon, ChevronRight, BagIcon } from '@/components/ui/icons';

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

// For OAuth, browser must go DIRECTLY to the API origin (tunnel) so PKCE cookies
// stay on the same domain as the Shopify callback redirect.
const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ||
  'https://ment-thomas-completely-ultra.trycloudflare.com';
const AUTH_LOGIN = `${API_ORIGIN}/api/storefront/customer/auth/login`;
const AUTH_REFRESH = `${API_ORIGIN}/api/storefront/customer/auth/refresh`;
const AUTH_LOGOUT = `${API_ORIGIN}/api/storefront/customer/auth/logout`;

export default function Account() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
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
          setErr(apiErrorMessage(e2));
        }
      } else {
        setErr(apiErrorMessage(e));
      }
    } finally {
      setLoading(false);
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

  // ---------- Logged out ----------
  if (!token) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-700">
            <UserIcon className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold">Sign in to your account</h1>
            <p className="text-sm text-gray-500">
              Continue with your store account to view orders, addresses and returns.
            </p>
          </div>
          <Button size="lg" onClick={login}>
            Sign in with test store
          </Button>
          <p className="text-xs text-gray-400">You&rsquo;ll be redirected to a secure Shopify page.</p>
        </div>
      </div>
    );
  }

  // ---------- Error ----------
  if (err && !profile) {
    return (
      <div className="p-4">
        <ErrorState message={err} onRetry={() => token && load(token)} />
        <Button variant="outline" size="lg" onClick={logout} disabled={busy} className="mt-2">
          {busy ? <Spinner className="h-4 w-4" /> : 'Sign out'}
        </Button>
      </div>
    );
  }

  // ---------- Loading ----------
  if (loading && !profile) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const actions = [
    { href: '/shop/account', label: 'Orders', desc: 'Track and view past purchases' },
    { href: '/shop/account/profile', label: 'Profile', desc: 'Manage your personal details' },
    { href: '/shop/account/addresses', label: 'Addresses', desc: 'Shipping and billing addresses' },
  ];

  return (
    <div className="space-y-6 p-4">
      {err && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>
      )}

      {/* Profile header */}
      {profile && (
        <section className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700">
            <UserIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">
              Hi, {profile.firstName ?? profile.displayName ?? 'shopper'}
            </h1>
            {profile.emailAddress?.emailAddress && (
              <p className="truncate text-sm text-gray-500">{profile.emailAddress.emailAddress}</p>
            )}
          </div>
        </section>
      )}

      {/* Account actions */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Account
        </h2>
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {actions.map((a, i) => (
            <Link
              key={a.href + a.label}
              href={a.href}
              className={cx(
                'flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50',
                i > 0 && 'border-t border-gray-100',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{a.label}</div>
                <div className="truncate text-xs text-gray-500">{a.desc}</div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
            </Link>
          ))}
        </div>
      </section>

      {/* Orders */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Recent orders
        </h2>
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <EmptyState
              icon={<BagIcon className="h-10 w-10" />}
              title="No orders yet"
              description="When you place an order it will show up here."
              action={<LinkButton href="/shop">Start shopping</LinkButton>}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/shop/account/orders/${encodeURIComponent(o.id)}`}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{o.name}</span>
                    <span className="text-xs text-gray-500">{formatDate(o.processedAt)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-600">
                    <span className="capitalize">
                      {[o.financialStatus, o.fulfillmentStatus]
                        .filter(Boolean)
                        .join(' · ')
                        .toLowerCase()}
                    </span>
                    <span className="font-medium text-gray-900">{money(o.totalPrice)}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <Button variant="outline" size="lg" onClick={logout} disabled={busy}>
        {busy ? <Spinner className="h-4 w-4" /> : 'Sign out'}
      </Button>
    </div>
  );
}
