'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-200 text-slate-800',
  PENDING_APPROVAL: 'bg-amber-200 text-amber-900',
  APPROVED: 'bg-blue-200 text-blue-900',
  PARTIALLY_RECEIVED: 'bg-indigo-200 text-indigo-900',
  RECEIVED: 'bg-emerald-200 text-emerald-900',
  CANCELLED: 'bg-rose-200 text-rose-900',
  CLOSED: 'bg-zinc-300 text-zinc-800',
};

export default function PurchasingPage() {
  const has = useAuthStore((s) => s.has);
  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => (await api.get('/purchase-orders')).data,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <div className="flex gap-2">
          <Link href="/purchasing/vendors" className="border rounded-md px-4 py-2 text-sm">Vendors</Link>
          {has('po.create') && (
            <Link href="/purchasing/new" className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium">
              New PO
            </Link>
          )}
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">PO #</th>
              <th className="text-left px-4 py-2 font-medium">Vendor</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-right px-4 py-2 font-medium">Total</th>
              <th className="text-left px-4 py-2 font-medium">Expected</th>
              <th className="text-left px-4 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {data?.map((po: any) => (
              <tr key={po.id} className="border-t hover:bg-muted/40">
                <td className="px-4 py-2">
                  <Link href={`/purchasing/${po.id}`} className="text-primary hover:underline font-medium">
                    {po.poNumber}
                  </Link>
                </td>
                <td className="px-4 py-2">{po.vendor?.name}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_COLORS[po.status]}`}>
                    {po.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">{po.currency} {Number(po.total).toFixed(2)}</td>
                <td className="px-4 py-2">{po.expectedAt ? new Date(po.expectedAt).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-2">{new Date(po.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
