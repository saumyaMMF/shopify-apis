'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { StorefrontAPI, type ProductCard } from '@/lib/storefront';
import { stripHtml } from '@/lib/format';
import { RatingStars } from '@/components/rating-stars';
import { ProductGridSkeleton, ErrorState, Price, Skeleton } from '@/components/ui';
import { ChevronRight } from '@/components/ui/icons';

export default function ShopHome() {
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = useCallback(() => {
    setStatus('loading');
    Promise.all([
      StorefrontAPI.products({ first: 6 }),
      StorefrontAPI.collections({ first: 6 }),
      StorefrontAPI.banners('index').catch(() => ({ banners: [] })),
    ])
      .then(([p, c, b]) => {
        setProducts(p.edges.map((e: any) => e.node));
        setCollections(c.edges.map((e: any) => e.node));
        setBanners(b.banners ?? []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (status === 'error') return <ErrorState onRetry={load} />;

  if (status === 'loading') {
    return (
      <div className="pb-8">
        <Skeleton className="aspect-[4/5] w-full rounded-none" />
        <div className="p-4">
          <Skeleton className="h-5 w-40 mb-3" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        </div>
        <ProductGridSkeleton count={4} />
      </div>
    );
  }

  const activeBanners = banners.filter((b) => !b.disabled);

  return (
    <div className="pb-8">
      {/* Banner carousel */}
      {activeBanners.length > 0 && (
        <section className="overflow-x-auto flex snap-x snap-mandatory scrollbar-hide">
          {activeBanners.map((b, i) => (
            <div key={i} className="min-w-full snap-start aspect-[4/5] relative bg-gray-100">
              {b.image?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.image.url} alt={b.heading ?? ''} className="absolute inset-0 w-full h-full object-cover" />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                {b.heading && <h2 className="text-2xl font-bold drop-shadow-sm leading-tight">{stripHtml(b.heading)}</h2>}
                {b.text && <p className="text-sm mt-1.5 text-white/90 drop-shadow-sm">{stripHtml(b.text)}</p>}
                {b.button?.label && (
                  <Link
                    href={b.button.link || '/shop/products'}
                    className="inline-flex items-center gap-1 mt-4 bg-white text-black px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    {b.button.label}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Collections */}
      {collections.length > 0 && (
        <section className="p-4">
          <h2 className="text-lg font-bold mb-3">Shop by Collection</h2>
          <div className="grid grid-cols-2 gap-3">
            {collections.map((c, i) => {
              const grads = [
                'from-purple-400 to-pink-500',
                'from-cyan-400 to-blue-500',
                'from-amber-400 to-orange-500',
                'from-emerald-400 to-teal-500',
                'from-rose-400 to-red-500',
                'from-indigo-400 to-violet-500',
              ];
              const grad = grads[i % grads.length];
              return (
                <Link key={c.id} href={`/shop/collections/${c.handle}`} className="group block">
                  <div className={`aspect-square rounded-xl overflow-hidden relative bg-gradient-to-br ${grad} flex items-center justify-center`}>
                    {c.image?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image.url} alt={c.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <span className="text-white font-bold text-sm text-center px-2">{c.title}</span>
                    )}
                  </div>
                  <div className="mt-1.5 text-sm font-medium truncate">{c.title}</div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured products */}
      <section className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold">Featured</h2>
          <Link href="/shop/products" className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-600 hover:text-black transition-colors">
            See all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {products.map((p) => (
            <ProductTile key={p.id} p={p} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ProductTile({ p }: { p: ProductCard }) {
  const [reviews, setReviews] = useState<{ rating: number | null; count: number } | null>(null);
  useEffect(() => {
    StorefrontAPI.productReviews(p.handle).then(setReviews).catch(() => {});
  }, [p.handle]);
  return (
    <Link href={`/shop/products/${p.handle}`} className="group block">
      <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
        {p.featuredImage?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.featuredImage.url}
            alt={p.featuredImage.altText ?? p.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        )}
      </div>
      <div className="mt-2 space-y-1">
        <div className="text-sm font-medium line-clamp-2 leading-snug">{p.title}</div>
        <Price value={p.priceRange.minVariantPrice} className="text-sm" />
        {reviews && reviews.count > 0 && <RatingStars rating={reviews.rating} count={reviews.count} size="sm" />}
        {!p.availableForSale && <div className="text-xs font-medium text-red-600">Out of stock</div>}
      </div>
    </Link>
  );
}
