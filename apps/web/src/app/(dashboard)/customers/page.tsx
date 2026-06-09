'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function CustomersPage() {
  const { data } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get('/customers')).data,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Customers</h1>
      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Email</th>
              <th className="text-right px-4 py-2 font-medium">Orders</th>
              <th className="text-right px-4 py-2 font-medium">Spent</th>
              <th className="text-left px-4 py-2 font-medium">Tags</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((c: any) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-2">{[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}</td>
                <td className="px-4 py-2">{c.email}</td>
                <td className="px-4 py-2 text-right">{c.ordersCount}</td>
                <td className="px-4 py-2 text-right">{Number(c.totalSpent).toFixed(2)}</td>
                <td className="px-4 py-2">{c.tags?.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
