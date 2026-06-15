'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { sf, customerStore, StorefrontAPI, apiErrorMessage } from '@/lib/storefront';
import { money, formatDate } from '@/lib/format';
import { Button, Skeleton, ErrorState, cx } from '@/components/ui';
import { ChevronLeft, BagIcon } from '@/components/ui/icons';

function StatusPill({ label, tone }: { label?: string; tone: 'green' | 'amber' | 'red' | 'gray' }) {
  if (!label) return null;
  const tones: Record<string, string> = {
    green: 'bg-green-50 text-green-700 ring-green-600/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    red: 'bg-red-50 text-red-700 ring-red-600/20',
    gray: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  };
  const pretty = label
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return (
    <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone])}>
      {pretty}
    </span>
  );
}

function financialTone(s?: string): 'green' | 'amber' | 'red' | 'gray' {
  switch (s) {
    case 'PAID':
    case 'PARTIALLY_REFUNDED':
      return 'green';
    case 'PENDING':
    case 'AUTHORIZED':
      return 'amber';
    case 'REFUNDED':
    case 'VOIDED':
      return 'red';
    default:
      return 'gray';
  }
}

function fulfillmentTone(s?: string): 'green' | 'amber' | 'red' | 'gray' {
  switch (s) {
    case 'FULFILLED':
      return 'green';
    case 'PARTIALLY_FULFILLED':
    case 'IN_PROGRESS':
      return 'amber';
    case 'UNFULFILLED':
      return 'gray';
    default:
      return 'gray';
  }
}

function OrderSkeleton() {
  return (
    <div className="p-4 space-y-6 pb-8">
      <Skeleton className="h-4 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3.5 w-48" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-16 w-16 rounded-lg" />
            <div className="flex-1 space-y-2 py-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = decodeURIComponent(id);
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setErr(null);
    setOrder(null);
    StorefrontAPI.customerOrder(orderId)
      .then(setOrder)
      .catch((e) => setErr(apiErrorMessage(e)));
  }

  useEffect(() => {
    if (!customerStore.get()) {
      router.replace('/shop/account');
      return;
    }
    StorefrontAPI.customerOrder(orderId)
      .then(setOrder)
      .catch((e) => setErr(apiErrorMessage(e)));
  }, [orderId, router]);

  async function buyAgain() {
    setBusy(true);
    try {
      const { lines } = await sf
        .get('/customer/order/buy-again', { params: { id: orderId } })
        .then((r) => r.data);
      if (!lines?.length) return;
      const cart = await StorefrontAPI.cartCreate(
        lines.map((l: any) => ({ merchandiseId: l.merchandiseId, quantity: l.quantity })),
      );
      const { cartStore } = await import('@/lib/storefront');
      cartStore.set(cart.id);
      window.dispatchEvent(new CustomEvent('cart:update', { detail: cart }));
      router.push('/shop/cart');
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!confirm('Cancel this order?')) return;
    setBusy(true);
    try {
      await sf.post('/customer/order/cancel', { reason: 'CUSTOMER', refund: true, restock: true }, { params: { id: orderId } });
      const fresh = await StorefrontAPI.customerOrder(orderId);
      setOrder(fresh);
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Cancel failed');
    } finally {
      setBusy(false);
    }
  }

  if (err) {
    return (
      <div className="p-4 pb-8">
        <Link
          href="/shop/account"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to account
        </Link>
        <div className="pt-6">
          <ErrorState message={err} onRetry={load} />
        </div>
      </div>
    );
  }

  if (!order) return <OrderSkeleton />;

  const lines = order.lineItems?.edges?.map((e: any) => e.node) ?? [];
  const canCancel = order.fulfillmentStatus === 'UNFULFILLED' && !order.cancelledAt;

  return (
    <div className="p-4 space-y-6 pb-8">
      <Link
        href="/shop/account"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to account
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{order.name}</h1>
        <p className="text-sm text-gray-500">Placed {formatDate(order.processedAt)}</p>
        <div className="flex flex-wrap gap-2 pt-0.5">
          <StatusPill label={order.financialStatus} tone={financialTone(order.financialStatus)} />
          <StatusPill label={order.fulfillmentStatus} tone={fulfillmentTone(order.fulfillmentStatus)} />
          {order.cancelledAt && <StatusPill label="CANCELLED" tone="red" />}
        </div>
      </div>

      {/* Items */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <h2 className="px-4 pt-4 pb-3 text-sm font-semibold text-gray-900">Items</h2>
        <ul className="divide-y divide-gray-100">
          {lines.map((l: any) => (
            <li key={l.id} className="flex gap-3 px-4 py-3">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                {l.image?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.image.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300">
                    <BagIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-2 text-sm font-medium text-gray-900">{l.title}</div>
                {l.variantTitle && <div className="mt-0.5 text-xs text-gray-500">{l.variantTitle}</div>}
                <div className="mt-1 text-xs text-gray-500">Qty {l.quantity}</div>
              </div>
              <div className="text-sm font-medium text-gray-900">{money(l.totalPrice)}</div>
            </li>
          ))}
        </ul>
      </section>

      {/* Totals */}
      <section className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-sm">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900">{money(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Shipping</span>
            <span className="text-gray-900">{money(order.totalShipping)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Tax</span>
            <span className="text-gray-900">{money(order.totalTax)}</span>
          </div>
        </div>
        <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-base font-semibold text-gray-900">
          <span>Total</span>
          <span>{money(order.totalPrice)}</span>
        </div>
      </section>

      {order.shippingAddress && (
        <section className="text-sm">
          <h2 className="mb-1.5 font-semibold text-gray-900">Ship to</h2>
          <div className="leading-relaxed text-gray-600">
            {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
            {order.shippingAddress.address1}<br />
            {order.shippingAddress.address2 && <>{order.shippingAddress.address2}<br /></>}
            {order.shippingAddress.city}, {order.shippingAddress.territoryCode} {order.shippingAddress.zip}
          </div>
        </section>
      )}

      {order.fulfillments?.nodes?.length > 0 && (
        <section className="text-sm">
          <h2 className="mb-1.5 font-semibold text-gray-900">Tracking</h2>
          <div className="space-y-1">
            {order.fulfillments.nodes.map((f: any) => (
              <div key={f.id} className="text-xs text-gray-600">
                {f.status} · {f.latestShipmentStatus}
                {f.trackingInformation?.[0]?.url && (
                  <a href={f.trackingInformation[0].url} target="_blank" rel="noopener" className="ml-2 font-medium text-gray-900 underline">
                    Track {f.trackingInformation[0].number}
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="space-y-2 border-t border-gray-200 pt-5">
        <Button onClick={buyAgain} disabled={busy} className="w-full">
          {busy ? 'Working…' : 'Buy again'}
        </Button>
        {canCancel && (
          <Button onClick={cancel} disabled={busy} variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-50">
            Cancel order
          </Button>
        )}
        {order.statusPageUrl && (
          <a
            href={order.statusPageUrl}
            target="_blank"
            rel="noopener"
            className="block w-full rounded-md border border-gray-300 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View on Shopify
          </a>
        )}
      </div>
    </div>
  );
}
