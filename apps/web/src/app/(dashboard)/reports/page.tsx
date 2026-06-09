'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function ReportsPage() {
  const { data: vendors } = useQuery({
    queryKey: ['reports', 'vendors'],
    queryFn: async () => (await api.get('/reports/vendors')).data,
  });
  const { data: inventory } = useQuery({
    queryKey: ['reports', 'inventory'],
    queryFn: async () => (await api.get('/reports/inventory')).data,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="bg-card border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Vendor Spend</h2>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground"><tr>
            <th className="text-left py-1">Vendor</th>
            <th className="text-right py-1">POs</th>
            <th className="text-right py-1">Total Spend</th>
          </tr></thead>
          <tbody>
            {vendors?.map((v: any) => (
              <tr key={v.vendorId} className="border-t">
                <td className="py-1">{v.vendorId}</td>
                <td className="py-1 text-right">{v._count}</td>
                <td className="py-1 text-right">{Number(v._sum?.total ?? 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-card border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Inventory by Location</h2>
        <table className="w-full text-sm">
          <thead className="text-muted-foreground"><tr>
            <th className="text-left py-1">Location</th>
            <th className="text-right py-1">Available</th>
            <th className="text-right py-1">Committed</th>
            <th className="text-right py-1">Incoming</th>
          </tr></thead>
          <tbody>
            {inventory?.map((i: any) => (
              <tr key={i.locationId} className="border-t">
                <td className="py-1">{i.locationId}</td>
                <td className="py-1 text-right">{i._sum?.available ?? 0}</td>
                <td className="py-1 text-right">{i._sum?.committed ?? 0}</td>
                <td className="py-1 text-right">{i._sum?.incoming ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
