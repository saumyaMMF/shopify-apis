'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ensureCart, type Cart } from '@/lib/storefront';

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [qty, setQty] = useState(0);

  useEffect(() => {
    ensureCart().then((c: Cart) => setQty(c.totalQuantity)).catch(() => {});
    const onUpdate = (e: any) => setQty(e.detail?.totalQuantity ?? 0);
    window.addEventListener('cart:update', onUpdate as any);
    return () => window.removeEventListener('cart:update', onUpdate as any);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white text-black">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 bg-white border-b">
        <div className="max-w-md mx-auto flex items-center justify-between px-4 h-14">
          <Link href="/shop" className="font-bold tracking-tight">test store</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/shop/search" aria-label="Search">🔍</Link>
            <Link href="/shop/account" aria-label="Account">👤</Link>
            <Link href="/shop/cart" aria-label="Cart" className="relative">
              🛒
              {qty > 0 && (
                <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {qty}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full">{children}</main>

      <footer className="border-t mt-12">
        <div className="max-w-md mx-auto px-4 py-6 text-xs text-gray-500 space-y-2">
          <div className="flex gap-3 flex-wrap">
            <Link href="/shop">Home</Link>
            <Link href="/shop/products">Catalog</Link>
            <Link href="/shop/account">Account</Link>
            <Link href="/shop/cart">Cart</Link>
          </div>
          <div>© 2026 test store</div>
        </div>
      </footer>
    </div>
  );
}
