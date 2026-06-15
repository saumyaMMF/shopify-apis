'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { StorefrontAPI, type ProductCard, apiErrorMessage } from '@/lib/storefront';
import { ProductGridSkeleton, EmptyState, ErrorState, Price } from '@/components/ui';
import { SearchIcon, BagIcon } from '@/components/ui/icons';

type Status = 'loading' | 'ready' | 'error';

export default function ProductsList() {
  const [items, setItems] = useState<ProductCard[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string>();
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    setStatus('loading');
    setError(undefined);
    StorefrontAPI.products({ first: 24, q: q || undefined })
      .then((r) => {
        setItems(r.edges.map((e: any) => e.node));
        setStatus('ready');
      })
      .catch((e) => {
        setError(apiErrorMessage(e));
        setStatus('error');
      });
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-4">
      <div className="relative mb-4">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none transition-colors focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
        />
      </div>

      {status === 'loading' ? (
        <ProductGridSkeleton count={6} />
      ) : status === 'error' ? (
        <ErrorState onRetry={load} message={error} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<BagIcon className="w-10 h-10" />}
          title="No products found"
          description={
            q
              ? `We couldn’t find anything matching “${q}”. Try a different search.`
              : 'There are no products to show right now. Check back soon.'
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((p) => (
            <Link key={p.id} href={`/shop/products/${p.handle}`} className="group block">
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                {p.featuredImage?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.featuredImage.url}
                    alt={p.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="mt-2">
                <div className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                  {p.title}
                </div>
                <Price value={p.priceRange.minVariantPrice} className="mt-0.5 text-sm text-gray-700" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
