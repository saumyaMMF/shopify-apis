'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StorefrontAPI, customerStore, cartStore } from '@/lib/storefront';

export default function ThankYou() {
  const [order, setOrder] = useState<any>(null);
  const [polling, setPolling] = useState(true);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    // Clear cart — payment done, fresh basket next time
    cartStore.clear();
    window.dispatchEvent(new CustomEvent('cart:update', { detail: { totalQuantity: 0 } }));

    if (!customerStore.get()) {
      setPolling(false);
      return;
    }

    let stopped = false;
    let attempts = 0;
    const start = Date.now();

    async function poll() {
      if (stopped) return;
      attempts++;
      setTries(attempts);
      try {
        const res = await StorefrontAPI.customerOrders();
        const latest = res.edges?.[0]?.node;
        if (latest) {
          // Order placed within last 5 min counts as "this checkout"
          const processedMs = new Date(latest.processedAt).getTime();
          if (Date.now() - processedMs < 5 * 60 * 1000) {
            setOrder(latest);
            setPolling(false);
            return;
          }
        }
      } catch {}
      if (Date.now() - start > 60_000 || attempts > 15) {
        setPolling(false);
        return;
      }
      setTimeout(poll, 4000);
    }
    poll();
    return () => { stopped = true; };
  }, []);

  if (order) {
    const fmt = (m: any) => (m.currencyCode === 'INR' ? '₹' : '') + Number(m.amount).toFixed(2);
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">Thank you!</h1>
        <p className="text-sm text-gray-600">Order {order.name} confirmed.</p>
        <div className="border rounded p-3 text-sm space-y-1">
          <div className="flex justify-between"><span>Total</span><span>{fmt(order.totalPrice)}</span></div>
          <div className="text-xs text-gray-500">Status: {order.financialStatus} · {order.fulfillmentStatus}</div>
        </div>
        <div className="flex gap-2">
          <a href={order.statusPageUrl} target="_blank" rel="noopener" className="flex-1 border py-2 rounded text-center text-sm">View order</a>
          <Link href="/shop/account" className="flex-1 border py-2 rounded text-center text-sm">My orders</Link>
        </div>
        <Link href="/shop" className="block w-full bg-black text-white py-3 rounded text-center font-medium">Keep shopping</Link>
      </div>
    );
  }

  if (polling) {
    return (
      <div className="p-6 text-center space-y-3">
        <div className="text-4xl">🎉</div>
        <h1 className="text-xl font-bold">Finalizing your order…</h1>
        <p className="text-sm text-gray-600">Hang tight, this can take a moment. ({tries})</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-center space-y-4">
      <h1 className="text-xl font-bold">Thanks for your purchase!</h1>
      <p className="text-sm text-gray-600">
        We couldn't auto-load the order details (you may not be signed in). Check your email for confirmation.
      </p>
      <Link href="/shop/account" className="block w-full border py-2 rounded text-sm">Sign in to view orders</Link>
      <Link href="/shop" className="block w-full bg-black text-white py-3 rounded font-medium">Continue shopping</Link>
    </div>
  );
}
