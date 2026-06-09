'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Package, ShoppingCart, Users, Warehouse } from 'lucide-react';

function StatCard({ icon: Icon, label, value, hint }: any) {
  return (
    <div className="bg-card border rounded-lg p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-2xl font-bold">{value ?? '—'}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { data: products } = useQuery({
    queryKey: ['stats', 'products'],
    queryFn: async () => (await api.get('/products', { params: { take: 1 } })).data,
  });
  const { data: orders } = useQuery({
    queryKey: ['stats', 'orders'],
    queryFn: async () => (await api.get('/orders', { params: { take: 1 } })).data,
  });
  const { data: customers } = useQuery({
    queryKey: ['stats', 'customers'],
    queryFn: async () => (await api.get('/customers', { params: { take: 1 } })).data,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package}      label="Products"   value={products?.total} />
        <StatCard icon={ShoppingCart} label="Orders"     value={orders?.length ?? orders?.total} />
        <StatCard icon={Users}        label="Customers"  value={customers?.length ?? customers?.total} />
        <StatCard icon={Warehouse}    label="Locations"  value="—" />
      </div>
      <div className="bg-card border rounded-lg p-6">
        <h2 className="font-semibold mb-2">Quick Actions</h2>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• Create a Purchase Order</li>
          <li>• Bulk import products via CSV</li>
          <li>• Publish CMS hero banner</li>
          <li>• Review pending fulfillments</li>
        </ul>
      </div>
    </div>
  );
}
