'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function InventoryPage() {
  const { data } = useQuery({
    queryKey: ['inventory-levels'],
    queryFn: async () => (await api.get('/inventory/levels')).data,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Inventory</h1>
      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Item ID</th>
              <th className="text-left px-4 py-2 font-medium">Location</th>
              <th className="text-right px-4 py-2 font-medium">Available</th>
              <th className="text-right px-4 py-2 font-medium">Committed</th>
              <th className="text-right px-4 py-2 font-medium">Incoming</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((l: any) => (
              <tr key={l.id} className="border-t">
                <td className="px-4 py-2">{String(l.inventoryItemId)}</td>
                <td className="px-4 py-2">{l.location?.name}</td>
                <td className="px-4 py-2 text-right">{l.available}</td>
                <td className="px-4 py-2 text-right">{l.committed}</td>
                <td className="px-4 py-2 text-right">{l.incoming}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
