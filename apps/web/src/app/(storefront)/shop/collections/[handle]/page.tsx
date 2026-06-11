'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StorefrontAPI } from '@/lib/storefront';

export default function CollectionDetail() {
  const { handle } = useParams<{ handle: string }>();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    StorefrontAPI.collection(handle, { first: 24 }).then(setData);
  }, [handle]);

  if (!data) return <div className="p-4">Loading…</div>;
  const products = data.products?.edges?.map((e: any) => e.node) ?? [];

  return (
    <div>
      <div className="p-4">
        <h1 className="text-xl font-bold">{data.title}</h1>
        {data.descriptionHtml && (
          <div className="text-sm mt-2 text-gray-600" dangerouslySetInnerHTML={{ __html: data.descriptionHtml }} />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 pt-0">
        {products.map((p: any) => (
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
    </div>
  );
}
