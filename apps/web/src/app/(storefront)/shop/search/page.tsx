'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StorefrontAPI } from '@/lib/storefront';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    if (!q || q.length < 2) { setResults(null); return; }
    const t = setTimeout(() => {
      StorefrontAPI.predictiveSearch(q, 8).then(setResults);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="p-4">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products, collections…"
        className="w-full px-3 py-2 border rounded text-sm"
      />
      {results && (
        <div className="mt-4 space-y-4">
          {results.products?.length > 0 && (
            <section>
              <h3 className="text-xs uppercase text-gray-500 mb-2">Products</h3>
              {results.products.map((p: any) => (
                <Link key={p.id} href={`/shop/products/${p.handle}`} className="flex gap-3 items-center py-2 border-b">
                  <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                    {p.featuredImage?.url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.featuredImage.url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 text-sm">{p.title}</div>
                </Link>
              ))}
            </section>
          )}
          {results.collections?.length > 0 && (
            <section>
              <h3 className="text-xs uppercase text-gray-500 mb-2">Collections</h3>
              {results.collections.map((c: any) => (
                <Link key={c.id} href={`/shop/collections/${c.handle}`} className="block py-2 text-sm border-b">
                  {c.title}
                </Link>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
