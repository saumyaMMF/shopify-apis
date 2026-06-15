'use client';

// Shared storefront UI primitives — buttons, skeletons, states, price.
// Keeps every page visually consistent and removes repeated markup.

import Link from 'next/link';
import { type ReactNode } from 'react';
import { money, type MoneyLike } from '@/lib/format';
import { AlertIcon, BagIcon } from './icons';

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

// ---------- Button ----------
type ButtonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
};

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40';
const buttonVariants = {
  primary: 'bg-black text-white hover:bg-gray-800 active:bg-gray-900',
  secondary: 'bg-gray-100 text-black hover:bg-gray-200',
  outline: 'border border-gray-300 text-black hover:bg-gray-50',
};
const buttonSizes = { md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base w-full' };

export function Button({ children, variant = 'primary', size = 'md', className, ...rest }: ButtonProps) {
  return (
    <button className={cx(buttonBase, buttonVariants[variant], buttonSizes[size], className)} {...rest}>
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className,
}: { href: string } & Omit<ButtonProps, 'onClick' | 'type' | 'disabled'>) {
  return (
    <Link href={href} className={cx(buttonBase, buttonVariants[variant], buttonSizes[size], className)}>
      {children}
    </Link>
  );
}

// ---------- Skeleton ----------
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-md bg-gray-200/80', className)} />;
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3.5 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cx('animate-spin', className ?? 'w-5 h-5')} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ---------- States ----------
export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16 gap-3">
      <div className="text-gray-300">{icon ?? <BagIcon className="w-10 h-10" />}</div>
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="text-sm text-gray-500 max-w-xs">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16 gap-3">
      <div className="text-red-400"><AlertIcon className="w-10 h-10" /></div>
      <h2 className="text-base font-semibold">Something went wrong</h2>
      <p className="text-sm text-gray-500 max-w-xs">{message ?? 'We couldn’t load this content. Please try again.'}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-2">
          Retry
        </Button>
      )}
    </div>
  );
}

// ---------- Price ----------
export function Price({
  value,
  compareAt,
  className,
}: {
  value?: MoneyLike | null;
  compareAt?: MoneyLike | null;
  className?: string;
}) {
  const onSale = compareAt && Number(compareAt.amount) > Number(value?.amount ?? 0);
  return (
    <span className={cx('inline-flex items-baseline gap-2', className)}>
      <span className={onSale ? 'text-red-600 font-semibold' : ''}>{money(value)}</span>
      {onSale && <span className="text-gray-400 line-through text-[0.85em]">{money(compareAt)}</span>}
    </span>
  );
}

export { cx };
