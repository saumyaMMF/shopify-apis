'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ensureCart, type Cart } from '@/lib/storefront';
import { STORE_NAME } from '@/lib/format';
import { SearchIcon, UserIcon, CartIcon } from '@/components/ui/icons';
import { ErrorBoundary } from '@/components/error-boundary';

export function StorefrontShell({ children }: { children: React.ReactNode }) {
  const [qty, setQty] = useState(0);

  useEffect(() => {
    ensureCart().then((c: Cart) => setQty(c.totalQuantity)).catch(() => {});
    const onUpdate = (e: any) => setQty(e.detail?.totalQuantity ?? 0);
    window.addEventListener('cart:update', onUpdate as any);
    return () => window.removeEventListener('cart:update', onUpdate as any);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white text-black antialiased">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 h-14">
          <Link href="/shop" className="font-bold tracking-tight text-base">
            {STORE_NAME}
          </Link>
          <nav className="flex items-center gap-5 text-gray-700">
            <Link href="/shop/search" aria-label="Search" className="hover:text-black transition-colors">
              <SearchIcon />
            </Link>
            <Link href="/shop/account" aria-label="Account" className="hover:text-black transition-colors">
              <UserIcon />
            </Link>
            <Link href="/shop/cart" aria-label="Cart" className="relative hover:text-black transition-colors">
              <CartIcon />
              {qty > 0 && (
                <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-medium">
                  {qty}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      <footer className="border-t border-gray-100 mt-12">
        <div className="max-w-md mx-auto px-4 py-8 text-sm text-gray-500 space-y-4">
          <nav className="grid grid-cols-2 gap-y-2">
            <Link href="/shop" className="hover:text-black transition-colors">Home</Link>
            <Link href="/shop/products" className="hover:text-black transition-colors">Catalog</Link>
            <Link href="/shop/pages/our-story" className="hover:text-black transition-colors">Our Story</Link>
            <Link href="/shop/account" className="hover:text-black transition-colors">Account</Link>
            <Link href="/shop/cart" className="hover:text-black transition-colors">Cart</Link>
            <Link href="/shop/search" className="hover:text-black transition-colors">Search</Link>
          </nav>
          <div className="pt-4 border-t border-gray-100 text-xs">
            © {new Date().getFullYear()} {STORE_NAME}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
