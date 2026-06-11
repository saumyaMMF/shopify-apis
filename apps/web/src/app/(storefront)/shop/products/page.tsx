'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StorefrontAPI, type ProductCard } from '@/lib/storefront';

export default function ProductsList() {
  const [items, setItems] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    setLoading(true);
    StorefrontAPI.products({ first: 24, q: q || undefined })
      .then((r) => setItems(r.edges.map((e: any) => e.node)))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="p-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products…"
        className="w-full px-3 py-2 border rounded mb-4 text-sm"
      />
      {loading ? <div>Loading…</div> : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((p) => (
            <Link key={p.id} href={`/shop/products/${p.handle}`} className="block">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {p.featuredImage?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.featuredImage.url} alt={p.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="mt-1.5">
                <div className="text-sm font-medium line-clamp-2">{p.title}</div>
                <div className="text-sm">
                  {p.priceRange.minVariantPrice.currencyCode === 'INR' ? '₹' : ''}
                  {Number(p.priceRange.minVariantPrice.amount).toFixed(2)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
