'use client';

import { useEffect, useState } from 'react';
import { StorefrontAPI, cartStore, type Cart } from '@/lib/storefront';
import Link from 'next/link';

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = cartStore.get();
    if (!id) return;
    StorefrontAPI.cartGet(id).then(setCart).catch(() => cartStore.clear());
  }, []);

  async function updateQty(lineId: string, quantity: number) {
    if (!cart) return;
    setBusy(true);
    try {
      const updated = await StorefrontAPI.cartLinesUpdate(cart.id, [{ id: lineId, quantity }]);
      setCart(updated);
      window.dispatchEvent(new CustomEvent('cart:update', { detail: updated }));
    } finally {
      setBusy(false);
    }
  }

  async function remove(lineId: string) {
    if (!cart) return;
    setBusy(true);
    try {
      const updated = await StorefrontAPI.cartLinesRemove(cart.id, [lineId]);
      setCart(updated);
      window.dispatchEvent(new CustomEvent('cart:update', { detail: updated }));
    } finally {
      setBusy(false);
    }
  }

  if (!cart) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm">Your cart is empty.</p>
        <Link href="/shop" className="inline-block mt-4 underline text-sm">Continue shopping</Link>
      </div>
    );
  }

  const lines = cart.lines.edges.map((e) => e.node);
  const fmt = (m: { amount: string; currencyCode: string }) =>
    (m.currencyCode === 'INR' ? '₹' : '') + Number(m.amount).toFixed(2);

  return (
    <div className="p-4 pb-32">
      <h1 className="text-xl font-bold mb-4">Cart ({cart.totalQuantity})</h1>

      <div className="space-y-4">
        {lines.map((l) => (
          <div key={l.id} className="flex gap-3 border-b pb-4">
            <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
              {l.merchandise.image?.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.merchandise.image.url} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium line-clamp-2">{l.merchandise.product.title}</div>
              <div className="text-xs text-gray-500">{l.merchandise.title}</div>
              <div className="text-sm mt-1">{fmt(l.cost.totalAmount)}</div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => updateQty(l.id, Math.max(0, l.quantity - 1))}
                  disabled={busy}
                  className="w-7 h-7 border rounded text-sm"
                >−</button>
                <span className="text-sm w-6 text-center">{l.quantity}</span>
                <button
                  onClick={() => updateQty(l.id, l.quantity + 1)}
                  disabled={busy}
                  className="w-7 h-7 border rounded text-sm"
                >+</button>
                <button onClick={() => remove(l.id)} disabled={busy} className="ml-auto text-xs text-red-600">Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky checkout */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-md mx-auto p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{fmt(cart.cost.subtotalAmount)}</span>
          </div>
          <a
            href={cart.checkoutUrl}
            className="block w-full bg-black text-white text-center py-3 rounded font-medium"
          >
            Checkout {fmt(cart.cost.totalAmount)}
          </a>
        </div>
      </div>
    </div>
  );
}
