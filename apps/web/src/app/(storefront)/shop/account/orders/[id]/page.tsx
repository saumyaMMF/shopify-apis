'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { sf, customerStore, StorefrontAPI } from '@/lib/storefront';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = decodeURIComponent(id);
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!customerStore.get()) {
      router.replace('/shop/account');
      return;
    }
    StorefrontAPI.customerOrder(orderId)
      .then(setOrder)
      .catch((e) => setErr(e?.response?.data?.message ?? 'Failed to load'));
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

  if (err) return <div className="p-4 text-sm text-red-600">{err}</div>;
  if (!order) return <div className="p-4">Loading…</div>;

  const fmt = (m: any) => (m?.currencyCode === 'INR' ? '₹' : '') + Number(m?.amount ?? 0).toFixed(2);
  const lines = order.lineItems?.edges?.map((e: any) => e.node) ?? [];
  const canCancel = order.fulfillmentStatus === 'UNFULFILLED' && !order.cancelledAt;

  return (
    <div className="p-4 space-y-4 pb-8">
      <Link href="/shop/account" className="text-xs underline">← Back to orders</Link>

      <div>
        <h1 className="text-xl font-bold">{order.name}</h1>
        <p className="text-xs text-gray-500">{new Date(order.processedAt).toLocaleString()}</p>
        <p className="text-xs mt-1">
          <span className="font-medium">{order.financialStatus}</span> · {order.fulfillmentStatus}
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold text-sm">Items</h2>
        {lines.map((l: any) => (
          <div key={l.id} className="flex gap-3 border-b pb-3">
            <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
              {l.image?.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.image.url} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 text-sm">
              <div className="font-medium line-clamp-2">{l.title}</div>
              {l.variantTitle && <div className="text-xs text-gray-500">{l.variantTitle}</div>}
              <div className="text-xs text-gray-600">Qty: {l.quantity}</div>
            </div>
            <div className="text-sm">{fmt(l.totalPrice)}</div>
          </div>
        ))}
      </section>

      <section className="space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{fmt(order.subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>{fmt(order.totalShipping)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Tax</span><span>{fmt(order.totalTax)}</span></div>
        <div className="flex justify-between font-bold text-base border-t pt-1 mt-1">
          <span>Total</span><span>{fmt(order.totalPrice)}</span>
        </div>
      </section>

      {order.shippingAddress && (
        <section className="text-sm">
          <h2 className="font-semibold mb-1">Ship to</h2>
          <div className="text-gray-700">
            {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
            {order.shippingAddress.address1}<br />
            {order.shippingAddress.address2 && <>{order.shippingAddress.address2}<br /></>}
            {order.shippingAddress.city}, {order.shippingAddress.territoryCode} {order.shippingAddress.zip}
          </div>
        </section>
      )}

      {order.fulfillments?.nodes?.length > 0 && (
        <section className="text-sm">
          <h2 className="font-semibold mb-1">Tracking</h2>
          {order.fulfillments.nodes.map((f: any) => (
            <div key={f.id} className="text-gray-700 text-xs">
              {f.status} · {f.latestShipmentStatus}
              {f.trackingInformation?.[0]?.url && (
                <a href={f.trackingInformation[0].url} target="_blank" rel="noopener" className="underline ml-2">
                  Track {f.trackingInformation[0].number}
                </a>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="space-y-2 pt-4 border-t">
        <button onClick={buyAgain} disabled={busy} className="w-full bg-black text-white py-2 rounded text-sm">
          {busy ? '…' : 'Buy again'}
        </button>
        {canCancel && (
          <button onClick={cancel} disabled={busy} className="w-full border border-red-300 text-red-600 py-2 rounded text-sm">
            Cancel order
          </button>
        )}
        {order.statusPageUrl && (
          <a href={order.statusPageUrl} target="_blank" rel="noopener" className="block w-full border py-2 rounded text-sm text-center">
            View on Shopify
          </a>
        )}
      </div>
    </div>
  );
}
