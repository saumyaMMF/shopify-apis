'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart, Users,
  ClipboardList, FileText, Image as ImageIcon, BarChart3, Settings, ScrollText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';

const NAV = [
  { href: '/dashboard',   label: 'Dashboard',         icon: LayoutDashboard, perm: null },
  { href: '/catalog/products', label: 'Products',     icon: Package,         perm: 'product.read' },
  { href: '/catalog/collections', label: 'Collections', icon: Package,       perm: 'product.read' },
  { href: '/inventory',   label: 'Inventory',         icon: Warehouse,       perm: 'inventory.read' },
  { href: '/orders',      label: 'Orders',            icon: ShoppingCart,    perm: 'order.read' },
  { href: '/customers',   label: 'Customers',         icon: Users,           perm: 'customer.read' },
  { href: '/purchasing',  label: 'Purchase Orders',   icon: ClipboardList,   perm: 'po.read' },
  { href: '/cms',         label: 'CMS',               icon: FileText,        perm: 'cms.read' },
  { href: '/media',       label: 'Media',             icon: ImageIcon,       perm: 'media.upload' },
  { href: '/reports',     label: 'Reports',           icon: BarChart3,       perm: 'reports.view' },
  { href: '/settings',    label: 'Settings',          icon: Settings,        perm: 'settings.update' },
  { href: '/audit-logs',  label: 'Audit Logs',        icon: ScrollText,      perm: 'audit.view' },
];

export function Sidebar() {
  const pathname = usePathname();
  const has = useAuthStore((s) => s.has);

  return (
    <aside className="w-60 bg-card border-r flex flex-col">
      <div className="h-14 flex items-center px-6 border-b">
        <span className="font-bold text-lg">Shopify Ops</span>
      </div>
      <nav className="flex-1 overflow-auto p-3 space-y-1">
        {NAV.filter((n) => !n.perm || has(n.perm)).map((n) => {
          const Icon = n.icon;
          const active = pathname?.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href as any}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground',
              )}>
              <Icon className="h-4 w-4" />
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
