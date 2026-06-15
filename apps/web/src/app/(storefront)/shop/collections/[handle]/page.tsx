'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StorefrontAPI, apiErrorMessage } from '@/lib/storefront';
import { Skeleton, ProductGridSkeleton, EmptyState, ErrorState, Price, LinkButton } from '@/components/ui';
import { BagIcon } from '@/components/ui/icons';

type Status = 'loading' | 'ready' | 'error';

export default function CollectionDetail() {
  const { handle } = useParams<{ handle: string }>();
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string>();

  const reload = useCallback(() => {
    setStatus('loading');
    setError(undefined);
    StorefrontAPI.collection(handle, { first: 24 })
      .then((res) => {
        setData(res);
        setStatus('ready');
      })
      .catch((err) => {
        setError(apiErrorMessage(err));
        setStatus('error');
      });
  }, [handle]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (status === 'loading') {
    return (
      <div>
        <div className="p-4">
          <Skeleton className="h-7 w-1/2 rounded-md" />
          <Skeleton className="h-4 w-3/4 mt-3 rounded-md" />
        </div>
        <div className="p-4 pt-0">
          <ProductGridSkeleton count={6} />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return <ErrorState onRetry={reload} message={error} />;
  }

  const products = data?.products?.edges?.map((e: any) => e.node) ?? [];

  return (
    <div>
      <div className="p-4">
        <h1 className="text-xl font-bold tracking-tight">{data?.title}</h1>
        {data?.descriptionHtml && (
          <div
            className="text-sm mt-2 text-gray-600 leading-relaxed [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: data.descriptionHtml }}
          />
        )}
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={<BagIcon className="w-10 h-10" />}
          title="No products yet"
          description="This collection doesn’t have any products right now. Check back soon."
          action={<LinkButton href="/shop" variant="outline">Continue shopping</LinkButton>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 p-4 pt-0 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p: any) => (
            <Link key={p.id} href={`/shop/products/${p.handle}`} className="group block">
              <div className="aspect-square overflow-hidden rounded-xl bg-gray-100">
                {p.featuredImage?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.featuredImage.url}
                    alt={p.title}
                    className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                  />
                )}
              </div>
              <div className="mt-2">
                <div className="text-sm font-medium line-clamp-2 group-hover:text-gray-600">{p.title}</div>
                <Price value={p.priceRange?.minVariantPrice} className="mt-0.5 text-sm text-gray-900" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
