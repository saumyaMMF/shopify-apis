'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StorefrontAPI, apiErrorMessage } from '@/lib/storefront';
import { Skeleton, EmptyState, ErrorState, Price, Spinner, cx } from '@/components/ui';
import { SearchIcon } from '@/components/ui/icons';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q || q.length < 2) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      StorefrontAPI.predictiveSearch(q, 8)
        .then((r) => {
          setResults(r);
          setError(null);
        })
        .catch((e) => {
          setResults(null);
          setError(apiErrorMessage(e));
        })
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const trimmed = q.trim();
  const hasQuery = trimmed.length >= 2;
  const productCount = results?.products?.length ?? 0;
  const collectionCount = results?.collections?.length ?? 0;
  const hasResults = productCount > 0 || collectionCount > 0;

  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      {/* Search input */}
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products, collections…"
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition-colors focus:border-gray-400 focus:ring-2 focus:ring-black/10"
        />
        {loading && (
          <Spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        )}
      </div>

      <div className="mt-4">
        {/* Empty prompt state */}
        {!hasQuery && !loading && (
          <EmptyState
            icon={<SearchIcon className="h-10 w-10" />}
            title="Search products"
            description="Start typing to find products and collections in the store."
          />
        )}

        {/* Loading skeletons */}
        {hasQuery && loading && !results && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {hasQuery && error && (
          <ErrorState message={error} onRetry={() => setQ((v) => v + ' ')} />
        )}

        {/* No results */}
        {hasQuery && !loading && !error && results && !hasResults && (
          <EmptyState
            icon={<SearchIcon className="h-10 w-10" />}
            title={`No results for “${trimmed}”`}
            description="Try a different keyword or check your spelling."
          />
        )}

        {/* Results */}
        {hasQuery && !error && results && hasResults && (
          <div className="space-y-6">
            {productCount > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Products
                </h3>
                <ul className="divide-y divide-gray-100">
                  {results.products.map((p: any) => (
                    <li key={p.id}>
                      <Link
                        href={`/shop/products/${p.handle}`}
                        className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-gray-50"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {p.featuredImage?.url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.featuredImage.url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-medium text-gray-900">
                            {p.title}
                          </p>
                          {p.priceRange?.minVariantPrice && (
                            <Price
                              value={p.priceRange.minVariantPrice}
                              className="mt-0.5 text-xs text-gray-500"
                            />
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {collectionCount > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Collections
                </h3>
                <ul className="divide-y divide-gray-100">
                  {results.collections.map((c: any) => (
                    <li key={c.id}>
                      <Link
                        href={`/shop/collections/${c.handle}`}
                        className={cx(
                          '-mx-2 block rounded-lg px-2 py-2.5 text-sm font-medium text-gray-900',
                          'transition-colors hover:bg-gray-50',
                        )}
                      >
                        <span className="line-clamp-1">{c.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
