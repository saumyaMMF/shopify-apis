'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function OrdersPage() {
  const { data } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => (await api.get('/orders')).data,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders</h1>
      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Order</th>
              <th className="text-left px-4 py-2 font-medium">Customer</th>
              <th className="text-left px-4 py-2 font-medium">Financial</th>
              <th className="text-left px-4 py-2 font-medium">Fulfillment</th>
              <th className="text-right px-4 py-2 font-medium">Total</th>
              <th className="text-left px-4 py-2 font-medium">Placed</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((o: any) => (
              <tr key={o.id} className="border-t hover:bg-muted/40">
                <td className="px-4 py-2">
                  <Link href={`/orders/${o.id}`} className="text-primary hover:underline">{o.name}</Link>
                </td>
                <td className="px-4 py-2">{o.email ?? '—'}</td>
                <td className="px-4 py-2">{o.financialStatus}</td>
                <td className="px-4 py-2">{o.fulfillmentStatus ?? 'unfulfilled'}</td>
                <td className="px-4 py-2 text-right">{o.currency} {Number(o.totalPrice).toFixed(2)}</td>
                <td className="px-4 py-2">{new Date(o.shopifyCreatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
