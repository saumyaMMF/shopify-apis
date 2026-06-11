'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StorefrontAPI, customerStore } from '@/lib/storefront';

export default function Account() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = customerStore.get();
    setToken(t);
    if (t) load();
  }, []);

  async function load() {
    try {
      const [p, o] = await Promise.all([StorefrontAPI.customerProfile(), StorefrontAPI.customerOrders()]);
      setProfile(p);
      setOrders(o.edges?.map((e: any) => e.node) ?? []);
      setErr(null);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Failed to load. Token may be expired.');
    }
  }

  function saveToken() {
    if (!input.trim()) return;
    customerStore.set(input.trim());
    setToken(input.trim());
    setInput('');
    load();
  }

  function logout() {
    customerStore.clear();
    setToken(null);
    setProfile(null);
    setOrders([]);
  }

  if (!token) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">Sign in</h1>
        <p className="text-sm text-gray-600">
          Paste your Customer Account API token (starts with <code className="bg-gray-100 px-1">shcat_</code>).
        </p>
        <p className="text-xs text-gray-500">
          Get one at:{' '}
          <a href="https://test-store-uzhiv0ib.myshopify.com/account/login" target="_blank" className="underline">
            store login
          </a>{' '}
          → DevTools → Network → <code>customer/api</code> request → <code>Authorization</code> header.
        </p>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="shcat_..."
          className="w-full px-3 py-2 border rounded text-xs h-32 font-mono"
        />
        <button onClick={saveToken} className="w-full bg-black text-white py-2 rounded">Sign in</button>
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
              <div key={o.id} className="border rounded p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{o.name}</span>
                  <span className="text-gray-500 text-xs">{new Date(o.processedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>{o.financialStatus} · {o.fulfillmentStatus}</span>
                  <span>{o.totalPrice.currencyCode === 'INR' ? '₹' : ''}{Number(o.totalPrice.amount).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <button onClick={logout} className="w-full border py-2 rounded text-sm">Sign out</button>
    </div>
  );
}
