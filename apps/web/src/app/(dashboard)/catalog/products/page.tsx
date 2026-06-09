'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

export default function ProductsPage() {
  const has = useAuthStore((s) => s.has);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['products', q, status, page],
    queryFn: async () =>
      (await api.get('/products', { params: { q, status, skip: page * 25, take: 25 } })).data,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        {has('product.create') && (
          <Link href="/catalog/products/new"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium">
            New product
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        <input className="border rounded-md px-3 py-2 text-sm flex-1"
          placeholder="Search by title or handle" value={q}
          onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <select className="border rounded-md px-3 py-2 text-sm"
          value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Title</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">Vendor</th>
              <th className="text-left px-4 py-2 font-medium">Variants</th>
              <th className="text-left px-4 py-2 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {data?.items?.map((p: any) => (
              <tr key={p.id} className="border-t hover:bg-muted/40">
                <td className="px-4 py-2">
                  <Link href={`/catalog/products/${p.id}`} className="text-primary hover:underline">{p.title}</Link>
                </td>
                <td className="px-4 py-2">{p.status}</td>
                <td className="px-4 py-2">{p.vendor ?? '—'}</td>
                <td className="px-4 py-2">{p.variants?.length ?? 0}</td>
                <td className="px-4 py-2">{new Date(p.shopifyUpdatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{data?.total ?? 0} total</span>
        <div className="flex gap-2">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
            className="border rounded-md px-3 py-1 disabled:opacity-50">Prev</button>
          <button onClick={() => setPage((p) => p + 1)}
            className="border rounded-md px-3 py-1">Next</button>
        </div>
      </div>
    </div>
  );
}
