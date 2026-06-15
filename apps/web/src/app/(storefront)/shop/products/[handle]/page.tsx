'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StorefrontAPI, ensureCart, cartStore, customerStore, type Variant, apiErrorMessage } from '@/lib/storefront';
import { RatingStars } from '@/components/rating-stars';
import { Button, Price, Skeleton, ErrorState, Spinner, cx } from '@/components/ui';
import { StarIcon, CheckIcon } from '@/components/ui/icons';

type Review = {
  id: number; rating: number; title: string; body: string; name: string;
  verified: boolean; createdAt: string; pictures: string[]; reply: string | null;
};

export default function ProductDetail() {
  const { handle } = useParams<{ handle: string }>();
  const router = useRouter();
  const [p, setP] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [variant, setVariant] = useState<Variant | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<{ rating: number | null; count: number } | null>(null);
  const [reviewList, setReviewList] = useState<Review[]>([]);

  useEffect(() => {
    setStatus('loading');
    StorefrontAPI.product(handle)
      .then((data) => {
        setP(data);
        setVariant(data.variants?.edges?.[0]?.node ?? null);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
    StorefrontAPI.productReviews(handle).then(setReviews).catch(() => setReviews({ rating: null, count: 0 }));
    StorefrontAPI.productReviewList(handle).then((r) => setReviewList(r.reviews)).catch(() => setReviewList([]));
  }, [handle]);

  if (status === 'error') return <ErrorState onRetry={() => router.refresh()} message="This product could not be loaded." />;

  if (status === 'loading' || !p) {
    return (
      <div>
        <Skeleton className="w-full aspect-square rounded-none" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-12 w-full mt-2" />
        </div>
      </div>
    );
  }

  const variants: Variant[] = p.variants.edges.map((e: any) => e.node);
  const price = variant?.price ?? p.variants.edges[0]?.node?.price;

  async function addToCart() {
    if (!variant) return;
    setBusy(true);
    setError(null);
    try {
      let id = cartStore.get();
      if (!id) {
        const cart = await StorefrontAPI.cartCreate([{ merchandiseId: variant.id, quantity: 1 }]);
        cartStore.set(cart.id);
        try {
          const returnUrl = `${window.location.origin}/shop/thank-you`;
          await fetch(`/api/backend/storefront/cart/attributes?id=${encodeURIComponent(cart.id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attributes: [{ key: 'return_url', value: returnUrl }] }),
          });
        } catch {}
        window.dispatchEvent(new CustomEvent('cart:update', { detail: cart }));
      } else {
        const cart = await StorefrontAPI.cartLinesAdd(id, [{ merchandiseId: variant.id, quantity: 1 }]);
        window.dispatchEvent(new CustomEvent('cart:update', { detail: cart }));
      }
      router.push('/shop/cart');
    } catch (e) {
      setError(apiErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="pb-8">
      {p.featuredImage?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.featuredImage.url} alt={p.title} className="w-full aspect-square object-cover" />
      )}
      <div className="p-4 space-y-3">
        {p.vendor && <div className="text-xs uppercase tracking-wide text-gray-400 font-medium">{p.vendor}</div>}
        <h1 className="text-2xl font-bold leading-tight">{p.title}</h1>
        {reviews && reviews.count > 0 && <RatingStars rating={reviews.rating} count={reviews.count} />}
        <Price value={price} compareAt={variant?.compareAtPrice} className="text-xl font-semibold" />

        {variants.length > 1 && (
          <div className="pt-1">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
              {p.options?.[0]?.name ?? 'Variant'}
            </div>
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariant(v)}
                  disabled={!v.availableForSale}
                  className={cx(
                    'px-4 py-2 text-sm border rounded-lg transition-colors',
                    variant?.id === v.id ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-gray-500',
                    !v.availableForSale && 'opacity-40 line-through',
                  )}
                >
                  {v.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
        )}

        <Button size="lg" onClick={addToCart} disabled={busy || !variant?.availableForSale} className="mt-1">
          {!variant?.availableForSale ? 'Sold out' : busy ? <Spinner className="w-5 h-5" /> : 'Add to cart'}
        </Button>

        {p.descriptionHtml && (
          <div
            className="text-sm pt-4 border-t border-gray-100 text-gray-700 leading-relaxed [&_p]:mb-2"
            dangerouslySetInnerHTML={{ __html: p.descriptionHtml }}
          />
        )}

        <section className="pt-5 border-t border-gray-100 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-base">
              Reviews{reviewList.length > 0 ? ` (${reviews?.count ?? reviewList.length})` : ''}
            </h2>
          </div>

          <ReviewForm
            handle={handle}
            onSubmitted={() =>
              StorefrontAPI.productReviewList(handle).then((r) => setReviewList(r.reviews)).catch(() => {})
            }
          />

          {reviewList.length === 0 && (
            <p className="text-sm text-gray-500">No reviews yet. Be the first to review this product.</p>
          )}

          {reviewList.map((r) => (
            <ReviewItem key={r.id} r={r} />
          ))}
        </section>
      </div>
    </div>
  );
}

// Display-only. Judge.me's API is create/read-only — no edit or delete is
// exposed, so reviews can only be changed in the Judge.me dashboard.
function ReviewItem({ r }: { r: Review }) {
  return (
    <article className="space-y-1.5">
      <div className="flex items-center gap-0.5 text-amber-500" aria-label={`${r.rating} of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <StarIcon key={i} className="w-3.5 h-3.5" filled={i < Math.round(r.rating)} />
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm font-medium">
        {r.name}
        {r.verified && (
          <span className="inline-flex items-center gap-0.5 text-[10px] uppercase text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
            <CheckIcon className="w-3 h-3" /> Verified
          </span>
        )}
      </div>
      {r.title && <div className="text-sm font-medium">{r.title}</div>}
      <p className="text-sm text-gray-600 leading-relaxed">{r.body}</p>
      {r.pictures.length > 0 && (
        <div className="flex gap-2 pt-1">
          {r.pictures.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-lg" />
          ))}
        </div>
      )}
      {r.reply && (
        <div className="text-xs bg-gray-50 border border-gray-100 rounded-lg p-2.5 mt-1">
          <span className="font-medium">Store reply:</span> {r.reply}
        </div>
      )}
    </article>
  );
}

function ReviewForm({ handle, onSubmitted }: { handle: string; onSubmitted: () => void }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  // If signed in, prefill + lock the email to the account email.
  useEffect(() => {
    if (!customerStore.get()) return;
    StorefrontAPI.customerProfile()
      .then((me: any) => {
        const e = me?.emailAddress?.emailAddress;
        const fn = [me?.firstName, me?.lastName].filter(Boolean).join(' ');
        if (e) {
          setEmail(e);
          setLoggedIn(true);
        }
        if (fn) setName(fn);
      })
      .catch(() => {});
  }, []);

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/30';

  async function submit() {
    setError(null);
    if (!rating) return setError('Please pick a star rating.');
    if (!name.trim() || !email.trim() || !body.trim()) return setError('Name, email and review text are required.');
    setBusy(true);
    try {
      await StorefrontAPI.createReview(handle, { name, email, rating, body, title });
      setDone(true);
      onSubmitted();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
        <CheckIcon className="w-4 h-4" /> Thanks! Your review was submitted.
      </div>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>Write a review</Button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 p-4">
      <div className="text-sm font-medium">Write a review</div>

      <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {Array.from({ length: 5 }).map((_, i) => {
          const v = i + 1;
          return (
            <button
              key={v}
              type="button"
              aria-label={`${v} star${v > 1 ? 's' : ''}`}
              onMouseEnter={() => setHover(v)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(v)}
              className="text-amber-500"
            >
              <StarIcon className="w-6 h-6" filled={(hover || rating) >= v} />
            </button>
          );
        })}
      </div>

      <input className={inputCls} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
      <input
        className={cx(inputCls, loggedIn && 'bg-gray-50 text-gray-500')}
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        readOnly={loggedIn}
      />
      {loggedIn && <p className="text-xs text-gray-500 -mt-1">Posting as {email}</p>}
      <input className={inputCls} placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className={cx(inputCls, 'min-h-24 resize-y')} placeholder="Share your experience…" value={body} onChange={(e) => setBody(e.target.value)} />

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

      <div className="flex gap-2">
        <Button onClick={submit} disabled={busy}>
          {busy ? <Spinner className="w-5 h-5" /> : 'Submit review'}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
      </div>
    </div>
  );
}
