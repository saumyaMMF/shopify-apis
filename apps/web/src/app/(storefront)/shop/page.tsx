'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StorefrontAPI, type ProductCard } from '@/lib/storefront';

export default function ShopHome() {
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      StorefrontAPI.products({ first: 6 }),
      StorefrontAPI.collections({ first: 6 }),
      StorefrontAPI.banners('index').catch(() => ({ banners: [] })),
    ]).then(([p, c, b]) => {
      setProducts(p.edges.map((e: any) => e.node));
      setCollections(c.edges.map((e: any) => e.node));
      setBanners(b.banners ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-4">Loading…</div>;

  return (
    <div className="pb-8">
      {/* Banner carousel */}
      {banners.length > 0 && (
        <section className="overflow-x-auto flex snap-x snap-mandatory scrollbar-hide">
          {banners.filter((b) => !b.disabled).map((b, i) => (
            <div key={i} className="min-w-full snap-start aspect-[4/5] relative bg-gray-100">
              {b.image?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.image.url} alt={b.heading ?? ''} className="absolute inset-0 w-full h-full object-cover" />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                {b.heading && <h2 className="text-2xl font-bold drop-shadow">{b.heading}</h2>}
                {b.text && <p className="text-sm mt-1 drop-shadow">{b.text}</p>}
                {b.button?.label && (
                  <Link
                    href={b.button.link || '/shop/products'}
                    className="inline-block mt-3 bg-white text-black px-5 py-2 rounded text-sm font-medium"
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
              <Link key={c.id} href={`/shop/collections/${c.handle}`} className="block">
                <div className={`aspect-square rounded-lg overflow-hidden relative bg-gradient-to-br ${grad} flex items-center justify-center`}>
                  {c.image?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image.url} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-sm text-center px-2">{c.title}</span>
                  )}
                </div>
                <div className="mt-1 text-sm font-medium truncate">{c.title}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured products */}
      <section className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold">Featured</h2>
          <Link href="/shop/products" className="text-xs underline">See all</Link>
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
  return (
    <Link href={`/shop/products/${p.handle}`} className="block">
      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
        {p.featuredImage?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.featuredImage.url} alt={p.featuredImage.altText ?? p.title} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="mt-1.5 space-y-0.5">
        <div className="text-sm font-medium line-clamp-2">{p.title}</div>
        <div className="text-sm">
          {p.priceRange.minVariantPrice.currencyCode === 'INR' ? '₹' : ''}
          {Number(p.priceRange.minVariantPrice.amount).toFixed(2)}
        </div>
        {!p.availableForSale && <div className="text-xs text-red-600">Out of stock</div>}
      </div>
    </Link>
  );
}
