'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StorefrontAPI, customerStore, cartStore } from '@/lib/storefront';
import { LinkButton, cx } from '@/components/ui';
import { CheckIcon } from '@/components/ui/icons';
import { STORE_NAME } from '@/lib/format';

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
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckIcon className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Thank you for your order!</h1>
        <p className="mt-2 text-sm text-gray-600">
          Order <span className="font-medium text-gray-900">{order.name}</span> is confirmed. A receipt is on its way to your inbox.
        </p>

        <div className="mt-6 w-full rounded-lg border border-gray-200 bg-white p-4 text-left text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total</span>
            <span className="font-semibold text-gray-900">{fmt(order.totalPrice)}</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Status: {order.financialStatus} · {order.fulfillmentStatus}
          </div>
        </div>

        <div className="mt-6 w-full space-y-3">
          <LinkButton href="/shop" className="w-full">Continue shopping</LinkButton>
          <div className="flex items-center justify-center gap-4 text-sm">
            <a
              href={order.statusPageUrl}
              target="_blank"
              rel="noopener"
              className="font-medium text-gray-700 underline-offset-2 hover:underline"
            >
              Track order
            </a>
            <span className="text-gray-300">·</span>
            <Link
              href="/shop/account"
              className="font-medium text-gray-700 underline-offset-2 hover:underline"
            >
              View your orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (polling) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
          <span
            className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"
            aria-hidden
          />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Finalizing your order…</h1>
        <p className="mt-2 text-sm text-gray-600">
          Hang tight, this can take a moment.
        </p>
        <p className="mt-1 text-xs text-gray-400">Checking with {STORE_NAME} ({tries})</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
        <CheckIcon className="h-10 w-10" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Thank you for your order!</h1>
      <p className="mt-2 text-sm text-gray-600">
        Your purchase is complete. We couldn&apos;t auto-load the details here — sign in or check your email for the confirmation.
      </p>

      <div className="mt-6 w-full space-y-3">
        <LinkButton href="/shop" className="w-full">Continue shopping</LinkButton>
        <Link
          href="/shop/account"
          className="block text-sm font-medium text-gray-700 underline-offset-2 hover:underline"
        >
          View your orders
        </Link>
      </div>
    </div>
  );
}
