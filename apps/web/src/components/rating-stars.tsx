'use client';

export function RatingStars({
  rating,
  count,
  size = 'md',
}: {
  rating: number | null;
  count: number;
  size?: 'sm' | 'md';
}) {
  if (rating == null || count === 0) {
    return <span className="text-xs text-gray-400">No reviews</span>;
  }
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  const cls = size === 'sm' ? 'text-xs' : 'text-sm';
  return (
    <div className={`flex items-center gap-1 ${cls}`}>
      <span aria-label={`${rating} of 5`}>
        {'★'.repeat(full)}
        {half ? '⯨' : ''}
        {'☆'.repeat(empty)}
      </span>
      <span className="text-gray-600">{rating.toFixed(1)} ({count})</span>
    </div>
  );
}
