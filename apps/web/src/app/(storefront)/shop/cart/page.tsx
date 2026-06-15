'use client';

import { useEffect, useState } from 'react';
import { StorefrontAPI, cartStore, type Cart, apiErrorMessage } from '@/lib/storefront';
import { money } from '@/lib/format';
import { Button, LinkButton, EmptyState, Skeleton, Spinner } from '@/components/ui';
import { CartIcon } from '@/components/ui/icons';

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = cartStore.get();
    if (!id) {
      setLoading(false);
      return;
    }
    StorefrontAPI.cartGet(id)
      .then(setCart)
      .catch(() => cartStore.clear())
      .finally(() => setLoading(false));
  }, []);

  async function mutate(fn: () => Promise<Cart>) {
    setBusy(true);
    setError(null);
    try {
      const updated = await fn();
      setCart(updated);
      window.dispatchEvent(new CustomEvent('cart:update', { detail: updated }));
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const lines = cart?.lines?.edges?.map((e) => e.node) ?? [];

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-20 h-20 rounded-lg" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-7 w-28" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!cart || cart.totalQuantity === 0 || lines.length === 0) {
    return (
      <EmptyState
        icon={<CartIcon className="w-10 h-10" />}
        title="Your cart is empty"
        description="Browse products and add something you love."
        action={
          <div className="flex flex-col items-center gap-3">
            <LinkButton href="/shop" size="lg" className="w-56">Continue shopping</LinkButton>
            <a href="/shop/account" className="text-sm text-gray-500 underline">View past orders</a>
          </div>
        }
      />
    );
  }

  return (
    <div className="p-4 pb-36">
      <h1 className="text-xl font-bold mb-4">Cart ({cart.totalQuantity})</h1>

      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="space-y-4">
        {lines.map((l) => (
          <div key={l.id} className="flex gap-3 border-b border-gray-100 pb-4">
            <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              {l.merchandise.image?.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.merchandise.image.url} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium line-clamp-2 leading-snug">{l.merchandise.product.title}</div>
              {l.merchandise.title !== 'Default Title' && (
                <div className="text-xs text-gray-500 mt-0.5">{l.merchandise.title}</div>
              )}
              <div className="text-sm mt-1 font-medium">{money(l.cost.totalAmount)}</div>
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  onClick={() => mutate(() => StorefrontAPI.cartLinesUpdate(cart.id, [{ id: l.id, quantity: Math.max(0, l.quantity - 1) }]))}
                  disabled={busy}
                  aria-label="Decrease quantity"
                  className="w-8 h-8 border border-gray-300 rounded-lg text-base leading-none disabled:opacity-40 hover:bg-gray-50"
                >−</button>
                <span className="text-sm w-7 text-center tabular-nums">{l.quantity}</span>
                <button
                  onClick={() => mutate(() => StorefrontAPI.cartLinesUpdate(cart.id, [{ id: l.id, quantity: l.quantity + 1 }]))}
                  disabled={busy}
                  aria-label="Increase quantity"
                  className="w-8 h-8 border border-gray-300 rounded-lg text-base leading-none disabled:opacity-40 hover:bg-gray-50"
                >+</button>
                <button
                  onClick={() => mutate(() => StorefrontAPI.cartLinesRemove(cart.id, [l.id]))}
                  disabled={busy}
                  className="ml-auto text-xs text-gray-500 hover:text-red-600 transition-colors"
                >Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky checkout */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-100">
        <div className="max-w-md mx-auto p-4 space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span className="font-medium text-black">{money(cart.cost.subtotalAmount)}</span>
          </div>
          <Button
            size="lg"
            disabled={busy}
            onClick={() => {
              const url = new URL(cart.checkoutUrl);
              url.searchParams.set('return_to', `${window.location.origin}/shop/thank-you`);
              window.location.href = url.toString();
            }}
          >
            {busy ? <Spinner className="w-5 h-5" /> : <>Checkout · {money(cart.cost.totalAmount)}</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
