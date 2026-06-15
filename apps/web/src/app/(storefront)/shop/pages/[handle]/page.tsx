'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { StorefrontAPI } from '@/lib/storefront';
import { LinkButton, Skeleton, ErrorState, cx } from '@/components/ui';

type PageData = Awaited<ReturnType<typeof StorefrontAPI.page>>;

export default function CustomPage() {
  const { handle } = useParams<{ handle: string }>();
  const [data, setData] = useState<PageData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    StorefrontAPI.page(handle)
      .then((d) => (d ? setData(d) : setNotFound(true)))
      .catch(() => setNotFound(true));
  }, [handle]);

  if (notFound) return <ErrorState message="We couldn’t find the page you’re looking for." />;

  if (!data) {
    return (
      <div className="p-4 space-y-5">
        <Skeleton className="w-full aspect-video rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    );
  }

  const cf = data.customFields ?? {};
  const subtitle = cf['custom.hero_subtitle'] as string | undefined;
  const ctaLabel = cf['custom.cta_label'] as string | undefined;
  const established = cf['custom.established_year'] as number | undefined;
  const showBanner = cf['custom.show_banner'] as boolean | undefined;
  const heroImage = cf['custom.hero_image'] as string | undefined;
  const gallery = (cf['custom.gallery'] as string[] | undefined) ?? [];

  const KNOWN = ['custom.hero_subtitle', 'custom.cta_label', 'custom.established_year', 'custom.show_banner', 'custom.hero_image', 'custom.gallery'];

  const extraFields = Object.entries(cf).filter(([k]) => !KNOWN.includes(k));

  return (
    <div className="p-4 space-y-6">
      {showBanner && (
        <div className="rounded-xl bg-black text-white px-4 py-3 text-sm font-medium shadow-sm">
          {subtitle ?? data.title}
        </div>
      )}

      {heroImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroImage}
          alt={data.title}
          className="w-full aspect-video object-cover rounded-xl shadow-sm ring-1 ring-black/5"
        />
      )}

      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{data.title}</h1>
        {subtitle && <p className="text-lg leading-relaxed text-gray-600">{subtitle}</p>}
        {established && (
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
            Established {established}
          </p>
        )}
      </header>

      {data.body && (
        <div
          className="prose prose-sm sm:prose max-w-none prose-headings:tracking-tight prose-a:text-black"
          dangerouslySetInnerHTML={{ __html: data.body }}
        />
      )}

      {gallery.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {gallery.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`Gallery ${i + 1}`}
              className="aspect-square w-full object-cover rounded-xl ring-1 ring-black/5"
            />
          ))}
        </div>
      )}

      {ctaLabel && (
        <div className="pt-1">
          <LinkButton href="/shop/products" size="lg">
            {ctaLabel}
          </LinkButton>
        </div>
      )}

      {/* Any other custom fields, rendered generically */}
      {extraFields.length > 0 && (
        <dl className={cx('grid grid-cols-2 gap-x-6 gap-y-3 border-t border-gray-100 pt-5 text-sm')}>
          {extraFields.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-gray-500">{k}</dt>
              <dd className="font-medium text-gray-900 break-words">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
