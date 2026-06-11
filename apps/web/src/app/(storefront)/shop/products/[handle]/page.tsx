'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StorefrontAPI, ensureCart, cartStore, type Variant } from '@/lib/storefront';

export default function ProductDetail() {
  const { handle } = useParams<{ handle: string }>();
  const router = useRouter();
  const [p, setP] = useState<any>(null);
  const [variant, setVariant] = useState<Variant | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    StorefrontAPI.product(handle).then((data) => {
      setP(data);
      const firstVariant = data.variants?.edges?.[0]?.node;
      setVariant(firstVariant ?? null);
    });
  }, [handle]);

  if (!p) return <div className="p-4">Loading…</div>;

  const variants: Variant[] = p.variants.edges.map((e: any) => e.node);
  const price = variant?.price ?? p.variants.edges[0]?.node?.price;

  async function addToCart() {
    if (!variant) return;
    setBusy(true);
    try {
      let id = cartStore.get();
      if (!id) {
        const cart = await StorefrontAPI.cartCreate([{ merchandiseId: variant.id, quantity: 1 }]);
        cartStore.set(cart.id);
        window.dispatchEvent(new CustomEvent('cart:update', { detail: cart }));
      } else {
        const cart = await StorefrontAPI.cartLinesAdd(id, [{ merchandiseId: variant.id, quantity: 1 }]);
        window.dispatchEvent(new CustomEvent('cart:update', { detail: cart }));
      }
      router.push('/shop/cart');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {p.featuredImage?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.featuredImage.url} alt={p.title} className="w-full aspect-square object-cover" />
      )}
      <div className="p-4 space-y-3">
        {p.vendor && <div className="text-xs uppercase tracking-wide text-gray-500">{p.vendor}</div>}
        <h1 className="text-xl font-bold">{p.title}</h1>
        <div className="text-lg">
          {price?.currencyCode === 'INR' ? '₹' : ''}
          {price && Number(price.amount).toFixed(2)}
        </div>

        {variants.length > 1 && (
          <div>
            <div className="text-xs uppercase mb-1">Variant</div>
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariant(v)}
                  className={`px-3 py-1.5 text-sm border rounded ${variant?.id === v.id ? 'bg-black text-white' : ''} ${!v.availableForSale ? 'opacity-40' : ''}`}
                  disabled={!v.availableForSale}
                >
                  {v.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={addToCart}
          disabled={busy || !variant?.availableForSale}
          className="w-full bg-black text-white py-3 rounded font-medium disabled:opacity-50"
        >
          {!variant?.availableForSale ? 'Sold out' : busy ? 'Adding…' : 'Add to cart'}
        </button>

        {p.descriptionHtml && (
          <div className="text-sm pt-4 border-t" dangerouslySetInnerHTML={{ __html: p.descriptionHtml }} />
        )}
      </div>
    </div>
  );
}
